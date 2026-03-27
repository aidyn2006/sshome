package org.example.backend.dto;

import jakarta.validation.constraints.NotNull;
import org.example.backend.entity.DeviceEventType;

public class DeviceEventCreateRequest {

    @NotNull
    private DeviceEventType type;

    private String payload;

    public DeviceEventType getType() { return type; }
    public void setType(DeviceEventType type) { this.type = type; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
}
