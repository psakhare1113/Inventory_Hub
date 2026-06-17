package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.OrderStatus;
import com.pixelbloom.inventory.enums.ReturnStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "inventory_returns",
        uniqueConstraints = @UniqueConstraint(columnNames = {"order_number", "barcode"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String returnReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", referencedColumnName = "id")
    private InventoryInspection inspection;

    @Column(nullable = false)
    private String barcode;
    
    @Column(nullable = false)
    private String orderNumber;
    
    @Column(nullable = false)
    private boolean approved;
    
    private String rejectionReason;
    private LocalDateTime inspectedAt;
    private String inspectedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnStatus status;

    private Long transactionId;

    // New fields
    private String returnReason;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean damageDeclared = false;
    
    private String damageReason;
    
    // Inspection details
    private String inspectorRemarks;  // Delivery boy's detailed notes
    private String itemCondition;     // GOOD, FAIR, DAMAGED

    @ElementCollection
    @CollectionTable(name = "inventory_return_images", joinColumns = @JoinColumn(name = "return_id"))
    @Column(name = "image_url")
    private List<String> images;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
