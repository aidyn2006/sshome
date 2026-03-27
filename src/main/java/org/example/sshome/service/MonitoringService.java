package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.Alert;
import org.example.sshome.entity.Device;
import org.example.sshome.entity.SensorReading;
import org.example.sshome.websocket.SensorDataPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Real-time monitoring service.
 * - Accepts ingested sensor readings
 * - Triggers alert rule evaluation
 * - Publishes data to WebSocket/SSE subscribers
 * - Runs sensor simulation in dev profile
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MonitoringService {

    private final DeviceService      deviceService;
    private final AlertRuleEngine    ruleEngine;
    private final SensorDataPublisher publisher;

    private final Random rand = new Random();

    // --- Sensor ingestion -------------------------------------------------

    @Transactional
    public void ingest(String deviceId, String channel, double value, String unit) {
        SensorReading reading = deviceService.ingestReading(deviceId, channel, value, unit);

        // Evaluate alert rules
        List<Alert> triggered = ruleEngine.evaluate(reading);
        if (!triggered.isEmpty()) {
            triggered.forEach(a -> publisher.publishAlert(a));
        }

        // Broadcast to WebSocket subscribers
        publisher.publishReading(reading);

        log.debug("Ingested: device={} channel={} value={}{}", deviceId, channel, value, unit);
    }

    // --- Sensor simulation (dev profile) ---------------------------------

    /**
     * Simulates realistic sensor data for development/demo.
     * Runs every 5 seconds when simulation is enabled.
     */
    @Scheduled(fixedDelayString = "${monitoring.sensor-simulation.interval-ms:5000}")
    @Transactional
    public void simulateSensorData() {
        List<Device> onlineDevices = deviceService.findAll(
            Device.DeviceStatus.ONLINE, null, null,
            org.springframework.data.domain.Pageable.ofSize(20)
        ).getContent();

        if (onlineDevices.isEmpty()) return;

        for (Device device : onlineDevices) {
            simulateDeviceReadings(device);
        }
    }

    private void simulateDeviceReadings(Device device) {
        switch (device.getType()) {
            case TEMPERATURE -> {
                ingestSafe(device.getDeviceId(), "temperature", randomGaussian(22, 2, 10, 50), "°C");
                ingestSafe(device.getDeviceId(), "humidity",    randomGaussian(55, 8, 10, 100), "%");
            }
            case AIR_QUALITY -> {
                ingestSafe(device.getDeviceId(), "aqi",  randomGaussian(35, 15, 0, 200), "AQI");
                ingestSafe(device.getDeviceId(), "co2",  randomGaussian(420, 50, 350, 900), "ppm");
            }
            case ENERGY -> {
                ingestSafe(device.getDeviceId(), "power",   randomGaussian(250, 80, 0, 5000), "W");
                ingestSafe(device.getDeviceId(), "voltage", randomGaussian(220, 5, 200, 240),  "V");
            }
            case MOTION ->
                ingestSafe(device.getDeviceId(), "motion", rand.nextDouble() < 0.1 ? 1.0 : 0.0, "bool");
            default ->
                ingestSafe(device.getDeviceId(), "battery", randomGaussian(75, 10, 0, 100), "%");
        }
    }

    private void ingestSafe(String deviceId, String channel, double value, String unit) {
        try {
            ingest(deviceId, channel, value, unit);
        } catch (Exception e) {
            log.debug("Simulation ingest failed for device {}: {}", deviceId, e.getMessage());
        }
    }

    private double randomGaussian(double mean, double std, double min, double max) {
        double val = mean + rand.nextGaussian() * std;
        return Math.max(min, Math.min(max, val));
    }

    // --- Stale device check -----------------------------------------------

    /** Marks devices offline if they haven't reported in 10 minutes */
    @Scheduled(fixedDelay = 60_000)
    public void checkStaleDevices() {
        int marked = deviceService.markStaleDevicesOffline(10);
        if (marked > 0) {
            log.warn("Marked {} device(s) as offline (no heartbeat in 10 min)", marked);
        }
    }
}
