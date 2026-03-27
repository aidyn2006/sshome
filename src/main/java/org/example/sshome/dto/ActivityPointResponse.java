package org.example.sshome.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ActivityPointResponse {
    private String time; // HH:mm:ss
    private double value;
}
