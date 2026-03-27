package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.sshome.entity.Alert;
import org.example.sshome.entity.User;
import org.example.sshome.service.AlertService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Alert management")
@SecurityRequirement(name = "bearerAuth")
public class AlertController {

    private final AlertService alertService;

    // --- /api/alerts --------------------------------------------------
    @GetMapping
    @Operation(summary = "List alerts with optional status/severity/device filter")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) Alert.Status   status,
        @RequestParam(required = false) Alert.Severity severity,
        @RequestParam(required = false) UUID           deviceId,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<Alert> result = alertService.findAll(
            status, severity, deviceId, PageRequest.of(page, Math.min(size, 100)));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content",       result.getContent().stream().map(this::toDto).toList());
        body.put("totalElements", result.getTotalElements());
        body.put("page",          result.getNumber());
        body.put("size",          result.getSize());
        return ResponseEntity.ok(body);
    }

    // --- GET /api/alerts/{id} ---------------------------------------------
    @GetMapping("/{id}")
    @Operation(summary = "Get alert by ID")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(toDto(alertService.findById(id)));
    }

    // --- POST /api/alerts/{id}/acknowledge -------------------------------
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Acknowledge an active alert")
    public ResponseEntity<Map<String, Object>> acknowledge(
        @PathVariable UUID id,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        return ResponseEntity.ok(toDto(alertService.acknowledge(id, actor, http.getRemoteAddr())));
    }

    // --- POST /api/alerts/{id}/resolve ------------------------------------
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Resolve an alert")
    public ResponseEntity<Map<String, Object>> resolve(
        @PathVariable UUID id,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        return ResponseEntity.ok(toDto(alertService.resolve(id, actor, http.getRemoteAddr())));
    }

    // --- POST /api/alerts/acknowledge-all --------------------------------
    @PostMapping("/acknowledge-all")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Acknowledge all active alerts")
    public ResponseEntity<Map<String, Object>> acknowledgeAll(
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        int count = alertService.acknowledgeAll(actor, http.getRemoteAddr());
        return ResponseEntity.ok(Map.of("acknowledged", count));
    }

    // --- GET /api/alerts/stats --------------------------------------------
    @GetMapping("/stats")
    @Operation(summary = "Get alert count statistics by severity and status")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(alertService.getStats());
    }

    // --- Mapper ----------------------------------------------------------
    private Map<String, Object> toDto(Alert a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",         a.getId());
        m.put("severity",   a.getSeverity());
        m.put("status",     a.getStatus());
        m.put("message",    a.getMessage());
        m.put("sensorValue",a.getSensorValue());
        m.put("createdAt",  a.getCreatedAt());
        m.put("acknowledgedAt", a.getAcknowledgedAt());
        m.put("resolvedAt",     a.getResolvedAt());
        if (a.getDevice() != null) {
            m.put("device", Map.of(
                "id",       a.getDevice().getId(),
                "deviceId", a.getDevice().getDeviceId(),
                "name",     a.getDevice().getName()
            ));
        }
        if (a.getAcknowledgedBy() != null) {
            m.put("acknowledgedBy", a.getAcknowledgedBy().getEmail());
        }
        if (a.getDeviceSnapshot() != null) {
            m.put("deviceSnapshot", a.getDeviceSnapshot());
        }
        return m;
    }
}
