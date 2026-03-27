package org.example.backend.repository;

import org.example.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEmailOrderByTimestampDesc(String email);
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
    Page<AuditLog> findByActionOrderByTimestampDesc(AuditLog.AuditAction action, Pageable pageable);
    long countByEmailAndActionAndTimestampAfter(String email, AuditLog.AuditAction action, LocalDateTime since);
    long countByActionAndTimestampAfter(AuditLog.AuditAction action, LocalDateTime since);
}
