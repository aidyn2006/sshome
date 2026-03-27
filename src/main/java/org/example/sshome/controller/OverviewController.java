package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.sshome.service.OverviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/overview")
@RequiredArgsConstructor
@Tag(name = "Overview", description = "Dashboard KPI and summary data")
@SecurityRequirement(name = "bearerAuth")
public class OverviewController {

    private final OverviewService overviewService;

    /** GET /api/overview/kpi - main dashboard KPIs */
    @GetMapping("/kpi")
    @Operation(summary = "Get dashboard KPIs: device counts, alert counts, system status")
    public ResponseEntity<Map<String, Object>> kpi() {
        return ResponseEntity.ok(overviewService.getKpi());
    }

    /** GET /api/overview/activity?hours=24 - activity chart data */
    @GetMapping("/activity")
    @Operation(summary = "Get hourly activity data points for chart")
    public ResponseEntity<List<Map<String, Object>>> activity(
        @RequestParam(defaultValue = "24") int hours
    ) {
        return ResponseEntity.ok(overviewService.getActivityPoints(Math.min(hours, 168)));
    }

    /** GET /api/overview/alerts?limit=10 - latest alerts for dashboard */
    @GetMapping("/alerts")
    @Operation(summary = "Get recent alerts for overview widget")
    public ResponseEntity<List<Map<String, Object>>> recentAlerts(
        @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(overviewService.getRecentAlerts(Math.min(limit, 50)));
    }
}
