package org.example.sshome.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "edge_nodes")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class EdgeNode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "node_id", nullable = false, unique = true, length = 64)
    private String nodeId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String location;

    @Column(name = "ip_address", length = 128)
    private String ipAddress;

    @Column(length = 64)
    private String firmware;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.OFFLINE;

    @Column(name = "cpu_load")
    @Builder.Default
    private double cpuLoad = 0.0;

    @Column(name = "mem_load")
    @Builder.Default
    private double memLoad = 0.0;

    @Column(name = "latency_ms")
    @Builder.Default
    private double latencyMs = 0.0;

    @OneToMany(mappedBy = "edgeNode", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Device> devices = new ArrayList<>();

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    protected void onUpdate() { updatedAt = Instant.now(); }

    public enum Status { ONLINE, OFFLINE, DEGRADED }

    public int getConnectedDevicesCount() {
        return (int) devices.stream()
            .filter(d -> d.getStatus() == Device.DeviceStatus.ONLINE)
            .count();
    }
}
