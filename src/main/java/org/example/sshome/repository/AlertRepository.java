package org.example.sshome.repository;

import org.example.sshome.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {

    Page<Alert> findByStatusOrderByCreatedAtDesc(Alert.Status status, Pageable pageable);

    Page<Alert> findBySeverityOrderByCreatedAtDesc(Alert.Severity severity, Pageable pageable);

    @Query("""
        SELECT a FROM Alert a
        WHERE (:status   IS NULL OR a.status   = :status)
          AND (:severity IS NULL OR a.severity = :severity)
          AND (:deviceId IS NULL OR a.device.id = :deviceId)
        ORDER BY a.severity DESC, a.createdAt DESC
    """)
    Page<Alert> findFiltered(
        @Param("status")   Alert.Status status,
        @Param("severity") Alert.Severity severity,
        @Param("deviceId") UUID deviceId,
        Pageable pageable
    );

    List<Alert> findTop10ByOrderByCreatedAtDesc();

    /** Count active alerts in last N hours */
    @Query("""
        SELECT COUNT(a) FROM Alert a
        WHERE a.status = 'ACTIVE' AND a.createdAt >= :since
    """)
    long countActiveSince(@Param("since") Instant since);

    /** Count all alerts created since date */
    long countByCreatedAtAfter(Instant since);

    long countBySeverity(Alert.Severity severity);

    /** For cooldown check: last alert for device+channel combo */
    @Query("""
        SELECT a FROM Alert a
        WHERE a.device.id = :deviceId
          AND a.rule.channel = :channel
          AND a.createdAt >= :since
        ORDER BY a.createdAt DESC
    """)
    List<Alert> findRecentByDeviceAndChannel(
        @Param("deviceId") UUID deviceId,
        @Param("channel")  String channel,
        @Param("since")    Instant since
    );

    /** Alert count per day for activity chart */
    @Query(value = """
        SELECT DATE_TRUNC('hour', created_at) AS bucket, COUNT(*) AS cnt
        FROM alerts
        WHERE created_at >= :since
        GROUP BY bucket
        ORDER BY bucket ASC
    """, nativeQuery = true)
    List<Object[]> countPerHourSince(@Param("since") Instant since);

    @Query("SELECT a FROM Alert a WHERE a.createdAt BETWEEN :from AND :to ORDER BY a.createdAt DESC")
    List<Alert> findByTimeRange(@Param("from") Instant from, @Param("to") Instant to);

    long countByStatus(Alert.Status status);
}
