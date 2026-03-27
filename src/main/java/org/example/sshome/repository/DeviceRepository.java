package org.example.sshome.repository;

import org.example.sshome.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {

    Optional<Device> findByDeviceId(String deviceId);

    boolean existsByDeviceId(String deviceId);

    Page<Device> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Device> findByStatusOrderByCreatedAtDesc(Device.DeviceStatus status, Pageable pageable);

    Page<Device> findByTypeOrderByCreatedAtDesc(Device.DeviceType type, Pageable pageable);

    Page<Device> findByLocationContainingIgnoreCaseOrderByCreatedAtDesc(String location, Pageable pageable);

    /** Full filter query */
    @Query("""
        SELECT d FROM Device d
        WHERE (:status IS NULL OR d.status = :status)
          AND (:type   IS NULL OR d.type   = :type)
          AND (:search IS NULL OR LOWER(d.name)     LIKE LOWER(CONCAT('%', :search, '%'))
                               OR LOWER(d.location) LIKE LOWER(CONCAT('%', :search, '%'))
                               OR LOWER(d.deviceId) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY d.createdAt DESC
    """)
    Page<Device> findFiltered(
        @Param("status") Device.DeviceStatus status,
        @Param("type")   Device.DeviceType type,
        @Param("search") String search,
        Pageable pageable
    );

    // --- Aggregation queries ------------------------------------------
    long countByStatus(Device.DeviceStatus status);

    @Query("SELECT COUNT(d) FROM Device d WHERE d.status = 'ONLINE'")
    long countOnline();

    @Query("SELECT COUNT(d) FROM Device d WHERE d.status = 'OFFLINE'")
    long countOffline();

    @Query("SELECT COUNT(d) FROM Device d WHERE d.status = 'MAINTENANCE'")
    long countMaintenance();

    @Query("SELECT d.name FROM Device d WHERE d.status = 'ONLINE' ORDER BY d.lastSeenAt DESC")
    List<String> findTopOnlineDeviceNames(Pageable pageable);

    @Query("""
        SELECT d FROM Device d
        WHERE d.status = 'ONLINE'
        ORDER BY d.lastSeenAt DESC
    """)
    List<Device> findAllOnline();
}
