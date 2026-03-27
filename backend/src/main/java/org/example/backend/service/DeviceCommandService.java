package org.example.backend.service;

import org.example.backend.dto.DeviceCommandCreateRequest;
import org.example.backend.dto.DeviceCommandResponse;
import org.example.backend.entity.Device;
import org.example.backend.entity.DeviceCommand;
import org.example.backend.entity.DeviceCommandStatus;
import org.example.backend.entity.User;
import org.example.backend.exception.AccessDeniedException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.repository.DeviceCommandRepository;
import org.example.backend.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DeviceCommandService {

    private final DeviceCommandRepository commandRepository;
    private final DeviceRepository deviceRepository;

    public DeviceCommandService(DeviceCommandRepository commandRepository,
                                 DeviceRepository deviceRepository) {
        this.commandRepository = commandRepository;
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public DeviceCommandResponse createCommand(UUID deviceId,
                                                DeviceCommandCreateRequest request,
                                                User user) {
        Device device = findOwned(deviceId, user);

        DeviceCommand cmd = new DeviceCommand();
        cmd.setDevice(device);
        cmd.setCommand(request.getCommand());
        cmd.setPayload(request.getPayload());
        cmd.setStatus(DeviceCommandStatus.PENDING);

        return toResponse(commandRepository.save(cmd));
    }

    @Transactional(readOnly = true)
    public List<DeviceCommandResponse> getCommands(UUID deviceId, User user) {
        Device device = findOwned(deviceId, user);
        return commandRepository.findAllByDevice(device)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<DeviceCommandResponse> getPendingCommands(UUID deviceId, String deviceToken) {
        Device device = findByToken(deviceId, deviceToken);
        List<DeviceCommand> pending = commandRepository.findAllByDeviceAndStatus(
                device, DeviceCommandStatus.PENDING);

        // Mark as SENT
        pending.forEach(cmd -> cmd.setStatus(DeviceCommandStatus.SENT));
        commandRepository.saveAll(pending);

        return pending.stream().map(this::toResponse).toList();
    }

    @Transactional
    public DeviceCommandResponse markExecuted(UUID deviceId, UUID commandId, String deviceToken) {
        findByToken(deviceId, deviceToken);

        DeviceCommand cmd = commandRepository.findById(commandId)
                .orElseThrow(() -> new ResourceNotFoundException("Command not found"));

        if (!cmd.getDevice().getId().equals(deviceId)) {
            throw new AccessDeniedException("Command does not belong to this device");
        }

        cmd.setStatus(DeviceCommandStatus.EXECUTED);
        cmd.setExecutedAt(LocalDateTime.now());
        return toResponse(commandRepository.save(cmd));
    }

    private Device findOwned(UUID deviceId, User user) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        if (!device.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("Access denied");
        }
        return device;
    }

    private Device findByToken(UUID deviceId, String deviceToken) {
        Device device = deviceRepository.findByDeviceToken(deviceToken)
                .orElseThrow(() -> new AccessDeniedException("Invalid device token"));
        if (!device.getId().equals(deviceId)) {
            throw new AccessDeniedException("Token does not match device");
        }
        return device;
    }

    private DeviceCommandResponse toResponse(DeviceCommand cmd) {
        return new DeviceCommandResponse(
                cmd.getId(),
                cmd.getCommand(),
                cmd.getPayload(),
                cmd.getStatus(),
                cmd.getCreatedAt(),
                cmd.getExecutedAt()
        );
    }
}
