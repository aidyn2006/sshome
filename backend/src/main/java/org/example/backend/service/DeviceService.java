package org.example.backend.service;

import org.example.backend.dto.DeviceCreateRequest;
import org.example.backend.dto.DeviceResponse;
import org.example.backend.entity.Device;
import org.example.backend.entity.DeviceStatus;
import org.example.backend.entity.User;
import org.example.backend.exception.AccessDeniedException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;

    public DeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public DeviceResponse createDevice(DeviceCreateRequest request, User owner) {
        Device device = new Device();
        device.setName(request.getName());
        device.setType(request.getType());
        device.setMetadata(request.getMetadata());
        device.setOwner(owner);
        device.setDeviceToken(UUID.randomUUID().toString());
        device.setStatus(DeviceStatus.OFFLINE);
        return toResponse(deviceRepository.save(device));
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> getUserDevices(User owner) {
        return deviceRepository.findAllByOwner(owner)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeviceResponse getDevice(UUID id, User owner) {
        return toResponse(findOwned(id, owner));
    }

    @Transactional
    public void deleteDevice(UUID id, User owner) {
        deviceRepository.delete(findOwned(id, owner));
    }

    private Device findOwned(UUID id, User owner) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        if (!device.getOwner().getId().equals(owner.getId())) {
            throw new AccessDeniedException("Access denied");
        }
        return device;
    }

    private DeviceResponse toResponse(Device device) {
        return new DeviceResponse(
                device.getId(),
                device.getName(),
                device.getType(),
                device.getStatus(),
                device.getMetadata(),
                device.getLastSeen(),
                device.getCreatedAt()
        );
    }
}
