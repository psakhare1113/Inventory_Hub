package com.pixelbloom.orders.repository;


import com.pixelbloom.orders.model.CustomerDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;

@Repository
public interface CustomerDetailsRepository extends JpaRepository<CustomerDetails, Long> {
    //List<CustomerDetails> findByCustomerId(Long customerId);

    CustomerDetails findBycustomerId(Long customerId);
// findByCustomerId(Long customerId);
}
