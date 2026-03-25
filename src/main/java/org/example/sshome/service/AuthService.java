package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.dto.AuthResponse;
import org.example.sshome.dto.LoginRequest;
import org.example.sshome.dto.RegisterRequest;
import org.example.sshome.entity.Role;
import org.example.sshome.entity.User;
import org.example.sshome.exception.AccountLockedException;
import org.example.sshome.repository.UserRepository;
import org.example.sshome.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();
        userRepository.save(user);
        log.info("User registered: {}", email);
        return AuthResponse.builder()
                .token(jwtService.generateToken(user))
                .build();
    }

    public AuthResponse login(LoginRequest request, String sourceIp) {
        String email = request.getEmail().toLowerCase();
        if (loginAttemptService.isBlocked(email)) {
            long waitMs = loginAttemptService.remainingLockMillis(email);
            throw new AccountLockedException("Account locked. Retry in " + (waitMs / 1000) + " seconds");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
            User user = (User) authentication.getPrincipal();
            loginAttemptService.recordSuccess(email);
            log.info("Authentication success for {} from {}", email, sourceIp);
            return AuthResponse.builder()
                    .token(jwtService.generateToken(user))
                    .build();
        } catch (BadCredentialsException ex) {
            loginAttemptService.recordFailure(email);
            log.warn("Authentication failed for {} from {}", email, sourceIp);
            throw ex;
        }
    }
}
