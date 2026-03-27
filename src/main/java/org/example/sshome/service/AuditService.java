package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.AuditLog;
import org.example.sshome.entity.User;
import org.example.sshome.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Asynchronous audit trail service.
 * All writes happen in a NEW transaction so audit logs are never lost
 * even if the calling transaction rolls back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Records an audit event asynchronously in a separate transaction.
     * Never throws - failures are logged but don't affect the caller.
     */
    @Async("auditExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditLog.Action action, String entityType, String entityId,
                    User user, String ip, Map<String, Object> details) {
        try {
            AuditLog entry = AuditLog.of(action, entityType, entityId, user, ip, details);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log: action={} entity={}/{} user={}",
                action, entityType, entityId,
                user != null ? user.getEmail() : "anonymous", e);
        }
    }

    @Async("auditExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logLogin(User user, String ip) {
        // Inline save - cannot call @Async method from same class (proxy bypassed)
        try {
            AuditLog entry = AuditLog.of(AuditLog.Action.LOGIN, "USER",
                user.getId().toString(), user, ip,
                Map.of("email", user.getEmail(), "role", user.getRole().name()));
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write login audit log for user={}", user.getEmail(), e);
        }
    }

    @Async("auditExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logLogout(User user, String ip) {
        // Inline save - cannot call @Async method from same class (proxy bypassed)
        try {
            AuditLog entry = AuditLog.of(AuditLog.Action.LOGOUT, "USER",
                user.getId().toString(), user, ip, null);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write logout audit log for user={}", user.getEmail(), e);
        }
    }
}
