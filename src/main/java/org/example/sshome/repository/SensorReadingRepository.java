package org.example.sshome.repository;

import org.example.sshome.entity.SensorReading;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReading, UUID> {

    /** Latest N readings for a device + channel */
    @Query("""
        SELECT r FROM SensorReading r
        WHERE r.device.id = :deviceId AND r.channel = :channel
        ORDER BY r.readAt DESC
    """)
    List<SensorReading> findLatestByDeviceAndChannel(
        @Param("deviceId") UUID deviceId,
        @Param("channel")  String channel,
        Pageable pageable
    );

    /** All readings in time range for a device */
    @Query("""
        SELECT r FROM SensorReading r
        WHERE r.device.id = :deviceId
          AND (:channel IS NULL OR r.channel = :channel)
          AND r.readAt BETWEEN :from AND :to
        ORDER BY r.readAt ASC
    """)
    List<SensorReading> findByDeviceAndTimeRange(
        @Param("deviceId") UUID deviceId,
        @Param("channel")  String channel,
        @Param("from")     Instant from,
        @Param("to")       Instant to
    );

    /** Activity: count readings per hour for last N hours */
    @Query(value = """
        SELECT DATE_TRUNC('hour', read_at) AS bucket,
               COUNT(*) AS cnt
        FROM sensor_readings
        WHERE read_at >= :since
        GROUP BY bucket
        ORDER BY bucket ASC
    """, nativeQuery = true)
    List<Object[]> countPerHourSince(@Param("since") Instant since);

    /** Aggregated stats per channel */
    @Query("""
        SELECT r.channel, MIN(r.value), MAX(r.value), AVG(r.value)
        FROM SensorReading r
        WHERE r.device.id = :deviceId AND r.readAt BETWEEN :from AND :to
        GROUP BY r.channel
    """)
    List<Object[]> aggregateByChannelAndPeriod(
        @Param("deviceId") UUID deviceId,
        @Param("from")     Instant from,
        @Param("to")       Instant to
    );

    /** All readings in a time range (for reports) */
    @Query("""
        SELECT r FROM SensorReading r
        WHERE r.readAt BETWEEN :from AND :to
        ORDER BY r.readAt DESC
    """)
    List<SensorReading> findByTimeRange(@Param("from") Instant from, @Param("to") Instant to);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM SensorReading r WHERE r.device.id = :deviceId AND r.readAt < :before")
    void deleteByDevice_IdAndReadAtBefore(@Param("deviceId") UUID deviceId, @Param("before") Instant before);
}
