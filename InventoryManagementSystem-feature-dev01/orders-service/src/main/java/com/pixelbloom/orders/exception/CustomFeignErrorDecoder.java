package com.pixelbloom.orders.exception;

import feign.Response;
import feign.codec.ErrorDecoder;
import org.springframework.stereotype.Component;

@Component
public class CustomFeignErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {

        int status = response.status();

        switch (status) {

            case 400:
                return new DownstreamServiceException(
                        "Bad request to downstream service",
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
                        "Resource not found in downstream service",
                        status
                );

            case 500:
                return new DownstreamServiceException(
                        "Downstream service failure",
                        status
                );

            default:
                return new DownstreamServiceException(
                        "Unexpected downstream error",
                        status
                );
        }
    }
}
