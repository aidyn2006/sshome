package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.AuditLog;
import org.example.sshome.entity.User;
import org.example.sshome.exception.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.*;

/**
 * AI Chat proxy service.
 * Supports OpenAI (GPT) and Anthropic (Claude) backends.
 * Injects live system context into each request.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private final OverviewService overviewService;
    private final DeviceService   deviceService;
    private final AuditService    auditService;

    @Value("${ai.provider:openai}")      private String provider;
    @Value("${ai.openai.api-key:}")      private String openaiKey;
    @Value("${ai.openai.model:gpt-4o-mini}") private String openaiModel;
    @Value("${ai.anthropic.api-key:}")   private String anthropicKey;
    @Value("${ai.anthropic.model:claude-haiku-4-5-20251001}") private String anthropicModel;
    @Value("${ai.openai.max-tokens:1024}")  private int maxTokens;

    private final WebClient webClient = WebClient.builder()
        .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
        .build();

    // --- Public API ------------------------------------------------------

    public String chat(String userMessage, User actor, String ip) {
        String systemPrompt = buildSystemPrompt();
        String reply;

        try {
            reply = "openai".equalsIgnoreCase(provider)
                ? callOpenAi(systemPrompt, userMessage)
                : callAnthropic(systemPrompt, userMessage);
        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI chat error: {}", e.getMessage(), e);
            throw new AiServiceException("AI service unavailable: " + e.getMessage());
        }

        auditService.log(AuditLog.Action.AI_QUERY, "AI_CHAT", null, actor, ip,
            Map.of("provider", provider, "queryLength", userMessage.length(),
                   "replyLength", reply.length()));

        return reply;
    }

    // --- System Prompt ---------------------------------------------------

    private String buildSystemPrompt() {
        Map<String, Object> kpi = overviewService.getKpi();
        Map<String, Object> summary = deviceService.getSummary();

        return """
            You are SSHome Assistant - an AI for the SSHome IoT monitoring platform.

            ## Current System State
            - Total devices: %s | Online: %s | Offline: %s
            - Alerts today: %s | Alerts this week: %s
            - System status: %s

            ## Your capabilities
            - Analyze device status and sensor readings
            - Explain alerts and recommend actions
            - Provide insights on system performance
            - Help with device configuration and troubleshooting

            ## Guidelines
            - Be concise and technical
            - Provide actionable recommendations
            - When referencing devices, use their names/IDs
            - Highlight critical issues clearly
            - Format responses with markdown when helpful

            Answer in the same language as the user's question.
            """.formatted(
                kpi.get("total"),   kpi.get("active"),
                kpi.get("inactive"), kpi.get("alertsDay"),
                kpi.get("alertsWeek"), kpi.get("status")
            );
    }

    // --- OpenAI ----------------------------------------------------------

    private String callOpenAi(String systemPrompt, String userMessage) {
        if (openaiKey == null || openaiKey.isBlank()) {
            return fallbackResponse(userMessage);
        }

        Map<String, Object> body = Map.of(
            "model", openaiModel,
            "max_tokens", maxTokens,
            "messages", List.of(
                Map.of("role", "system",  "content", systemPrompt),
                Map.of("role", "user",    "content", userMessage)
            )
        );

        try {
            Map<?, ?> response = webClient.post()
                .uri("https://api.openai.com/v1/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openaiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(30))
                .block();

            return extractOpenAiContent(response);
        } catch (WebClientResponseException e) {
            log.error("OpenAI API error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceException("OpenAI error: " + e.getStatusCode());
        }
    }

    @SuppressWarnings("unchecked")
    private String extractOpenAiContent(Map<?, ?> response) {
        if (response == null) throw new AiServiceException("Empty response from OpenAI");
        List<?> choices = (List<?>) response.get("choices");
        if (choices == null || choices.isEmpty()) throw new AiServiceException("No choices in response");
        Map<?, ?> choice  = (Map<?, ?>) choices.get(0);
        Map<?, ?> message = (Map<?, ?>) choice.get("message");
        return (String) message.get("content");
    }

    // --- Anthropic --------------------------------------------------------

    private String callAnthropic(String systemPrompt, String userMessage) {
        if (anthropicKey == null || anthropicKey.isBlank()) {
            return fallbackResponse(userMessage);
        }

        Map<String, Object> body = Map.of(
            "model", anthropicModel,
            "max_tokens", maxTokens,
            "system", systemPrompt,
            "messages", List.of(Map.of("role", "user", "content", userMessage))
        );

        try {
            Map<?, ?> response = webClient.post()
                .uri("https://api.anthropic.com/v1/messages")
                .header("x-api-key", anthropicKey)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(30))
                .block();

            return extractAnthropicContent(response);
        } catch (WebClientResponseException e) {
            log.error("Anthropic API error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceException("Anthropic error: " + e.getStatusCode());
        }
    }

    @SuppressWarnings("unchecked")
    private String extractAnthropicContent(Map<?, ?> response) {
        if (response == null) throw new AiServiceException("Empty response from Anthropic");
        List<?> content = (List<?>) response.get("content");
        if (content == null || content.isEmpty()) throw new AiServiceException("No content in response");
        Map<?, ?> first = (Map<?, ?>) content.get(0);
        return (String) first.get("text");
    }

    // --- Fallback ---------------------------------------------------------

    private String fallbackResponse(String question) {
        Map<String, Object> kpi = overviewService.getKpi();
        return """
            **AI Service is not configured.**

            Based on current system data:
            - 📡 Total devices: **%s** (Online: **%s**, Offline: **%s**)
            - 🔔 Alerts today: **%s**
            - System status: **%s**

            *To enable AI responses, configure OPENAI_API_KEY or ANTHROPIC_API_KEY.*
            """.formatted(
                kpi.get("total"), kpi.get("active"),
                kpi.get("inactive"), kpi.get("alertsDay"),
                kpi.get("status")
            );
    }
}
