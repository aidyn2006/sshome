package org.example.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_email", columnList = "email"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    private String ipAddress;

    @Column(length = 512)
    private String userAgent;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @Column(length = 500)
    private String details;

    public AuditLog() {}

    public AuditLog(String email, AuditAction action, String ipAddress, String userAgent, String details) {
        this.email = email;
        this.action = action;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.details = details;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public AuditAction getAction() { return action; }
    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getDetails() { return details; }

    public enum AuditAction {
        LOGIN_SUCCESS,
        LOGIN_FAILED,
        REGISTER,
        REGISTER_FAILED,
        LOGOUT,
        RATE_LIMIT_EXCEEDED
    }
}
