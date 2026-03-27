package org.example.backend.dto;

import org.example.backend.entity.DeviceStatus;
import org.example.backend.entity.DeviceType;

import java.time.LocalDateTime;
import java.util.UUID;

public class DeviceResponse {

    private UUID id;
    private String name;
    private DeviceType type;
    private DeviceStatus status;
    private String metadata;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;

    public DeviceResponse(UUID id, String name, DeviceType type, DeviceStatus status,
                          String metadata, LocalDateTime lastSeen, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.status = status;
        this.metadata = metadata;
        this.lastSeen = lastSeen;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public DeviceType getType() { return type; }
    public DeviceStatus getStatus() { return status; }
    public String getMetadata() { return metadata; }
    public LocalDateTime getLastSeen() { return lastSeen; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
