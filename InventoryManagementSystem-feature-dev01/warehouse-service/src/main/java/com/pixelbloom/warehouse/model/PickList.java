package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Pick List — created when Admin marks order as PROCESSING.
 * PICKER sees this in their dashboard and picks items from warehouse bins.
 */
@Entity
@Table(name = "pick_lists")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PickList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String orderNumber;

    @Column(nullable = false)
    private String status; // PENDING, IN_PROGRESS, COMPLETED

    private Long customerId;
    private Long warehouseId;
    private String assignedTo; // picker username (legacy)

    // Manager Assignment — Option 2
    private Long assignedPickerId;   // WarehouseStaff.id with role PICKER
    private String assignedPickerName; // display name
    private String assignedPickerEmail; // email — for dashboard lookup
    private Long assignedPackerId;   // WarehouseStaff.id with role PACKER
    private String assignedPackerName; // display name
    private String assignedPackerEmail; // email — for dashboard lookup
    private Long assignedShippingId;   // WarehouseStaff.id with role SHIPPING
    private String assignedShippingName; // display name
    private String assignedShippingEmail; // email — for dashboard lookup
    private LocalDateTime assignedAt; // when manager assigned

    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "pickList", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("pickList")  // ← circular reference fix
    private List<PickListLine> lines;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }
}
