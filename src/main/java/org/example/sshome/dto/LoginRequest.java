package org.example.sshome.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LoginRequest {
    @Email
    @NotBlank
    String email;

    @NotBlank
    String password;
}
