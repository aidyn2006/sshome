package org.example.backend.repository;

import org.example.backend.entity.Device;
import org.example.backend.entity.DeviceEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeviceEventRepository extends JpaRepository<DeviceEvent, UUID> {
    List<DeviceEvent> findAllByDeviceOrderByTimestampDesc(Device device);
}
