package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.Supplier;
import com.pixelbloom.products.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    // ── Admin endpoints ──────────────────────────────────────────────────────

    @PostMapping("/api/auth/admin/suppliers")
    public ResponseEntity<Supplier> createSupplier(@RequestBody Supplier supplier) {
        return ResponseEntity.ok(supplierService.createSupplier(supplier));
    }

    @GetMapping("/api/auth/admin/suppliers")
    public ResponseEntity<List<Supplier>> getAllSuppliers() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }

    @GetMapping("/api/auth/admin/suppliers/active")
    public ResponseEntity<List<Supplier>> getActiveSuppliers() {
        return ResponseEntity.ok(supplierService.getActiveSuppliers());
    }

    @GetMapping("/api/auth/admin/suppliers/{id}")
    public ResponseEntity<Supplier> getSupplierById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getSupplierById(id));
    }

    @PutMapping("/api/auth/admin/suppliers/{id}")
    public ResponseEntity<Supplier> updateSupplier(@PathVariable Long id, @RequestBody Supplier supplier) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, supplier));
    }

    @DeleteMapping("/api/auth/admin/suppliers/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/auth/admin/suppliers/{id}/status")
    public ResponseEntity<Supplier> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        Supplier.SupplierStatus supplierStatus = Supplier.SupplierStatus.valueOf(status.toUpperCase());
        return ResponseEntity.ok(supplierService.updateStatus(id, supplierStatus));
    }

    @GetMapping("/api/auth/admin/suppliers/search")
    public ResponseEntity<List<Supplier>> searchSuppliers(@RequestParam String q) {
        return ResponseEntity.ok(supplierService.searchSuppliers(q));
    }

    @GetMapping("/api/auth/admin/suppliers/stats")
    public ResponseEntity<Map<String, Object>> getSupplierStats() {
        return ResponseEntity.ok(supplierService.getSupplierStats());
    }

    // ── Direct routes (for internal use) ────────────────────────────────────

    @GetMapping("/api/suppliers")
    @CrossOrigin(origins = "*")  // Allow all origins for public endpoint
    public ResponseEntity<List<Supplier>> getAllSuppliersPublic() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }
}
