package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.example.sshome.entity.User;
import org.example.sshome.service.AiChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Chat", description = "AI assistant for system queries")
@SecurityRequirement(name = "bearerAuth")
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * POST /api/ai/chat
     * Sends a message to the AI assistant.
     * Rate-limited by the global rate limiter (100 req/min per IP).
     */
    @PostMapping("/chat")
    @Operation(summary = "Send a message to the AI system assistant")
    public ResponseEntity<Map<String, Object>> chat(
        @Valid @RequestBody ChatRequest req,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        String reply = aiChatService.chat(req.message(), actor, http.getRemoteAddr());

        return ResponseEntity.ok(Map.of(
            "reply",    reply,
            "provider", "ai",
            "timestamp", Instant.now()
        ));
    }

    record ChatRequest(
        @NotBlank(message = "Message cannot be blank")
        @Size(max = 4096, message = "Message too long (max 4096 chars)")
        String message
    ) {}
}
