package com.pixelbloom.payment.responseDto;

import lombok.Data;

@Data
public class GatewayResponse {

    private boolean success;
    private String gatewayTxnId;
}
