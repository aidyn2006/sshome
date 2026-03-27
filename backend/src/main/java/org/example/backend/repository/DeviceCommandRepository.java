package org.example.backend.repository;

import org.example.backend.entity.Device;
import org.example.backend.entity.DeviceCommand;
import org.example.backend.entity.DeviceCommandStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, UUID> {
    List<DeviceCommand> findAllByDevice(Device device);
    List<DeviceCommand> findAllByDeviceAndStatus(Device device, DeviceCommandStatus status);
}
