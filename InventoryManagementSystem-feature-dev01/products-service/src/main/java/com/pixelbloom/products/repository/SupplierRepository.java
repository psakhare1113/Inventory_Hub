package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findByEmail(String email);

    List<Supplier> findByStatus(Supplier.SupplierStatus status);

    List<Supplier> findByCategory(String category);

    @Query("SELECT s FROM Supplier s WHERE s.name LIKE %:query% OR s.company LIKE %:query% OR s.email LIKE %:query%")
    List<Supplier> searchSuppliers(String query);

    @Query("SELECT COUNT(s) FROM Supplier s WHERE s.status = 'ACTIVE'")
    Long countActiveSuppliers();

    @Query("SELECT SUM(s.totalPurchaseValue) FROM Supplier s")
    Double getTotalPurchaseValue();
}
