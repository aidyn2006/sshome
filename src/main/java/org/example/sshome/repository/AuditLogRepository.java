package org.example.sshome.repository;

import org.example.sshome.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:userId IS NULL OR a.user.id = :userId)
          AND (:action IS NULL OR a.action  = :action)
          AND a.createdAt BETWEEN :from AND :to
        ORDER BY a.createdAt DESC
    """)
    Page<AuditLog> findFiltered(
        @Param("userId") UUID userId,
        @Param("action") AuditLog.Action action,
        @Param("from")   Instant from,
        @Param("to")     Instant to,
        Pageable pageable
    );

    /** Activity count per user for reports */
    @Query("SELECT a.user.email, COUNT(a) FROM AuditLog a WHERE a.createdAt >= :since GROUP BY a.user.email ORDER BY COUNT(a) DESC")
    List<Object[]> countPerUserSince(@Param("since") Instant since);
}
