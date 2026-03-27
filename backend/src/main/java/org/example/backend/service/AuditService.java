package org.example.backend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.backend.entity.AuditLog;
import org.example.backend.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Async
    public void log(String email, AuditLog.AuditAction action, HttpServletRequest request, String details) {
        String ip = resolveClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        auditLogRepository.save(new AuditLog(email, action, ip, userAgent, details));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
