package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.DeviceCommandCreateRequest;
import org.example.backend.dto.DeviceCommandResponse;
import org.example.backend.entity.User;
import org.example.backend.service.DeviceCommandService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/devices/{deviceId}/commands")
public class DeviceCommandController {

    private final DeviceCommandService commandService;

    public DeviceCommandController(DeviceCommandService commandService) {
        this.commandService = commandService;
    }

    /** Authenticated user creates a command for their device */
    @PostMapping
    public ResponseEntity<DeviceCommandResponse> create(
            @PathVariable UUID deviceId,
            @Valid @RequestBody DeviceCommandCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commandService.createCommand(deviceId, request, user));
    }

    /** Authenticated user lists all commands for their device */
    @GetMapping
    public ResponseEntity<List<DeviceCommandResponse>> list(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(commandService.getCommands(deviceId, user));
    }

    /** IoT device fetches pending commands using X-Device-Token header */
    @GetMapping("/pending")
    public ResponseEntity<List<DeviceCommandResponse>> pending(
            @PathVariable UUID deviceId,
            @RequestHeader("X-Device-Token") String deviceToken) {
        return ResponseEntity.ok(commandService.getPendingCommands(deviceId, deviceToken));
    }

    /** IoT device marks a command as executed using X-Device-Token header */
    @PostMapping("/{commandId}/executed")
    public ResponseEntity<DeviceCommandResponse> markExecuted(
            @PathVariable UUID deviceId,
            @PathVariable UUID commandId,
            @RequestHeader("X-Device-Token") String deviceToken) {
        return ResponseEntity.ok(commandService.markExecuted(deviceId, commandId, deviceToken));
    }
}
