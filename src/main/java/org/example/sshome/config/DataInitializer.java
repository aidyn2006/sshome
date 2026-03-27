package org.example.sshome.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.*;
import org.example.sshome.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Seeds development database with sample users, edge nodes, and devices.
 * Only active under the "dev" Spring profile.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository       userRepository;
    private final EdgeNodeRepository   edgeNodeRepository;
    private final DeviceRepository     deviceRepository;
    private final AlertRuleRepository  alertRuleRepository;
    private final PasswordEncoder      passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedUsers();
        seedEdgeNodes();
        seedDevices();
        seedAlertRules();
        log.info("Dev data initializer complete.");
    }

    private void seedUsers() {
        if (userRepository.count() > 0) return;

        List<User> users = List.of(
            User.builder().email("admin@sshome.dev")
                .password(passwordEncoder.encode("Admin@1234"))
                .fullName("Admin User").role(Role.SUPERADMIN).active(true).build(),
            User.builder().email("operator@sshome.dev")
                .password(passwordEncoder.encode("Operator@1234"))
                .fullName("Operator User").role(Role.OPERATOR).active(true).build(),
            User.builder().email("viewer@sshome.dev")
                .password(passwordEncoder.encode("Viewer@1234"))
                .fullName("Viewer User").role(Role.VIEWER).active(true).build()
        );
        userRepository.saveAll(users);
        log.info("Seeded {} users", users.size());
    }

    private void seedEdgeNodes() {
        if (edgeNodeRepository.count() > 0) return;

        List<EdgeNode> nodes = List.of(
            buildEdgeNode("EDGE-001", "192.168.1.10", "Living Room Hub",  EdgeNode.Status.ONLINE),
            buildEdgeNode("EDGE-002", "192.168.1.11", "Basement Hub",     EdgeNode.Status.ONLINE),
            buildEdgeNode("EDGE-003", "192.168.1.12", "Garage Hub",       EdgeNode.Status.DEGRADED),
            buildEdgeNode("EDGE-004", "192.168.1.13", "Outdoor Hub",      EdgeNode.Status.OFFLINE),
            buildEdgeNode("EDGE-005", "192.168.1.14", "Server Room Hub",  EdgeNode.Status.ONLINE)
        );
        edgeNodeRepository.saveAll(nodes);
        log.info("Seeded {} edge nodes", nodes.size());
    }

    private EdgeNode buildEdgeNode(String nodeId, String ip, String name, EdgeNode.Status status) {
        boolean online = status == EdgeNode.Status.ONLINE;
        return EdgeNode.builder()
            .nodeId(nodeId)
            .ipAddress(ip)
            .name(name)
            .firmware("v2.4.1")
            .status(status)
            .cpuLoad(online ? 25.0 + Math.random() * 30 : 0.0)
            .memLoad(online ? 40.0 + Math.random() * 20 : 0.0)
            .latencyMs(online ? 5.0 + Math.random() * 20 : 0.0)
            .build();
    }

    private void seedDevices() {
        if (deviceRepository.count() > 0) return;

        List<EdgeNode> nodes = edgeNodeRepository.findAll();
        if (nodes.isEmpty()) return;

        List<Device> devices = List.of(
            buildDevice("Thermostat Living Room",  Device.DeviceType.THERMOSTAT,  Device.DeviceStatus.ONLINE,      "Living Room", nodes.get(0)),
            buildDevice("Motion Sensor Front Door",Device.DeviceType.MOTION,      Device.DeviceStatus.ONLINE,      "Entrance",    nodes.get(0)),
            buildDevice("Smart Lock Front",        Device.DeviceType.LOCK,        Device.DeviceStatus.ONLINE,      "Entrance",    nodes.get(0)),
            buildDevice("IP Camera Kitchen",       Device.DeviceType.CAMERA,      Device.DeviceStatus.ONLINE,      "Kitchen",     nodes.get(0)),
            buildDevice("Air Quality Sensor",      Device.DeviceType.AIR_QUALITY, Device.DeviceStatus.ONLINE,      "Living Room", nodes.get(1)),
            buildDevice("Thermostat Bedroom",      Device.DeviceType.THERMOSTAT,  Device.DeviceStatus.OFFLINE,     "Bedroom",     nodes.get(1)),
            buildDevice("Garage Door Controller",  Device.DeviceType.LOCK,        Device.DeviceStatus.WARNING,     "Garage",      nodes.get(2)),
            buildDevice("Outdoor Weather Station", Device.DeviceType.TEMPERATURE, Device.DeviceStatus.OFFLINE,     "Outdoor",     nodes.get(3)),
            buildDevice("CO2 Monitor Office",      Device.DeviceType.AIR_QUALITY, Device.DeviceStatus.ONLINE,      "Office",      nodes.get(4)),
            buildDevice("Server Rack Sensor",      Device.DeviceType.TEMPERATURE, Device.DeviceStatus.ONLINE,      "Server Room", nodes.get(4)),
            buildDevice("Motion Sensor Backyard",  Device.DeviceType.MOTION,      Device.DeviceStatus.OFFLINE,     "Outdoor",     nodes.get(3)),
            buildDevice("Smart Plug Main Switch",  Device.DeviceType.ENERGY,      Device.DeviceStatus.ONLINE,      "Utility",     nodes.get(1))
        );
        deviceRepository.saveAll(devices);
        log.info("Seeded {} devices", devices.size());
    }

    private Device buildDevice(String name, Device.DeviceType type, Device.DeviceStatus status,
                                String location, EdgeNode node) {
        return Device.builder()
            .name(name)
            .type(type)
            .status(status)
            .location(location)
            .firmware("v1.3.2")
            .edgeNode(node)
            .dataEncrypted(false)
            .lastSeenAt(status == Device.DeviceStatus.ONLINE ? Instant.now() : Instant.now().minusSeconds(3600))
            .build();
    }

    private void seedAlertRules() {
        if (alertRuleRepository.count() > 0) return;

        List<AlertRule> rules = List.of(
            buildRule("High Temperature",    "temperature", "GT",  30.0,   Alert.Severity.WARNING,  "Temperature {value}°C exceeds limit on {device}",        15),
            buildRule("Critical Temperature","temperature", "GT",  40.0,   Alert.Severity.CRITICAL, "Critical temperature {value}°C on {device}!",            5),
            buildRule("Low Temperature",     "temperature", "LT",  5.0,    Alert.Severity.WARNING,  "Temperature {value}°C below minimum on {device}",        15),
            buildRule("High Humidity",       "humidity",    "GT",  80.0,   Alert.Severity.WARNING,  "Humidity {value}% is too high on {device}",              30),
            buildRule("High CO2",            "co2",         "GT",  1000.0, Alert.Severity.WARNING,  "CO2 level {value}ppm is elevated on {device}",           20),
            buildRule("Dangerous CO2",       "co2",         "GT",  2000.0, Alert.Severity.CRITICAL, "Dangerous CO2 {value}ppm on {device}!",                  5),
            buildRule("High AQI",            "aqi",         "GT",  150.0,  Alert.Severity.CRITICAL, "Air quality index {value} is dangerous on {device}!",    10)
        );
        alertRuleRepository.saveAll(rules);
        log.info("Seeded {} alert rules", rules.size());
    }

    private AlertRule buildRule(String name, String channel, String operator,
                                 double threshold, Alert.Severity severity,
                                 String messageTemplate, int cooldownMinutes) {
        return AlertRule.builder()
            .name(name)
            .channel(channel)
            .operator(operator)
            .threshold(threshold)
            .severity(severity)
            .messageTemplate(messageTemplate)
            .cooldownMinutes(cooldownMinutes)
            .enabled(true)
            .build();
    }
}
