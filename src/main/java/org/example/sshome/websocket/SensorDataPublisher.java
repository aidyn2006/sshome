package org.example.sshome.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.Alert;
import org.example.sshome.entity.SensorReading;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Dual-mode real-time publisher:
 * - WebSocket (STOMP) for rich bidirectional clients
 * - SSE (Server-Sent Events) for browser EventSource / Flutter HTTP clients
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SensorDataPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    // --- SSE Emitter Registry ---------------------------------------------
    /** key = deviceId or "ALL" for global subscribers */
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>>
        sseEmitters = new ConcurrentHashMap<>();

    // --- SSE Registration -------------------------------------------------

    public SseEmitter subscribeDevice(String deviceId, long timeoutMs) {
        SseEmitter emitter = new SseEmitter(timeoutMs);
        String key = deviceId != null ? deviceId : "ALL";

        sseEmitters.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable cleanup = () -> {
            CopyOnWriteArrayList<SseEmitter> list = sseEmitters.get(key);
            if (list != null) list.remove(emitter);
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // Send initial connection event
        sendSse(emitter, "connected",
            Map.of("message", "SSE connected", "deviceId", key, "serverTime", Instant.now()));

        return emitter;
    }

    // --- Publishing -------------------------------------------------------

    /**
     * Publishes a new sensor reading via both WebSocket (STOMP) and SSE.
     */
    public void publishReading(SensorReading reading) {
        Map<String, Object> payload = Map.of(
            "type",      "READING",
            "deviceId",  reading.getDevice().getDeviceId(),
            "channel",   reading.getChannel(),
            "value",     reading.getValue(),
            "unit",      reading.getUnit() != null ? reading.getUnit() : "",
            "readAt",    reading.getReadAt().toString()
        );

        // WebSocket broadcast to topic
        String topic = "/topic/monitoring/" + reading.getDevice().getDeviceId();
        messagingTemplate.convertAndSend(topic, payload);
        messagingTemplate.convertAndSend("/topic/monitoring/all", payload);

        // SSE broadcast
        broadcast(reading.getDevice().getDeviceId(), "reading", payload);
        broadcast("ALL", "reading", payload);
    }

    /**
     * Publishes a triggered alert via both WebSocket and SSE.
     */
    public void publishAlert(Alert alert) {
        Map<String, Object> payload = Map.of(
            "type",      "ALERT",
            "id",        alert.getId().toString(),
            "severity",  alert.getSeverity().name(),
            "message",   alert.getMessage(),
            "deviceId",  alert.getDevice() != null ? alert.getDevice().getDeviceId() : "",
            "createdAt", alert.getCreatedAt().toString()
        );

        messagingTemplate.convertAndSend("/topic/alerts", payload);
        broadcast("ALL", "alert", payload);

        log.warn("Alert published via WS+SSE: [{}] {}", alert.getSeverity(), alert.getMessage());
    }

    /**
     * Publishes a device status change event.
     */
    public void publishStatusChange(String deviceId, String newStatus) {
        Map<String, Object> payload = Map.of(
            "type",     "STATUS_CHANGE",
            "deviceId", deviceId,
            "status",   newStatus,
            "time",     Instant.now().toString()
        );

        messagingTemplate.convertAndSend("/topic/devices/status", payload);
        broadcast("ALL", "status", payload);
    }

    // --- Internal SSE broadcast -------------------------------------------

    private void broadcast(String key, String eventType, Map<String, Object> data) {
        CopyOnWriteArrayList<SseEmitter> list = sseEmitters.get(key);
        if (list == null || list.isEmpty()) return;

        List<SseEmitter> dead = new java.util.ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                sendSse(emitter, eventType, data);
            } catch (Exception e) {
                dead.add(emitter);
            }
        }
        list.removeAll(dead);
    }

    private void sendSse(SseEmitter emitter, String eventType, Object data) {
        try {
            emitter.send(SseEmitter.event()
                .name(eventType)
                .data(data));
        } catch (IOException e) {
            throw new RuntimeException("SSE send failed", e);
        }
    }
}
