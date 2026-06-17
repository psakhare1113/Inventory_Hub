package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.PackDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PackDetailRepository extends JpaRepository<PackDetail, Long> {

    /** Find pack detail by pick list ID */
    Optional<PackDetail> findByPickListId(Long pickListId);

    /** Find pack detail by order number */
    Optional<PackDetail> findByOrderNumber(String orderNumber);

    /** All pack details for a specific packer */
    List<PackDetail> findByPackedById(Long packedById);

    /** Check if pack detail already exists for a pick list */
    boolean existsByPickListId(Long pickListId);
}
