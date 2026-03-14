package com.pixelbloom.orders.service;

import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.requestEntity.RefundRequest;

public interface RefundService {
    RefundResponse refund(RefundRequest request);


}
