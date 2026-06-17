package com.pixelbloom.products.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class CorsConfig {
    // CORS is handled by API Gateway (port 9999) to avoid duplicate headers
    // Direct access to products-service (port 9094) should go through the gateway
    // If you need direct access, uncomment the WebMvcConfigurer implementation below
    
    /*
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
    */
}
