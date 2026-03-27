package org.example.sshome.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class DeviceSummaryResponse {
    private int total;
    private int online;
    private int offline;
    private int maintenance;
    private List<String> top;
}
