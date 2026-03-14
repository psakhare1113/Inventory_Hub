package com.pixelbloom.orders.service;

import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.model.ReturnRequest;
import com.pixelbloom.orders.requestEntity.OrderPhysicalVerificationRequest;
import com.pixelbloom.orders.requestEntity.RefundRequest;
import com.pixelbloom.orders.responseEntity.ReturnResponse;

public interface ReturnService {
    ReturnResponse requestReturn(ReturnRequest returnRequest);

    ReturnResponse initiateReturn(ReturnRequest request);

    ReturnResponse initiatePhysicalVerification(OrderPhysicalVerificationRequest request);


}
