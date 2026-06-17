package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Supplier;

import java.util.List;
import java.util.Map;

public interface SupplierService {
    Supplier createSupplier(Supplier supplier);
    Supplier updateSupplier(Long id, Supplier supplier);
    void deleteSupplier(Long id);
    Supplier getSupplierById(Long id);
    List<Supplier> getAllSuppliers();
    List<Supplier> getActiveSuppliers();
    List<Supplier> searchSuppliers(String query);
    Supplier updateStatus(Long id, Supplier.SupplierStatus status);
    Map<String, Object> getSupplierStats();
}
