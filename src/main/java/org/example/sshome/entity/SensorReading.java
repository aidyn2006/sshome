package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sensor_readings", indexes = {
    @Index(name = "idx_readings_device_time", columnList = "device_id, read_at DESC"),
    @Index(name = "idx_readings_channel",     columnList = "channel, read_at DESC")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    /** Sensor channel: temperature | humidity | co2 | aqi | battery | motion | etc. */
    @Column(nullable = false, length = 64)
    private String channel;

    @Column(nullable = false)
    private double value;

    @Column(length = 32)
    private String unit;

    /** GOOD | SUSPECT | BAD */
    @Column(length = 16)
    @Builder.Default
    private String quality = "GOOD";

    @Column(name = "read_at", nullable = false)
    @Builder.Default
    private Instant readAt = Instant.now();

    // --- Aggregation helpers (not stored) ------------------------------
    public static SensorReading of(Device device, String channel, double value, String unit) {
        return SensorReading.builder()
            .device(device)
            .channel(channel)
            .value(value)
            .unit(unit)
            .quality("GOOD")
            .readAt(Instant.now())
            .build();
    }
}
