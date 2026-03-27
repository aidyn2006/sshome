package org.example.backend.dto;

import jakarta.validation.constraints.NotNull;
import org.example.backend.entity.DeviceCommandType;

public class DeviceCommandCreateRequest {

    @NotNull
    private DeviceCommandType command;

    private String payload;

    public DeviceCommandType getCommand() { return command; }
    public void setCommand(DeviceCommandType command) { this.command = command; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
}
