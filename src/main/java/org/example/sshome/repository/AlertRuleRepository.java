package org.example.sshome.repository;

import org.example.sshome.entity.AlertRule;
import org.example.sshome.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRuleRepository extends JpaRepository<AlertRule, UUID> {

    List<AlertRule> findByEnabledTrue();

    /** All enabled rules matching a specific channel and optionally device type */
    @Query("""
        SELECT r FROM AlertRule r
        WHERE r.enabled = true
          AND r.channel = :channel
          AND (r.deviceType IS NULL OR r.deviceType = :deviceType)
    """)
    List<AlertRule> findApplicableRules(
        @Param("channel")    String channel,
        @Param("deviceType") Device.DeviceType deviceType
    );
}
