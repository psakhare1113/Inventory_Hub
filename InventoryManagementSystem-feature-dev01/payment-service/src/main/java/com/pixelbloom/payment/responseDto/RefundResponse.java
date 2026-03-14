package com.pixelbloom.payment.responseDto;
import com.pixelbloom.payment.constants.RefundStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponse {

    private String orderNumber;

   private BigDecimal refundAmount;

    private String currency;

    private RefundStatus status;

    private String message;

    private LocalDateTime refundedAt;

    private String transactionId;

    private String paymentSource;

      public RefundResponse(boolean b, String orderNumber, String alreadyRefunded) {
        this.orderNumber=orderNumber;
        this.message=alreadyRefunded;
    }

    public RefundResponse(String orderNumber, BigDecimal refundAmount, String currency, RefundStatus status, String transactionId,String paymentSource, LocalDateTime refundedAt, String s) {
        this.orderNumber=orderNumber;
        this.refundAmount=refundAmount;
        this.currency=currency;
        this.status=status;
        this.transactionId=transactionId;
        this.paymentSource=paymentSource;
        this.refundedAt=refundedAt;
        this.message=s;
    }
}