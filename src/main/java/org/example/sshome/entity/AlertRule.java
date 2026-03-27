package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_rules")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    /** Sensor channel to watch: temperature, humidity, co2, etc. */
    @Column(nullable = false, length = 64)
    private String channel;

    /** Optional: restrict to specific device type */
    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", length = 32)
    private Device.DeviceType deviceType;

    /** GT | LT | GTE | LTE | EQ | NEQ */
    @Column(nullable = false, length = 8)
    private String operator;

    @Column(nullable = false)
    private double threshold;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Alert.Severity severity;

    /** Template with {value} and {device} placeholders */
    @Column(name = "message_template", nullable = false, columnDefinition = "TEXT")
    private String messageTemplate;

    /** Minimum minutes between repeated alerts for same device+channel */
    @Column(name = "cooldown_minutes", nullable = false)
    @Builder.Default
    private int cooldownMinutes = 5;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    protected void onUpdate() { updatedAt = Instant.now(); }

    // --- Rule evaluation ----------------------------------------------
    public boolean evaluate(double value) {
        return switch (operator.toUpperCase()) {
            case "GT"  -> value > threshold;
            case "LT"  -> value < threshold;
            case "GTE" -> value >= threshold;
            case "LTE" -> value <= threshold;
            case "EQ"  -> Double.compare(value, threshold) == 0;
            case "NEQ" -> Double.compare(value, threshold) != 0;
            default    -> false;
        };
    }

    public String formatMessage(double value, String deviceName) {
        return messageTemplate
            .replace("{value}", String.format("%.2f", value))
            .replace("{device}", deviceName);
    }
}
