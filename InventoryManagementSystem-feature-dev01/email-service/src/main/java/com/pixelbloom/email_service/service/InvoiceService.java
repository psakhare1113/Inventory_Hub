package com.pixelbloom.email_service.service;


import com.pixelbloom.email_service.model.InvoiceEvent;

public interface InvoiceService {
    void generateAndSendInvoice(InvoiceEvent event);
}