package org.example.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.example.backend.dto.AuthResponse;
import org.example.backend.dto.LoginRequest;
import org.example.backend.dto.RegisterRequest;
import org.example.backend.entity.AuditLog;
import org.example.backend.service.AuditService;
import org.example.backend.service.AuthService;
import org.example.backend.service.RateLimitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimitService rateLimitService;
    private final AuditService auditService;

    public AuthController(AuthService authService,
                          RateLimitService rateLimitService,
                          AuditService auditService) {
        this.authService = authService;
        this.rateLimitService = rateLimitService;
        this.auditService = auditService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        if (!rateLimitService.tryRegisterConsume(resolveIp(httpRequest))) {
            auditService.log(request.getEmail(), AuditLog.AuditAction.RATE_LIMIT_EXCEEDED,
                    httpRequest, "Register rate limit exceeded");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many registration attempts. Please try again later."));
        }

        AuthResponse response = authService.register(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        if (!rateLimitService.tryLoginConsume(resolveIp(httpRequest))) {
            auditService.log(request.getEmail(), AuditLog.AuditAction.RATE_LIMIT_EXCEEDED,
                    httpRequest, "Login rate limit exceeded");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts. Please try again in 1 minute."));
        }

        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    private String resolveIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
