package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.*;
import org.example.sshome.repository.AlertRepository;
import org.example.sshome.repository.AlertRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processes incoming sensor readings against alert rules.
 * Implements cooldown logic to prevent alert floods.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertRuleEngine {

    private final AlertRuleRepository ruleRepository;
    private final AlertRepository     alertRepository;

    /**
     * Evaluate a new sensor reading against all applicable rules.
     * Creates Alert entities for any triggered rules respecting cooldown.
     *
     * @param reading The new sensor reading to evaluate
     * @return List of newly created alerts
     */
    @Transactional
    public List<Alert> evaluate(SensorReading reading) {
        Device device = reading.getDevice();
        String channel = reading.getChannel();
        double value   = reading.getValue();

        List<AlertRule> rules = ruleRepository.findApplicableRules(channel, device.getType());

        return rules.stream()
            .filter(AlertRule::isEnabled)
            .filter(rule -> rule.evaluate(value))
            .filter(rule -> !isCoolingDown(device, rule))
            .map(rule -> createAlert(reading, rule))
            .toList();
    }

    // ─── Cooldown check ──────────────────────────────────────────────────
    private boolean isCoolingDown(Device device, AlertRule rule) {
        Instant cooldownSince = Instant.now().minus(rule.getCooldownMinutes(), ChronoUnit.MINUTES);
        List<Alert> recent = alertRepository.findRecentByDeviceAndChannel(
            device.getId(), rule.getChannel(), cooldownSince);
        return !recent.isEmpty();
    }

    // ─── Alert creation ──────────────────────────────────────────────────
    private Alert createAlert(SensorReading reading, AlertRule rule) {
        Device device = reading.getDevice();

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("deviceId",   device.getDeviceId());
        snapshot.put("deviceName", device.getName());
        snapshot.put("status",     device.getStatus().name());
        snapshot.put("location",   device.getLocation());
        snapshot.put("channel",    reading.getChannel());
        snapshot.put("value",      reading.getValue());
        snapshot.put("unit",       reading.getUnit());
        snapshot.put("readAt",     reading.getReadAt().toString());

        Alert alert = Alert.builder()
            .device(device)
            .rule(rule)
            .severity(rule.getSeverity())
            .message(rule.formatMessage(reading.getValue(), device.getName()))
            .status(Alert.Status.ACTIVE)
            .deviceSnapshot(snapshot)
            .sensorValue(reading.getValue())
            .build();

        Alert saved = alertRepository.save(alert);

        log.warn("ALERT [{}] device={} channel={} value={} rule='{}'",
            rule.getSeverity(), device.getDeviceId(), reading.getChannel(),
            reading.getValue(), rule.getName());

        return saved;
    }
}
