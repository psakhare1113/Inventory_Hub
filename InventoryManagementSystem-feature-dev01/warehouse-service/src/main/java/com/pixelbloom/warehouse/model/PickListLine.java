package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * One line per product in a pick list.
 * Picker confirms each line after picking from bin.
 */
@Entity
@Table(name = "pick_list_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PickListLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pick_list_id", nullable = false)
    @JsonIgnoreProperties("lines")  // ← circular reference fix
    @com.fasterxml.jackson.annotation.JsonIgnore          // ← don't serialize back-ref in line responses
    private PickList pickList;

    @Column(nullable = false)
    private Long productId;

    private String productName;
    private String barcode;
    private Integer quantity;
    private String locationCode; // bin location e.g. A-01-BIN01
    private Long locationId;

    private Boolean confirmed;
    private LocalDateTime confirmedAt;

    @PrePersist
    void onCreate() {
        if (this.confirmed == null) this.confirmed = false;
        if (this.quantity == null) this.quantity = 1;
    }
}
