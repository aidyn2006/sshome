package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.DeviceCreateRequest;
import org.example.backend.dto.DeviceResponse;
import org.example.backend.entity.User;
import org.example.backend.service.DeviceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @PostMapping
    public ResponseEntity<DeviceResponse> create(
            @Valid @RequestBody DeviceCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.createDevice(request, user));
    }

    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(deviceService.getUserDevices(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceResponse> getOne(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(deviceService.getDevice(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        deviceService.deleteDevice(id, user);
        return ResponseEntity.noContent().build();
    }
}
