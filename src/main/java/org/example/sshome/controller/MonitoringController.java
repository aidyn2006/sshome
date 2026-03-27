package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.sshome.service.MonitoringService;
import org.example.sshome.websocket.SensorDataPublisher;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Tag(name = "Monitoring", description = "Real-time sensor monitoring via SSE and WebSocket")
public class MonitoringController {

    private final MonitoringService monitoringService;
    private final SensorDataPublisher publisher;

    // ─── SSE Stream ────────────────────────────────────────────────────────

    /**
     * Server-Sent Events stream for all sensor readings.
     *
     * <p>Flutter connects as:
     * <pre>GET /monitoring/stream  (Authorization: Bearer {token})</pre>
     *
     * <p>Events emitted:
     * - <code>reading</code>  — new sensor reading
     * - <code>alert</code>    — new alert triggered
     * - <code>status</code>   — device status change
     */
    @GetMapping(value = "/monitoring/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Subscribe to all monitoring events via SSE")
    public SseEmitter streamAll(
        @RequestParam(defaultValue = "300000") long timeout   // 5 min default
    ) {
        return publisher.subscribeDevice(null, timeout);
    }

    /**
     * SSE stream filtered to a specific device.
     * GET /monitoring/stream/{deviceId}
     */
    @GetMapping(value = "/monitoring/stream/{deviceId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Subscribe to monitoring events for a specific device via SSE")
    public SseEmitter streamDevice(
        @PathVariable String deviceId,
        @RequestParam(defaultValue = "300000") long timeout
    ) {
        return publisher.subscribeDevice(deviceId, timeout);
    }

    // ─── REST ingestion (for devices without STOMP) ────────────────────────

    /**
     * POST /monitoring/ingest
     * Devices can push sensor readings via REST if STOMP is not available.
     */
    @PostMapping("/monitoring/ingest")
    @ResponseBody
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Ingest sensor reading via REST (for devices without WebSocket)")
    public ResponseEntity<Map<String, Object>> ingest(
        @Valid @RequestBody IngestRequest req
    ) {
        monitoringService.ingest(req.deviceId(), req.channel(), req.value(), req.unit());
        return ResponseEntity.accepted().body(Map.of(
            "status",  "accepted",
            "channel", req.channel(),
            "value",   req.value()
        ));
    }

    // ─── WebSocket STOMP Handler ───────────────────────────────────────────

    /**
     * Device clients can send readings via STOMP.
     *
     * <p>Client sends to: <code>/app/sensor/ingest</code>
     * <p>Payload: {"deviceId":"dev-001","channel":"temperature","value":23.4,"unit":"°C"}
     */
    @MessageMapping("/sensor/ingest")
    public void ingestViaWebSocket(@Payload IngestRequest req) {
        monitoringService.ingest(req.deviceId(), req.channel(), req.value(), req.unit());
    }

    // ─── Device heartbeat ─────────────────────────────────────────────────

    @PostMapping("/monitoring/heartbeat/{deviceId}")
    @ResponseBody
    @Operation(summary = "Device heartbeat — keeps device status as ONLINE")
    public ResponseEntity<Void> heartbeat(@PathVariable String deviceId) {
        // Delegate to service which updates lastSeenAt
        monitoringService.ingest(deviceId, "_heartbeat", 1.0, null);
        return ResponseEntity.accepted().build();
    }

    // ─── Request record ───────────────────────────────────────────────────
    record IngestRequest(
        @jakarta.validation.constraints.NotBlank String deviceId,
        @jakarta.validation.constraints.NotBlank String channel,
        double value,
        String unit
    ) {}
}
