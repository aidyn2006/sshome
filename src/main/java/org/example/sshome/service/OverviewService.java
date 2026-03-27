package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import org.example.sshome.repository.AlertRepository;
import org.example.sshome.repository.DeviceRepository;
import org.example.sshome.repository.SensorReadingRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OverviewService {

    private final DeviceRepository       deviceRepository;
    private final AlertRepository        alertRepository;
    private final SensorReadingRepository readingRepository;

    // --- KPI -------------------------------------------------------------

    @Cacheable(value = "kpi", key = "'overview'")
    public Map<String, Object> getKpi() {
        long total       = deviceRepository.count();
        long online      = deviceRepository.countOnline();
        long offline     = deviceRepository.countOffline();
        long maintenance = deviceRepository.countMaintenance();

        long alertsDay  = alertRepository.countByCreatedAtAfter(Instant.now().minus(24, ChronoUnit.HOURS));
        long alertsWeek = alertRepository.countByCreatedAtAfter(Instant.now().minus(7,  ChronoUnit.DAYS));

        String systemStatus;
        double onlinePct = total > 0 ? (double) online / total * 100 : 0;
        if (onlinePct >= 90) systemStatus = "online";
        else if (onlinePct >= 50) systemStatus = "degraded";
        else systemStatus = "offline";

        return Map.of(
            "total",       total,
            "active",      online,
            "inactive",    offline + maintenance,
            "alertsDay",   alertsDay,
            "alertsWeek",  alertsWeek,
            "status",      systemStatus,
            "onlinePct",   String.format("%.1f", onlinePct)
        );
    }

    // --- Activity Chart Data ---------------------------------------------

    /**
     * Returns 24 hourly data points for the activity chart.
     * Combines sensor reading count + alert count per hour.
     */
    public List<Map<String, Object>> getActivityPoints(int hours) {
        Instant since = Instant.now().minus(hours, ChronoUnit.HOURS);

        // Build baseline map with zero values
        Map<Long, Long> readingsByHour = new LinkedHashMap<>();
        Map<Long, Long> alertsByHour   = new LinkedHashMap<>();

        Instant cursor = since.truncatedTo(java.time.temporal.ChronoUnit.HOURS);
        while (cursor.isBefore(Instant.now())) {
            long epochHour = cursor.getEpochSecond() / 3600;
            readingsByHour.put(epochHour, 0L);
            alertsByHour.put(epochHour, 0L);
            cursor = cursor.plus(1, ChronoUnit.HOURS);
        }

        // Fill from DB - handle both PostgreSQL (Timestamp) and H2 (LocalDateTime) result types
        readingRepository.countPerHourSince(since).forEach(row -> {
            Long epochHour = toEpochHour(row[0]);
            if (epochHour != null) {
                readingsByHour.merge(epochHour, ((Number) row[1]).longValue(), Long::sum);
            }
        });

        alertRepository.countPerHourSince(since).forEach(row -> {
            Long epochHour = toEpochHour(row[0]);
            if (epochHour != null) {
                alertsByHour.merge(epochHour, ((Number) row[1]).longValue(), Long::sum);
            }
        });

        List<Map<String, Object>> points = new ArrayList<>();
        for (Long epochHour : readingsByHour.keySet()) {
            Instant pointTime = Instant.ofEpochSecond(epochHour * 3600);
            long readings = readingsByHour.getOrDefault(epochHour, 0L);
            long alerts   = alertsByHour.getOrDefault(epochHour, 0L);
            points.add(Map.of(
                "time",     pointTime.toString(),
                "value",    readings,
                "alerts",   alerts
            ));
        }
        return points;
    }

    // --- Timestamp helper - handles H2 (LocalDateTime) and PostgreSQL (Timestamp) --

    private Long toEpochHour(Object obj) {
        if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().getEpochSecond() / 3600;
        if (obj instanceof LocalDateTime ldt)    return ldt.toEpochSecond(ZoneOffset.UTC) / 3600;
        if (obj instanceof Instant inst)         return inst.getEpochSecond() / 3600;
        return null;
    }

    // --- Recent Alerts ----------------------------------------------------

    public List<Map<String, Object>> getRecentAlerts(int limit) {
        return alertRepository.findTop10ByOrderByCreatedAtDesc().stream()
            .limit(limit)
            .map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",       a.getId());
                m.put("title",    a.getMessage());
                m.put("level",    a.getSeverity().name().toLowerCase());
                m.put("time",     a.getCreatedAt().toString());
                m.put("status",   a.getStatus().name());
                m.put("device",   a.getDevice() != null ? a.getDevice().getName() : null);
                return m;
            })
            .toList();
    }
}
