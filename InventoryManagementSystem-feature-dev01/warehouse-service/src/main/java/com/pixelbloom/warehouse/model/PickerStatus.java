package com.pixelbloom.warehouse.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * PickerStatus — Picker/Packer/Shipping staff ची live online status
 *
 * Delivery dashboard सारखं:
 *   ONLINE  → picker dashboard open आहे, active आहे
 *   OFFLINE → logout केलं किंवा 30 min पेक्षा जास्त inactive
 *   BUSY    → pick list IN_PROGRESS आहे
 *
 * Table: picker_status
 */
@Entity
@Table(name = "picker_status")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PickerStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long staffId;           // auth-service user ID

    @Column(nullable = false)
    private String staffName;       // "Rahul Patil"

    @Column
    private String staffEmail;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StaffOnlineStatus status = StaffOnlineStatus.OFFLINE;

    @Column(nullable = false)
    private String role;            // PICKER / PACKER / SHIPPING / WAREHOUSE_MANAGER

    @Column
    private LocalDateTime lastOnlineAt;   // last heartbeat / login time

    @Column
    private LocalDateTime lastOfflineAt;  // logout time

    @Column
    private LocalDateTime updatedAt;

    public enum StaffOnlineStatus {
        ONLINE, BUSY, OFFLINE
    }
}
