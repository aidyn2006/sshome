package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.DeviceEventCreateRequest;
import org.example.backend.dto.DeviceEventResponse;
import org.example.backend.entity.User;
import org.example.backend.service.DeviceEventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/devices/{deviceId}/events")
public class DeviceEventController {

    private final DeviceEventService eventService;

    public DeviceEventController(DeviceEventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<DeviceEventResponse> create(
            @PathVariable UUID deviceId,
            @Valid @RequestBody DeviceEventCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(deviceId, request, user));
    }

    @GetMapping
    public ResponseEntity<List<DeviceEventResponse>> list(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(eventService.getEvents(deviceId, user));
    }
}
