package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.Alert;
import org.example.sshome.entity.AuditLog;
import org.example.sshome.entity.User;
import org.example.sshome.exception.ResourceNotFoundException;
import org.example.sshome.repository.AlertRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AlertService {

    private final AlertRepository alertRepository;
    private final AuditService    auditService;

    // ─── Queries ──────────────────────────────────────────────────────────

    public Page<Alert> findAll(Alert.Status status, Alert.Severity severity,
                               UUID deviceId, Pageable pageable) {
        return alertRepository.findFiltered(status, severity, deviceId, pageable);
    }

    public Alert findById(UUID id) {
        return alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert", id));
    }

    // ─── State transitions ────────────────────────────────────────────────

    @Transactional
    public Alert acknowledge(UUID id, User user, String ip) {
        Alert alert = findById(id);

        if (alert.getStatus() == Alert.Status.RESOLVED) {
            throw new IllegalStateException("Alert is already resolved");
        }

        alert.acknowledge(user);
        Alert saved = alertRepository.save(alert);

        auditService.log(AuditLog.Action.UPDATE, "ALERT", id.toString(), user, ip,
            Map.of("action", "ACKNOWLEDGE", "severity", alert.getSeverity().name()));

        return saved;
    }

    @Transactional
    public Alert resolve(UUID id, User user, String ip) {
        Alert alert = findById(id);
        alert.resolve();
        Alert saved = alertRepository.save(alert);

        auditService.log(AuditLog.Action.UPDATE, "ALERT", id.toString(), user, ip,
            Map.of("action", "RESOLVE", "severity", alert.getSeverity().name()));

        return saved;
    }

    @Transactional
    public int acknowledgeAll(User user, String ip) {
        Page<Alert> active = alertRepository.findByStatusOrderByCreatedAtDesc(
            Alert.Status.ACTIVE, Pageable.unpaged());

        active.getContent().forEach(a -> a.acknowledge(user));
        alertRepository.saveAll(active.getContent());

        int count = active.getNumberOfElements();
        auditService.log(AuditLog.Action.UPDATE, "ALERT", "ALL", user, ip,
            Map.of("action", "ACKNOWLEDGE_ALL", "count", count));

        return count;
    }

    // ─── Stats ───────────────────────────────────────────────────────────

    public Map<String, Object> getStats() {
        return Map.of(
            "critical",     alertRepository.countBySeverity(Alert.Severity.CRITICAL),
            "warning",      alertRepository.countBySeverity(Alert.Severity.WARNING),
            "info",         alertRepository.countBySeverity(Alert.Severity.INFO),
            "active",       alertRepository.countByStatus(Alert.Status.ACTIVE),
            "acknowledged", alertRepository.countByStatus(Alert.Status.ACKNOWLEDGED),
            "resolved",     alertRepository.countByStatus(Alert.Status.RESOLVED)
        );
    }
}
