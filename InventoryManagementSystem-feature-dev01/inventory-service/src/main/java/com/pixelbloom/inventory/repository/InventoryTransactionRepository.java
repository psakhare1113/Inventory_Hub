package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.enums.ReturnStatus;
import com.pixelbloom.inventory.enums.TransactionType;
import com.pixelbloom.inventory.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InventoryTransactionRepository  extends JpaRepository<InventoryTransaction, Long> {
    // ===================== DAILY SALES ANALYTICS =====================

    @Query(
            value = """
    SELECT 
        DATE(transaction_date),
        SUM(sell_price * quantity),
        SUM(buy_price * quantity),
        SUM(profit)
    FROM inventory_transaction
    WHERE transaction_type = :type
    GROUP BY DATE(transaction_date)
    ORDER BY DATE(transaction_date)
    """,
            nativeQuery = true
    )
    List<Object[]> getDailySales(@Param("type") String type);
    @Query(
            value = """
    SELECT 
        DATE(transaction_date)            AS txnDate,
        SUM(sell_price * quantity)        AS totalSales,
        SUM(buy_price * quantity)         AS totalCost,
        SUM(profit)                       AS totalProfit
    FROM inventory_transaction
    WHERE transaction_type = :type
      AND transaction_date >= :fromDate
      AND transaction_date < DATE_ADD(:toDate, INTERVAL 1 DAY)
    GROUP BY DATE(transaction_date)
    ORDER BY DATE(transaction_date)
    """,
            nativeQuery = true
    )
    List<Object[]> getSalesByDate(@Param("type")String type, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

   // void updateStatusByOrderNumberAndBarcode(String orderNumber, String barcode, TransactionType transactionType);

    @Modifying
    @Query("UPDATE InventoryTransaction it SET it.transactionType = :status WHERE it.orderId = :orderNumber")
    int updateStatusByOrderNumber(@Param("orderNumber") String orderNumber,
                                  @Param("status") TransactionType status);

    @Modifying
    @Query("UPDATE InventoryTransaction it SET it.transactionType = :status WHERE it.inventoryId = :inventoryId")
    int updateStatusByInventoryId(@Param("inventoryId") Long inventoryId,
                                  @Param("status") TransactionType status);

    @Modifying
    @Query("UPDATE InventoryTransaction t SET t.returnStatus = :returnStatus, t.returnId = :returnId, t.updatedAt = CURRENT_TIMESTAMP WHERE t.inventoryId = :inventoryId")
    void updateReturnStatusByInventoryId(@Param("inventoryId") Long inventoryId, @Param("returnStatus") ReturnStatus returnStatus, @Param("returnId") Long returnId);


    @Modifying
    @Query("UPDATE InventoryTransaction t SET t.returnReference = :returnReference, t.updatedAt = CURRENT_TIMESTAMP WHERE t.inventoryId = :inventoryId")
    void updateReturnReferenceByInventoryId(@Param("inventoryId") Long inventoryId, @Param("returnReference") String returnReference);

    List<InventoryTransaction> findByOrderIdAndInventoryId(String orderId, Long inventoryId);


}

