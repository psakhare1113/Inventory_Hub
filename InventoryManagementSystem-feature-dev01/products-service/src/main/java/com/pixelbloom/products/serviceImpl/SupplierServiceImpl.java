package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.Supplier;
import com.pixelbloom.products.repository.SupplierRepository;
import com.pixelbloom.products.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public Supplier createSupplier(Supplier supplier) {
        if (supplierRepository.findByEmail(supplier.getEmail()).isPresent()) {
            throw new RuntimeException("Supplier with email " + supplier.getEmail() + " already exists");
        }
        return supplierRepository.save(supplier);
    }

    @Override
    public Supplier updateSupplier(Long id, Supplier updatedSupplier) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));

        existing.setName(updatedSupplier.getName());
        existing.setEmail(updatedSupplier.getEmail());
        existing.setPhone(updatedSupplier.getPhone());
        existing.setCompany(updatedSupplier.getCompany());
        existing.setContactPerson(updatedSupplier.getContactPerson());
        existing.setAddress(updatedSupplier.getAddress());
        existing.setCity(updatedSupplier.getCity());
        existing.setState(updatedSupplier.getState());
        existing.setPincode(updatedSupplier.getPincode());
        existing.setGstNumber(updatedSupplier.getGstNumber());
        existing.setStatus(updatedSupplier.getStatus());
        existing.setCategory(updatedSupplier.getCategory());
        existing.setRating(updatedSupplier.getRating());

        return supplierRepository.save(existing);
    }

    @Override
    public void deleteSupplier(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new RuntimeException("Supplier not found with id: " + id);
        }
        supplierRepository.deleteById(id);
    }

    @Override
    public Supplier getSupplierById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
    }

    @Override
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    @Override
    public List<Supplier> getActiveSuppliers() {
        return supplierRepository.findByStatus(Supplier.SupplierStatus.ACTIVE);
    }

    @Override
    public List<Supplier> searchSuppliers(String query) {
        return supplierRepository.searchSuppliers(query);
    }

    @Override
    public Supplier updateStatus(Long id, Supplier.SupplierStatus status) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        supplier.setStatus(status);
        return supplierRepository.save(supplier);
    }

    @Override
    public Map<String, Object> getSupplierStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSuppliers", supplierRepository.count());
        stats.put("activeSuppliers", supplierRepository.countActiveSuppliers());
        stats.put("totalPurchaseValue", supplierRepository.getTotalPurchaseValue());
        return stats;
    }
}
