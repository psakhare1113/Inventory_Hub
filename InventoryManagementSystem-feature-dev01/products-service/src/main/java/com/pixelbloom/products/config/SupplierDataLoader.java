package com.pixelbloom.products.config;

import com.pixelbloom.products.model.Supplier;
import com.pixelbloom.products.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class SupplierDataLoader implements CommandLineRunner {

    private final SupplierRepository supplierRepository;

    @Override
    public void run(String... args) {
        long count = supplierRepository.count();
        log.info("Current supplier count in database: {}", count);
        
        if (count == 0) {
            log.info("No suppliers found. Loading sample data...");
            loadSampleSuppliers();
            log.info("Sample suppliers loaded successfully!");
        } else {
            log.info("Suppliers already exist in database. Skipping data load.");
        }
    }

    private void loadSampleSuppliers() {
        // Create sample suppliers
        createSupplier("Rajesh Kumar", "rajesh@samsung.com", "9876543210", 
            "Samsung India Electronics Pvt Ltd", "Rajesh Kumar", "Electronics Park, Sector 18", 
            "Noida", "Uttar Pradesh", "201301", "09AABCS1234F1Z5", "Electronics", 4.8);
        
        createSupplier("Priya Mehta", "priya@godrej.com", "9876543211", 
            "Godrej Interio Ltd", "Priya Mehta", "Godrej Complex, Vikhroli", 
            "Mumbai", "Maharashtra", "400079", "27AABCG5678K1Z3", "Furniture", 4.6);
        
        createSupplier("Amit Sharma", "amit@lg.com", "9876543212", 
            "LG Electronics India Pvt Ltd", "Amit Sharma", "LG Campus, Greater Noida", 
            "Greater Noida", "Uttar Pradesh", "201306", "09AABCL9012M1Z7", "Electronics", 4.7);
        
        createSupplier("Sunita Joshi", "sunita@navneet.com", "9876543213", 
            "Navneet Publications India Ltd", "Sunita Joshi", "Navneet Bhavan, Dadar", 
            "Mumbai", "Maharashtra", "400028", "27AABCN3456P1Z9", "Books", 4.5);
        
        createSupplier("Vikram Patel", "vikram@hul.com", "9876543214", 
            "Hindustan Unilever Ltd", "Vikram Patel", "HUL House, Andheri", 
            "Mumbai", "Maharashtra", "400053", "27AABCH7890Q1Z1", "FMCG", 4.9);
    }

    private void createSupplier(String name, String email, String phone, String company,
                               String contactPerson, String address, String city, String state,
                               String pincode, String gstNumber, String category, Double rating) {
        Supplier supplier = new Supplier();
        supplier.setName(name);
        supplier.setEmail(email);
        supplier.setPhone(phone);
        supplier.setCompany(company);
        supplier.setContactPerson(contactPerson);
        supplier.setAddress(address);
        supplier.setCity(city);
        supplier.setState(state);
        supplier.setPincode(pincode);
        supplier.setGstNumber(gstNumber);
        supplier.setStatus(Supplier.SupplierStatus.ACTIVE);
        supplier.setCategory(category);
        supplier.setRating(rating);
        supplier.setTotalOrders(0);
        supplier.setTotalPurchaseValue(0.0);
        supplier.setCreatedAt(LocalDateTime.now());
        supplier.setUpdatedAt(LocalDateTime.now());
        
        supplierRepository.save(supplier);
        log.info("Created supplier: {} - {}", name, company);
    }
}
