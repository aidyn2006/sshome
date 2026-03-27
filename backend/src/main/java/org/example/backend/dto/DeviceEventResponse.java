package org.example.backend.dto;

import org.example.backend.entity.DeviceEventType;

import java.time.LocalDateTime;
import java.util.UUID;

public class DeviceEventResponse {

    private final UUID id;
    private final DeviceEventType type;
    private final String payload;
    private final LocalDateTime timestamp;

    public DeviceEventResponse(UUID id, DeviceEventType type, String payload, LocalDateTime timestamp) {
        this.id = id;
        this.type = type;
        this.payload = payload;
        this.timestamp = timestamp;
    }

    public UUID getId() { return id; }
    public DeviceEventType getType() { return type; }
    public String getPayload() { return payload; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
