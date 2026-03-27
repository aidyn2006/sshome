package org.example.sshome.controller;

import lombok.RequiredArgsConstructor;
import org.example.sshome.dto.*;
import org.example.sshome.service.DemoDataService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OverviewMockController {

    private final DemoDataService demoDataService;

    @GetMapping("/overview/kpi")
    public OverviewKpiResponse kpi() {
        return demoDataService.getKpi();
    }

    @GetMapping("/overview/activity")
    public List<ActivityPointResponse> activity() {
        return demoDataService.getActivity();
    }

    @GetMapping("/alerts/latest")
    public List<AlertItemResponse> latestAlerts(@RequestParam(defaultValue = "10") int limit) {
        return demoDataService.getAlerts(limit);
    }

    @GetMapping("/devices")
    public List<DeviceResponse> devices() {
        return demoDataService.getDevices();
    }

    @PostMapping("/devices/{id}/toggle")
    public DeviceResponse toggle(@PathVariable String id) {
        return demoDataService.toggleDevice(id);
    }

    @GetMapping("/devices/summary")
    public DeviceSummaryResponse summary() {
        return demoDataService.getSummary();
    }
}
