package org.example.sshome.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DeviceResponse {
    private String id;
    private String name;
    private boolean on;
}
