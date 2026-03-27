package org.example.backend.dto;

import org.example.backend.entity.DeviceCommandStatus;
import org.example.backend.entity.DeviceCommandType;

import java.time.LocalDateTime;
import java.util.UUID;

public class DeviceCommandResponse {

    private final UUID id;
    private final DeviceCommandType command;
    private final String payload;
    private final DeviceCommandStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime executedAt;

    public DeviceCommandResponse(UUID id, DeviceCommandType command, String payload,
                                  DeviceCommandStatus status, LocalDateTime createdAt,
                                  LocalDateTime executedAt) {
        this.id = id;
        this.command = command;
        this.payload = payload;
        this.status = status;
        this.createdAt = createdAt;
        this.executedAt = executedAt;
    }

    public UUID getId() { return id; }
    public DeviceCommandType getCommand() { return command; }
    public String getPayload() { return payload; }
    public DeviceCommandStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExecutedAt() { return executedAt; }
}
