package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.sshome.entity.Device;
import org.example.sshome.entity.SensorReading;
import org.example.sshome.entity.User;
import org.example.sshome.service.DeviceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Tag(name = "Devices", description = "Device management")
@SecurityRequirement(name = "bearerAuth")
@Validated
public class DeviceController {

    private final DeviceService deviceService;

    // --- GET /api/devices -------------------------------------------------
    @GetMapping
    @Operation(summary = "List all devices with optional filters")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) Device.DeviceStatus status,
        @RequestParam(required = false) Device.DeviceType   type,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Device> result = deviceService.findAll(status, type, search, pageable);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content",       result.getContent().stream().map(this::toSummary).toList());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages",    result.getTotalPages());
        body.put("page",          result.getNumber());
        body.put("size",          result.getSize());
        return ResponseEntity.ok(body);
    }

    // --- GET /api/devices/{id} --------------------------------------------
    @GetMapping("/{id}")
    @Operation(summary = "Get device details by ID")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable UUID id) {
        Device device = deviceService.findById(id);
        return ResponseEntity.ok(toDetail(device));
    }

    // --- POST /api/devices ------------------------------------------------
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Create a new device")
    public ResponseEntity<Map<String, Object>> create(
        @Valid @RequestBody DeviceRequest req,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        Device device = Device.builder()
            .deviceId(req.deviceId() != null ? req.deviceId() : "dev-" + UUID.randomUUID().toString().substring(0, 8))
            .name(req.name())
            .type(req.type())
            .location(req.location())
            .firmware(req.firmware())
            .description(req.description())
            .dataEncrypted(Boolean.TRUE.equals(req.encrypted()))
            .build();

        Device created = deviceService.create(device, actor, http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDetail(created));
    }

    // --- PUT /api/devices/{id} --------------------------------------------
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Update device metadata")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable UUID id,
        @RequestBody DeviceRequest req,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        Device patch = Device.builder()
            .name(req.name())
            .type(req.type())
            .location(req.location())
            .firmware(req.firmware())
            .description(req.description())
            .build();

        Device updated = deviceService.update(id, patch, actor, http.getRemoteAddr());
        return ResponseEntity.ok(toDetail(updated));
    }

    // --- DELETE /api/devices/{id} -----------------------------------------
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "Delete a device and all its data")
    public void delete(
        @PathVariable UUID id,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        deviceService.delete(id, actor, http.getRemoteAddr());
    }

    // --- POST /api/devices/{deviceId}/readings ----------------------------
    @PostMapping("/{deviceId}/readings")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Ingest a sensor reading for a device")
    public ResponseEntity<Map<String, Object>> ingestReading(
        @PathVariable String deviceId,
        @Valid @RequestBody ReadingRequest req
    ) {
        SensorReading reading = deviceService.ingestReading(
            deviceId, req.channel(), req.value(), req.unit());
        return ResponseEntity.accepted().body(Map.of(
            "id",      reading.getId(),
            "channel", reading.getChannel(),
            "value",   reading.getValue(),
            "readAt",  reading.getReadAt()
        ));
    }

    // --- GET /api/devices/{id}/readings ----------------------------------
    @GetMapping("/{id}/readings")
    @Operation(summary = "Get historical sensor readings")
    public ResponseEntity<List<Map<String, Object>>> getReadings(
        @PathVariable UUID id,
        @RequestParam(required = false) String channel,
        @RequestParam(defaultValue = "24") int hours
    ) {
        Instant from = Instant.now().minus(hours, ChronoUnit.HOURS);
        Instant to   = Instant.now();
        List<SensorReading> readings = deviceService.getReadings(id, channel, from, to);
        List<Map<String, Object>> result = readings.stream().map(r -> Map.<String, Object>of(
            "id",      r.getId(),
            "channel", r.getChannel(),
            "value",   r.getValue(),
            "unit",    r.getUnit() != null ? r.getUnit() : "",
            "readAt",  r.getReadAt()
        )).toList();
        return ResponseEntity.ok(result);
    }

    // --- GET /api/devices/summary -----------------------------------------
    @GetMapping("/summary")
    @Operation(summary = "Get device count summary")
    public ResponseEntity<Map<String, Object>> summary() {
        return ResponseEntity.ok(deviceService.getSummary());
    }

    // --- Mappers ---------------------------------------------------------
    private Map<String, Object> toSummary(Device d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",         d.getId());
        m.put("deviceId",   d.getDeviceId());
        m.put("name",       d.getName());
        m.put("type",       d.getType());
        m.put("status",     d.getStatus());
        m.put("location",   d.getLocation());
        m.put("firmware",   d.getFirmware());
        m.put("lastSeenAt", d.getLastSeenAt());
        m.put("createdAt",  d.getCreatedAt());
        return m;
    }

    private Map<String, Object> toDetail(Device d) {
        Map<String, Object> m = new LinkedHashMap<>(toSummary(d));
        m.put("description",   d.getDescription());
        m.put("dataEncrypted", d.isDataEncrypted());
        if (d.getEdgeNode() != null) m.put("edgeNodeId", d.getEdgeNode().getId());
        if (d.getCreatedBy() != null) m.put("createdBy", d.getCreatedBy().getEmail());
        return m;
    }

    // --- Request records --------------------------------------------------
    record DeviceRequest(
        String deviceId,
        @jakarta.validation.constraints.NotBlank String name,
        Device.DeviceType type,
        String location,
        String firmware,
        String description,
        Boolean encrypted
    ) {}

    record ReadingRequest(
        @jakarta.validation.constraints.NotBlank String channel,
        double value,
        String unit
    ) {}
}
