package com.pixelbloom.orders.exception;

import feign.Response;
import feign.codec.ErrorDecoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
public class CustomFeignErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {

        int status = response.status();
        String body = readBody(response);

        switch (status) {

            case 400:
                // Inventory insufficient stock — surface the real message
                if (body.contains("Insufficient stock") || body.contains("INSUFFICIENT_INVENTORY")) {
                    return new InventoryReservationException(extractMessage(body));
                }
                return new DownstreamServiceException(
                        body.isEmpty() ? "Bad request to downstream service" : extractMessage(body),
                        status
                );

            case 401:
                return new DownstreamServiceException(
                        "Unauthorized to downstream service",
                        status
                );

            case 403:
                return new DownstreamServiceException(
                        "Access denied by downstream service",
                        status
                );

            case 404:
                return new DownstreamServiceException(
                        body.isEmpty() ? "Resource not found in downstream service" : extractMessage(body),
                        status
                );

            case 500:
                return new DownstreamServiceException(
                        body.isEmpty() ? "Downstream service failure" : extractMessage(body),
                        status
                );

            default:
                return new DownstreamServiceException(
                        body.isEmpty() ? "Unexpected downstream error" : extractMessage(body),
                        status
                );
        }
    }

    private String readBody(Response response) {
        try {
            if (response.body() != null) {
                try (InputStream is = response.body().asInputStream()) {
                    return new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        } catch (IOException e) {
            // ignore
        }
        return "";
    }

    /**
     * Extract "message" field from JSON body, or return raw body if not JSON.
     */
    private String extractMessage(String body) {
        try {
            int idx = body.indexOf("\"message\"");
            if (idx >= 0) {
                int colon = body.indexOf(":", idx);
                int start = body.indexOf("\"", colon + 1) + 1;
                int end = body.indexOf("\"", start);
                if (start > 0 && end > start) {
                    return body.substring(start, end);
                }
            }
        } catch (Exception ignored) {
        }
        return body;
    }
}
