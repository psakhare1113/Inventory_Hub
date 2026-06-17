package com.pixelbloom.warehouse.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket + STOMP Configuration
 *
 * Topics:
 *   /topic/admin/notifications       ← All warehouse events for Admin
 *   /topic/warehouse/all             ← Broadcast to all warehouse staff
 *   /topic/warehouse/manager/{id}    ← Specific manager
 *   /topic/warehouse/picker/{id}     ← Specific picker
 *   /topic/warehouse/packer/{id}     ← Specific packer
 *   /topic/warehouse/shipping        ← Shipping staff
 *
 * Client → Server (send):
 *   /app/admin/message               ← Admin → Warehouse Manager
 *   /app/warehouse/message           ← Warehouse → Admin
 *   /app/staff/message               ← Staff → Manager
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory broker — /topic prefix for broadcast
        config.enableSimpleBroker("/topic");
        // Client sends messages to /app/... prefix
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // React dev server allow
                .withSockJS();                   // SockJS fallback for older browsers
    }
}
