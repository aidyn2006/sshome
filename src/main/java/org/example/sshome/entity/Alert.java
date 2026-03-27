package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alerts_status",  columnList = "status, severity"),
    @Index(name = "idx_alerts_device",  columnList = "device_id"),
    @Index(name = "idx_alerts_created", columnList = "created_at DESC")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private AlertRule rule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.ACTIVE;

    /** JSON snapshot of device state at alert creation */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "device_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> deviceSnapshot;

    @Column(name = "sensor_value")
    private Double sensorValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledged_by_id")
    private User acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    // ─── Business methods ─────────────────────────────────────────────
    public void acknowledge(User user) {
        this.status = Status.ACKNOWLEDGED;
        this.acknowledgedBy = user;
        this.acknowledgedAt = Instant.now();
    }

    public void resolve() {
        this.status = Status.RESOLVED;
        this.resolvedAt = Instant.now();
    }

    // ─── Enums ───────────────────────────────────────────────────────
    public enum Severity {
        CRITICAL, WARNING, INFO;

        public int priority() {
            return switch (this) {
                case CRITICAL -> 3;
                case WARNING  -> 2;
                case INFO     -> 1;
            };
        }
    }

    public enum Status { ACTIVE, ACKNOWLEDGED, RESOLVED }
}
