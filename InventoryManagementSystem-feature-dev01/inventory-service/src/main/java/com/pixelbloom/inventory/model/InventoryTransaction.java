package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.ReturnStatus;
import com.pixelbloom.inventory.enums.TransactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_transaction")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "buy_price")
    private BigDecimal buyPrice;

    @Column(name = "sell_price")
    private BigDecimal sellPrice;

    private BigDecimal profit;
    private int quantity;


    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    private String orderId;

    private Long returnId;

    private Long productId;
    private Long categoryId;
    private Long subcategoryId;



    @Enumerated(EnumType.STRING)
    private TransactionType transactionType;




   private Long inventoryId;
    private LocalDateTime createdAt;
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.transactionDate == null) {
            this.transactionDate = this.createdAt;
        }
    }

    @Enumerated(EnumType.STRING)
    private ReturnStatus returnStatus;

    private String returnReference;  // Track return by reference



    private LocalDateTime updatedAt;
    /* =====================
       Static Factory Method InventoryTransaction Factory Method entity should own the creation logic
       ===================== */

    public static InventoryTransaction sale(
            Inventory inventory,
            String orderId,
            int quantity
    ) {
        InventoryTransaction tx = new InventoryTransaction();

        tx.setInventoryId(inventory.getId());
        tx.setOrderId(orderId);
        tx.setProductId(inventory.getProductId());
        tx.setCategoryId(inventory.getCategoryId());
        tx.setSubcategoryId(inventory.getSubcategoryId());

        tx.setQuantity(quantity);
        tx.setBuyPrice(inventory.getBuyPrice());
        tx.setSellPrice(inventory.getSellingPrice());

        BigDecimal profit =
                inventory.getSellingPrice()
                        .subtract(inventory.getBuyPrice())
                        .multiply(BigDecimal.valueOf(quantity));

        tx.setProfit(profit);

        tx.setTransactionType(TransactionType.SALE);
        tx.setTransactionDate(LocalDateTime.now());
        tx.setCreatedAt(LocalDateTime.now());

        return tx;
    }
}