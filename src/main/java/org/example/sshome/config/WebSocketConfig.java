package org.example.sshome.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${spring.websocket.allowed-origins:*}")
    private String[] allowedOrigins;

    /**
     * Configure STOMP message broker.
     *
     * <p>Clients connect to:
     *   ws://host/ws              (SockJS fallback)
     *   ws://host/ws-native       (raw WebSocket)
     *
     * <p>Topics:
     *   /topic/monitoring/{deviceId}  - real-time sensor readings per device
     *   /topic/monitoring/all         - all sensor readings
     *   /topic/alerts                 - new alert events
     *   /topic/devices/status         - device status changes
     *
     * <p>Client sends to:
     *   /app/sensor/ingest            - push sensor reading (device clients)
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory simple broker for topics
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages handled by @MessageMapping
        registry.setApplicationDestinationPrefixes("/app");
        // User-specific queues: /user/{userId}/queue/...
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS endpoint (browser fallback)
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns(allowedOrigins)
            .withSockJS();

        // Native WebSocket endpoint (native apps, Flutter)
        registry.addEndpoint("/ws-native")
            .setAllowedOriginPatterns(allowedOrigins);
    }
}
