package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.example.sshome.entity.Role;
import org.example.sshome.entity.User;
import org.example.sshome.exception.ResourceNotFoundException;
import org.example.sshome.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Settings", description = "User management and system configuration")
@SecurityRequirement(name = "bearerAuth")
public class SettingsController {

    private final UserRepository    userRepository;
    private final PasswordEncoder   passwordEncoder;

    // --- User Management --------------------------------------------------

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "List all users (paginated)")
    public ResponseEntity<Page<UserResponse>> listUsers(
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<UserResponse> result = userRepository
            .findAll(PageRequest.of(page, size))
            .map(UserResponse::from);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "Create a new user")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
        if (userRepository.existsByEmail(req.email().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        User user = User.builder()
            .email(req.email().toLowerCase())
            .password(passwordEncoder.encode(req.password()))
            .fullName(req.fullName())
            .phone(req.phone())
            .role(req.role() != null ? req.role() : Role.VIEWER)
            .active(true)
            .build();
        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "Update user (role, fullName, phone, active)")
    public ResponseEntity<UserResponse> updateUser(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateUserRequest req,
        @AuthenticationPrincipal User actor
    ) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));

        // Prevent SUPERADMIN from demoting themselves
        if (actor.getId().equals(id) && req.role() != null && req.role() != actor.getRole()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (req.fullName() != null) user.setFullName(req.fullName());
        if (req.phone()    != null) user.setPhone(req.phone());
        if (req.role()     != null) user.setRole(req.role());
        if (req.active()   != null) user.setActive(req.active());
        if (req.password() != null && !req.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.password()));
        }

        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Delete a user (SUPERADMIN only)")
    public ResponseEntity<Void> deleteUser(
        @PathVariable UUID id,
        @AuthenticationPrincipal User actor
    ) {
        if (actor.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // can't delete self
        }
        userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- Profile (self-service) --------------------------------------------

    @GetMapping("/profile")
    @Operation(summary = "Get current user's profile")
    public ResponseEntity<UserResponse> getProfile(@AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(UserResponse.from(actor));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update current user's own profile")
    public ResponseEntity<UserResponse> updateProfile(
        @Valid @RequestBody ProfileUpdateRequest req,
        @AuthenticationPrincipal User actor
    ) {
        if (req.fullName() != null) actor.setFullName(req.fullName());
        if (req.phone()    != null) actor.setPhone(req.phone());
        if (req.password() != null && !req.password().isBlank()) {
            actor.setPassword(passwordEncoder.encode(req.password()));
        }
        userRepository.save(actor);
        return ResponseEntity.ok(UserResponse.from(actor));
    }

    // --- System Info ------------------------------------------------------

    @GetMapping("/system")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @Operation(summary = "Get system configuration info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        return ResponseEntity.ok(Map.of(
            "version",     "1.0.0",
            "javaVersion", System.getProperty("java.version"),
            "uptime",      java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime(),
            "timestamp",   Instant.now()
        ));
    }

    // --- DTOs -------------------------------------------------------------

    record UserResponse(
        UUID    id,
        String  email,
        String  fullName,
        String  phone,
        Role    role,
        boolean active,
        Instant lastLoginAt,
        Instant createdAt
    ) {
        static UserResponse from(User u) {
            return new UserResponse(
                u.getId(), u.getEmail(), u.getFullName(), u.getPhone(),
                u.getRole(), u.isActive(), u.getLastLoginAt(), u.getCreatedAt()
            );
        }
    }

    record CreateUserRequest(
        @NotBlank @Email              String email,
        @NotBlank @Size(min = 8)      String password,
        String fullName,
        String phone,
        Role   role
    ) {}

    record UpdateUserRequest(
        String  fullName,
        String  phone,
        Role    role,
        Boolean active,
        String  password
    ) {}

    record ProfileUpdateRequest(
        String fullName,
        String phone,
        @Size(min = 8) String password
    ) {}
}
