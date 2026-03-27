package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.example.sshome.dto.AuthResponse;
import org.example.sshome.dto.LoginRequest;
import org.example.sshome.dto.RegisterRequest;
import org.example.sshome.entity.RefreshToken;
import org.example.sshome.entity.User;
import org.example.sshome.security.JwtService;
import org.example.sshome.service.AuditService;
import org.example.sshome.service.AuthService;
import org.example.sshome.service.RefreshTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, refresh and logout")
public class AuthController {

    private final AuthService        authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtService         jwtService;
    private final AuditService       auditService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user account")
    public ResponseEntity<AuthResponse> register(
        @RequestBody @Valid RegisterRequest request,
        HttpServletRequest http
    ) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login and receive access + refresh tokens")
    public ResponseEntity<Map<String, Object>> login(
        @RequestBody @Valid LoginRequest request,
        HttpServletRequest http
    ) {
        String ip = http.getRemoteAddr();
        AuthResponse accessToken = authService.login(request, ip);

        // Issue refresh token
        User user = authService.loadUserByEmail(request.email());
        RefreshToken refreshToken = refreshTokenService.create(user, ip, http.getHeader("User-Agent"));
        auditService.logLogin(user, ip);

        return ResponseEntity.ok(Map.of(
            "accessToken",  accessToken.token(),
            "refreshToken", refreshToken.getToken(),
            "tokenType",    "Bearer",
            "expiresIn",    3600
        ));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange refresh token for new access token")
    public ResponseEntity<Map<String, Object>> refresh(
        @RequestBody RefreshRequest req,
        HttpServletRequest http
    ) {
        RefreshToken refreshToken = refreshTokenService.validate(req.refreshToken());
        User user = refreshToken.getUser();

        // Rotate: revoke old, issue new
        refreshTokenService.revoke(req.refreshToken());
        RefreshToken newRefresh = refreshTokenService.create(user, http.getRemoteAddr(), http.getHeader("User-Agent"));
        String newAccess = jwtService.generateToken(user);

        return ResponseEntity.ok(Map.of(
            "accessToken",  newAccess,
            "refreshToken", newRefresh.getToken(),
            "tokenType",    "Bearer",
            "expiresIn",    3600
        ));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke refresh token and logout")
    public ResponseEntity<Void> logout(
        @RequestBody RefreshRequest req,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        refreshTokenService.revoke(req.refreshToken());
        if (actor != null) auditService.logLogout(actor, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    record RefreshRequest(@NotBlank String refreshToken) {}
}
