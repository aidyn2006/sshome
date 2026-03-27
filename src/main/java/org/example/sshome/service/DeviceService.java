package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.*;
import org.example.sshome.exception.ResourceNotFoundException;
import org.example.sshome.repository.DeviceRepository;
import org.example.sshome.repository.SensorReadingRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DeviceService {

    private final DeviceRepository       deviceRepository;
    private final SensorReadingRepository readingRepository;
    private final AuditService           auditService;
    private final EncryptionService      encryptionService;

    // --- CRUD ------------------------------------------------------------

    public Page<Device> findAll(Device.DeviceStatus status, Device.DeviceType type,
                                String search, Pageable pageable) {
        return deviceRepository.findFiltered(status, type, search, pageable);
    }

    public Device findById(UUID id) {
        return deviceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Device", id));
    }

    public Device findByDeviceId(String deviceId) {
        return deviceRepository.findByDeviceId(deviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));
    }

    @Transactional
    @CacheEvict(value = {"device-summary", "kpi"}, allEntries = true)
    public Device create(Device device, User actor, String ip) {
        if (deviceRepository.existsByDeviceId(device.getDeviceId())) {
            throw new IllegalArgumentException("Device ID already exists: " + device.getDeviceId());
        }

        // Optionally encrypt sensitive data
        if (device.isDataEncrypted()) {
            String aesKey = encryptionService.generateAesKeyBase64();
            // In production: encrypt aesKey with RSA master key
            device.setEncryptedKeyB64(encryptionService.encryptField(aesKey));
        }

        device.setCreatedBy(actor);
        Device saved = deviceRepository.save(device);

        auditService.log(AuditLog.Action.CREATE, "DEVICE", saved.getId().toString(),
            actor, ip, Map.of("name", saved.getName(), "type", saved.getType().name()));

        log.info("Device created: {} by {}", saved.getDeviceId(), actor.getEmail());
        return saved;
    }

    @Transactional
    @CacheEvict(value = {"device-summary", "kpi"}, allEntries = true)
    public Device update(UUID id, Device patch, User actor, String ip) {
        Device existing = findById(id);

        if (patch.getName()     != null) existing.setName(patch.getName());
        if (patch.getType()     != null) existing.setType(patch.getType());
        if (patch.getStatus()   != null) existing.setStatus(patch.getStatus());
        if (patch.getLocation() != null) existing.setLocation(patch.getLocation());
        if (patch.getFirmware() != null) existing.setFirmware(patch.getFirmware());
        if (patch.getDescription() != null) existing.setDescription(patch.getDescription());

        Device saved = deviceRepository.save(existing);

        auditService.log(AuditLog.Action.UPDATE, "DEVICE", id.toString(),
            actor, ip, Map.of("changes", "name/status/location"));

        return saved;
    }

    @Transactional
    @CacheEvict(value = {"device-summary", "kpi"}, allEntries = true)
    public void delete(UUID id, User actor, String ip) {
        Device device = findById(id);
        deviceRepository.delete(device);

        auditService.log(AuditLog.Action.DELETE, "DEVICE", id.toString(),
            actor, ip, Map.of("deviceId", device.getDeviceId(), "name", device.getName()));

        log.info("Device deleted: {} by {}", device.getDeviceId(), actor.getEmail());
    }

    // --- Status ----------------------------------------------------------

    @Transactional
    @CacheEvict(value = {"device-summary", "kpi"}, allEntries = true)
    public Device updateStatus(String deviceId, Device.DeviceStatus newStatus) {
        Device device = findByDeviceId(deviceId);
        device.setStatus(newStatus);
        device.setLastSeenAt(Instant.now());
        return deviceRepository.save(device);
    }

    @Transactional
    public void heartbeat(String deviceId) {
        deviceRepository.findByDeviceId(deviceId).ifPresent(d -> {
            d.setLastSeenAt(Instant.now());
            if (d.getStatus() == Device.DeviceStatus.OFFLINE) {
                d.setStatus(Device.DeviceStatus.ONLINE);
            }
            deviceRepository.save(d);
        });
    }

    // --- Sensor readings -------------------------------------------------

    @Transactional
    public SensorReading ingestReading(String deviceId, String channel, double value, String unit) {
        Device device = findByDeviceId(deviceId);
        device.setLastSeenAt(Instant.now());
        if (device.getStatus() == Device.DeviceStatus.OFFLINE) {
            device.setStatus(Device.DeviceStatus.ONLINE);
        }
        deviceRepository.save(device);

        SensorReading reading = SensorReading.of(device, channel, value, unit);
        return readingRepository.save(reading);
    }

    public List<SensorReading> getReadings(UUID deviceId, String channel,
                                            Instant from, Instant to) {
        return readingRepository.findByDeviceAndTimeRange(deviceId, channel, from, to);
    }

    public List<SensorReading> getLatestReadings(UUID deviceId, String channel, int limit) {
        return readingRepository.findLatestByDeviceAndChannel(
            deviceId, channel, Pageable.ofSize(limit));
    }

    // --- Summary ---------------------------------------------------------

    @Cacheable("device-summary")
    public Map<String, Object> getSummary() {
        long total       = deviceRepository.count();
        long online      = deviceRepository.countOnline();
        long offline     = deviceRepository.countOffline();
        long maintenance = deviceRepository.countMaintenance();
        List<String> top = deviceRepository.findTopOnlineDeviceNames(Pageable.ofSize(5));

        return Map.of(
            "total",       total,
            "online",      online,
            "offline",     offline,
            "maintenance", maintenance,
            "topNames",    top
        );
    }

    // --- Stale device detection -------------------------------------------

    /** Marks devices offline if not seen in the last N minutes (called by scheduler) */
    @Transactional
    public int markStaleDevicesOffline(int timeoutMinutes) {
        Instant cutoff = Instant.now().minus(timeoutMinutes, ChronoUnit.MINUTES);
        List<Device> stale = deviceRepository.findAllOnline().stream()
            .filter(d -> d.getLastSeenAt() == null || d.getLastSeenAt().isBefore(cutoff))
            .toList();

        stale.forEach(d -> {
            d.setStatus(Device.DeviceStatus.OFFLINE);
            log.warn("Device marked offline (stale): {}", d.getDeviceId());
        });

        deviceRepository.saveAll(stale);
        return stale.size();
    }
}
