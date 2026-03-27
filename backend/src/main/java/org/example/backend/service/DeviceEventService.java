package org.example.backend.service;

import org.example.backend.dto.DeviceEventCreateRequest;
import org.example.backend.dto.DeviceEventResponse;
import org.example.backend.entity.Device;
import org.example.backend.entity.DeviceEvent;
import org.example.backend.entity.DeviceStatus;
import org.example.backend.entity.User;
import org.example.backend.exception.AccessDeniedException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.repository.DeviceEventRepository;
import org.example.backend.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DeviceEventService {

    private final DeviceEventRepository eventRepository;
    private final DeviceRepository deviceRepository;

    public DeviceEventService(DeviceEventRepository eventRepository,
                               DeviceRepository deviceRepository) {
        this.eventRepository = eventRepository;
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public DeviceEventResponse createEvent(UUID deviceId, DeviceEventCreateRequest request, User user) {
        Device device = findOwned(deviceId, user);

        DeviceEvent event = new DeviceEvent();
        event.setDevice(device);
        event.setType(request.getType());
        event.setPayload(request.getPayload());
        eventRepository.save(event);

        // Always update from server side — never trust client
        device.setLastSeen(LocalDateTime.now());
        device.setStatus(DeviceStatus.ONLINE);
        deviceRepository.save(device);

        return toResponse(event);
    }

    @Transactional(readOnly = true)
    public List<DeviceEventResponse> getEvents(UUID deviceId, User user) {
        Device device = findOwned(deviceId, user);
        return eventRepository.findAllByDeviceOrderByTimestampDesc(device)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Device findOwned(UUID deviceId, User user) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        if (!device.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("Access denied");
        }
        return device;
    }

    private DeviceEventResponse toResponse(DeviceEvent e) {
        return new DeviceEventResponse(e.getId(), e.getType(), e.getPayload(), e.getTimestamp());
    }
}
