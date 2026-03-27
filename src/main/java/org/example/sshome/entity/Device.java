package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "devices", indexes = {
    @Index(name = "idx_devices_status",   columnList = "status"),
    @Index(name = "idx_devices_type",     columnList = "type"),
    @Index(name = "idx_devices_location", columnList = "location")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "device_id", nullable = false, unique = true, length = 64)
    private String deviceId;

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DeviceType type = DeviceType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Column(length = 255)
    private String location;

    @Column(length = 64)
    private String firmware;

    @Column(columnDefinition = "TEXT")
    private String description;

    // --- Encryption metadata ---------------------------------------------
    @Column(name = "data_encrypted", nullable = false)
    @Builder.Default
    private boolean dataEncrypted = false;

    /** RSA-encrypted AES key - stored in Base64 */
    @Column(name = "encrypted_key_b64", columnDefinition = "TEXT")
    private String encryptedKeyB64;

    // --- Relationships ---------------------------------------------------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edge_node_id")
    private EdgeNode edgeNode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @OneToMany(mappedBy = "device", cascade = CascadeType.REMOVE, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SensorReading> readings = new ArrayList<>();

    @OneToMany(mappedBy = "device", cascade = CascadeType.REMOVE, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Alert> alerts = new ArrayList<>();

    // --- Timestamps ------------------------------------------------------
    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = Instant.now();
        if (deviceId == null) deviceId = "dev-" + UUID.randomUUID().toString().substring(0, 8);
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // --- Enums -----------------------------------------------------------
    public enum DeviceType {
        TEMPERATURE, HUMIDITY, CAMERA, MOTION, LOCK,
        GATEWAY, SMOKE, ENERGY, FLOOD, AIR_QUALITY, THERMOSTAT, OTHER
    }

    public enum DeviceStatus {
        ONLINE, OFFLINE, WARNING, MAINTENANCE
    }
}
