package org.example.sshome.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OverviewKpiResponse {
    private int totalDevices;
    private int activeDevices;
    private int inactiveDevices;
    private int alertsDay;
    private int alertsWeek;
    private String status; // online | degraded | offline
}
