package org.example.sshome.service;

import lombok.Getter;
import org.example.sshome.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class DemoDataService {

    private final Map<String, DeviceState> devices = new LinkedHashMap<>();
    private final List<AlertItemResponse> alerts = new ArrayList<>();
    private final List<ActivityPointResponse> activity = new ArrayList<>();
    private final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    @PostConstruct
    void init() {
        // mock devices
        devices.put("gw-1", new DeviceState("gw-1", "Gateway Living Room", true));
        devices.put("cam-1", new DeviceState("cam-1", "Camera Front Door", true));
        devices.put("lock-1", new DeviceState("lock-1", "Smart Lock", true));
        devices.put("spr-1", new DeviceState("spr-1", "Sprinkler", false));
        devices.put("hvac-1", new DeviceState("hvac-1", "HVAC Main", true));

        // mock alerts
        alerts.add(new AlertItemResponse("Door forced open", timestampMinutesAgo(6), "critical"));
        alerts.add(new AlertItemResponse("High humidity in basement", timestampMinutesAgo(34), "warning"));
        alerts.add(new AlertItemResponse("Firmware update ready", timestampMinutesAgo(80), "info"));
        alerts.add(new AlertItemResponse("Garage motion detected", timestampMinutesAgo(120), "warning"));

        // mock activity curve (last 24 points)
        double current = 40;
        for (int i = 0; i < 24; i++) {
            current = Math.max(0, current + ThreadLocalRandom.current().nextDouble(-8, 10));
            activity.add(new ActivityPointResponse("T" + i, Math.round(current * 10.0) / 10.0));
        }
    }

    public OverviewKpiResponse getKpi() {
        int total = devices.size();
        int active = (int) devices.values().stream().filter(DeviceState::isOn).count();
        int inactive = total - active;
        int alertsDay = Math.max(4, alerts.size());
        int alertsWeek = alertsDay * 3;
        String status = inactive == 0 ? "online" : inactive <= 1 ? "degraded" : "offline";
        return new OverviewKpiResponse(total, active, inactive, alertsDay, alertsWeek, status);
    }

    public List<ActivityPointResponse> getActivity() {
        return new ArrayList<>(activity);
    }

    public List<AlertItemResponse> getAlerts(int limit) {
        if (limit <= 0) return Collections.emptyList();
        return alerts.stream().limit(limit).collect(Collectors.toList());
    }

    public List<DeviceResponse> getDevices() {
        return devices.values().stream()
                .map(d -> new DeviceResponse(d.getId(), d.getName(), d.isOn()))
                .collect(Collectors.toList());
    }

    public DeviceResponse toggleDevice(String id) {
        DeviceState state = devices.get(id);
        if (state == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found");
        }
        state.setOn(!state.isOn());
        state.setLastToggle(LocalDateTime.now());
        return new DeviceResponse(state.getId(), state.getName(), state.isOn());
    }

    public DeviceSummaryResponse getSummary() {
        int total = devices.size();
        int online = (int) devices.values().stream().filter(DeviceState::isOn).count();
        int offline = total - online;
        int maintenance = Math.max(0, total - online - offline); // currently 0
        List<String> top = devices.values().stream()
                .limit(4)
                .map(DeviceState::getName)
                .collect(Collectors.toList());
        return new DeviceSummaryResponse(total, online, offline, maintenance, top);
    }

    private String timestampMinutesAgo(int minutes) {
        return LocalDateTime.now().minusMinutes(minutes).format(timeFormatter);
    }

    @Getter
    private static class DeviceState {
        private final String id;
        private final String name;
        private boolean on;
        private LocalDateTime lastToggle = LocalDateTime.now();

        DeviceState(String id, String name, boolean on) {
            this.id = id;
            this.name = name;
            this.on = on;
        }

        void setOn(boolean on) {
            this.on = on;
        }

        void setLastToggle(LocalDateTime lastToggle) {
            this.lastToggle = lastToggle;
        }
    }
}
