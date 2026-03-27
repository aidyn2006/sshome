package org.example.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "device_commands", indexes = {
        @Index(name = "idx_commands_device", columnList = "device_id"),
        @Index(name = "idx_commands_status", columnList = "status")
})
public class DeviceCommand {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceCommandType command;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceCommandStatus status = DeviceCommandStatus.PENDING;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime executedAt;

    public DeviceCommand() {}

    public UUID getId() { return id; }

    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }

    public DeviceCommandType getCommand() { return command; }
    public void setCommand(DeviceCommandType command) { this.command = command; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public DeviceCommandStatus getStatus() { return status; }
    public void setStatus(DeviceCommandStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(LocalDateTime executedAt) { this.executedAt = executedAt; }
}
