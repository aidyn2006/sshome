package org.example.sshome.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AlertItemResponse {
    private String title;
    private String time;
    private String level; // critical | warning | info
}
