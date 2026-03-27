package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_user",   columnList = "user_id"),
    @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id"),
    @Index(name = "idx_audit_action", columnList = "action")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Action action;

    @Column(name = "entity_type", length = 64)
    private String entityType;

    @Column(name = "entity_id", length = 255)
    private String entityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column
    private Map<String, Object> details;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum Action {
        CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, AI_QUERY
    }

    // --- Factory -----------------------------------------------------
    public static AuditLog of(Action action, String entityType, String entityId,
                              User user, String ip, Map<String, Object> details) {
        return AuditLog.builder()
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .user(user)
            .ipAddress(ip)
            .details(details)
            .build();
    }
}
