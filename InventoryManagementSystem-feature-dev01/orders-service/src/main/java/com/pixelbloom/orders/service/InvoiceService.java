package com.pixelbloom.orders.service;

import com.pixelbloom.orders.event.InvoiceEvent;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;

import java.util.List;

public interface InvoiceService {

    InvoiceEvent publishInvoiceEvent(Order order, List<OrderItem> items);
}
