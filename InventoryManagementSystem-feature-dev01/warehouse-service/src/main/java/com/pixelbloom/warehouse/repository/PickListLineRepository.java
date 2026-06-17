package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.PickListLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PickListLineRepository extends JpaRepository<PickListLine, Long> {
    List<PickListLine> findByPickListId(Long pickListId);
}
