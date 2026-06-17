package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.PaymentStatus;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.model.Refund;
import com.pixelbloom.orders.model.Return;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.repository.RefundRepository;
import com.pixelbloom.orders.repository.ReturnRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ReportsController {

    private final OrderRepository orderRepository;
    private final RefundRepository refundRepository;
    private final ReturnRepository returnRepository;
    private final OrderItemRepository orderItemRepository;

    /**
     * Main dashboard summary report
     */
    @GetMapping("/api/auth/admin/reports/summary")
    public ResponseEntity<Map<String, Object>> getSummaryReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        List<Order> orders = orderRepository.findAll();
        List<Refund> refunds = refundRepository.findAll();
        List<Return> returns = returnRepository.findAll();

        // Apply date filter if provided
        final List<Order> filteredOrders;
        if (from != null && to != null) {
            LocalDateTime fromDt = from.atStartOfDay();
            LocalDateTime toDt = to.atTime(23, 59, 59);
            filteredOrders = orders.stream()
                    .filter(o -> o.getCreatedAt() != null &&
                            !o.getCreatedAt().isBefore(fromDt) &&
                            !o.getCreatedAt().isAfter(toDt))
                    .collect(Collectors.toList());
        } else {
            filteredOrders = orders;
        }

        // Revenue calculation
        double totalRevenue = filteredOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .mapToDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0)
                .sum();

        double totalRefundAmount = refunds.stream()
                .mapToDouble(r -> r.getTotalRefundAmount() != null ? r.getTotalRefundAmount().doubleValue() : 0.0)
                .sum();

        // Order status breakdown
        Map<String, Long> ordersByStatus = filteredOrders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getOrderStatus() != null ? o.getOrderStatus().name() : "UNKNOWN",
                        Collectors.counting()
                ));

        // Payment status breakdown
        Map<String, Long> ordersByPayment = filteredOrders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getPaymentStatus() != null ? o.getPaymentStatus().name() : "UNKNOWN",
                        Collectors.counting()
                ));

        // Daily revenue trend (last 7 days)
        List<Map<String, Object>> dailyRevenue = getDailyRevenueTrend(filteredOrders);

        // Top customers by order count
        Map<Long, Long> customerOrderCount = filteredOrders.stream()
                .filter(o -> o.getCustomerId() != null)
                .collect(Collectors.groupingBy(Order::getCustomerId, Collectors.counting()));

        List<Map<String, Object>> topCustomers = customerOrderCount.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> c = new HashMap<>();
                    c.put("customerId", e.getKey());
                    c.put("orderCount", e.getValue());
                    double spent = filteredOrders.stream()
                            .filter(o -> e.getKey().equals(o.getCustomerId()))
                            .mapToDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0)
                            .sum();
                    c.put("totalSpent", spent);
                    return c;
                })
                .collect(Collectors.toList());

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalOrders", filteredOrders.size());
        summary.put("totalRevenue", totalRevenue);
        summary.put("totalRefunds", refunds.size());
        summary.put("totalRefundAmount", totalRefundAmount);
        summary.put("totalReturns", returns.size());
        summary.put("deliveredOrders", ordersByStatus.getOrDefault("DELIVERED", 0L));
        summary.put("pendingOrders", ordersByStatus.getOrDefault("CREATED", 0L) + ordersByStatus.getOrDefault("CONFIRMED", 0L));
        summary.put("cancelledOrders", ordersByStatus.getOrDefault("CANCELLED", 0L));
        summary.put("ordersByStatus", ordersByStatus);
        summary.put("ordersByPayment", ordersByPayment);
        summary.put("dailyRevenueTrend", dailyRevenue);
        summary.put("topCustomers", topCustomers);
        summary.put("netRevenue", totalRevenue - totalRefundAmount);
        summary.put("generatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(summary);
    }

    /**
     * Package / Shipment tracking report
     */
    @GetMapping("/api/auth/admin/reports/packages")
    public ResponseEntity<Map<String, Object>> getPackageReport() {
        List<Order> orders = orderRepository.findAll();

        // Package status breakdown (based on order status)
        Map<String, Long> packagesByStatus = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> mapOrderStatusToPackageStatus(o.getOrderStatus()),
                        Collectors.counting()
                ));

        // Recent shipments (SHIPPED + OUT_FOR_DELIVERY + DELIVERED)
        List<Map<String, Object>> recentShipments = orders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.SHIPPED ||
                        o.getOrderStatus() == OrderStatus.OUT_FOR_DELIVERY ||
                        o.getOrderStatus() == OrderStatus.DELIVERED)
                .sorted(Comparator.comparing(Order::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .map(this::mapOrderToPackage)
                .collect(Collectors.toList());

        // All packages for table view
        List<Map<String, Object>> allPackages = orders.stream()
                .filter(o -> o.getOrderStatus() != null &&
                        o.getOrderStatus() != OrderStatus.CREATED)
                .sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapOrderToPackage)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("packagesByStatus", packagesByStatus);
        result.put("recentShipments", recentShipments);
        result.put("allPackages", allPackages);
        result.put("totalPackages", allPackages.size());
        result.put("inTransit", packagesByStatus.getOrDefault("In Transit", 0L));
        result.put("delivered", packagesByStatus.getOrDefault("Delivered", 0L));
        result.put("pending", packagesByStatus.getOrDefault("Pending", 0L));
        result.put("generatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(result);
    }

    /**
     * Revenue report with date range
     */
    @GetMapping("/api/auth/admin/reports/revenue")
    public ResponseEntity<Map<String, Object>> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        List<Order> orders = orderRepository.findAll();

        final List<Order> filteredOrders;
        if (from != null && to != null) {
            LocalDateTime fromDt = from.atStartOfDay();
            LocalDateTime toDt = to.atTime(23, 59, 59);
            filteredOrders = orders.stream()
                    .filter(o -> o.getCreatedAt() != null &&
                            !o.getCreatedAt().isBefore(fromDt) &&
                            !o.getCreatedAt().isAfter(toDt))
                    .collect(Collectors.toList());
        } else {
            filteredOrders = orders;
        }

        List<Map<String, Object>> dailyRevenue = getDailyRevenueTrend(filteredOrders);

        // Monthly breakdown
        Map<String, Double> monthlyRevenue = filteredOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED && o.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        o -> o.getCreatedAt().getYear() + "-" + String.format("%02d", o.getCreatedAt().getMonthValue()),
                        Collectors.summingDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0)
                ));

        Map<String, Object> result = new HashMap<>();
        result.put("dailyRevenue", dailyRevenue);
        result.put("monthlyRevenue", monthlyRevenue);
        result.put("totalRevenue", filteredOrders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .mapToDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0).sum());

        return ResponseEntity.ok(result);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Top Selling Products
     *
     * GET /api/auth/admin/reports/top-products
     *   ?period=monthly   → current month
     *   ?period=yearly    → current year
     *   ?year=2025&month=4 → specific month (optional, used when period=monthly)
     *   ?year=2025         → specific year  (optional, used when period=yearly)
     *   ?limit=10          → how many top products to return (default 10)
     *
     * Returns list of:
     *   { productId, totalQuantity, totalRevenue, orderCount, period }
     */
    @GetMapping("/api/auth/admin/reports/top-products")
    public ResponseEntity<Map<String, Object>> getTopProducts(
            @RequestParam(defaultValue = "monthly") String period,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "10") int limit) {

        List<OrderItem> allItems = orderItemRepository.findAll();

        int targetYear  = year  != null ? year  : LocalDate.now().getYear();
        int targetMonth = month != null ? month : LocalDate.now().getMonthValue();

        // Filter by period
        List<OrderItem> filtered = allItems.stream()
                .filter(item -> item.getCreatedAt() != null)
                .filter(item -> {
                    int itemYear  = item.getCreatedAt().getYear();
                    int itemMonth = item.getCreatedAt().getMonthValue();
                    if ("yearly".equalsIgnoreCase(period)) {
                        return itemYear == targetYear;
                    } else {
                        // monthly (default)
                        return itemYear == targetYear && itemMonth == targetMonth;
                    }
                })
                .collect(Collectors.toList());

        // Group by productId → sum quantity + revenue + order count
        Map<Long, Map<String, Object>> grouped = new LinkedHashMap<>();
        for (OrderItem item : filtered) {
            if (item.getProductId() == null) continue;
            grouped.computeIfAbsent(item.getProductId(), pid -> {
                Map<String, Object> m = new HashMap<>();
                m.put("productId",     pid);
                m.put("totalQuantity", 0L);
                m.put("totalRevenue",  0.0);
                m.put("orderCount",    0L);
                return m;
            });
            Map<String, Object> entry = grouped.get(item.getProductId());
            entry.put("totalQuantity", (Long) entry.get("totalQuantity") + item.getQuantity());
            entry.put("totalRevenue",  (Double) entry.get("totalRevenue") +
                    (item.getTotalPrice() != null ? item.getTotalPrice().doubleValue() : 0.0));
            entry.put("orderCount",    (Long) entry.get("orderCount") + 1L);
        }

        // Sort by totalQuantity desc, take top N
        List<Map<String, Object>> topProducts = grouped.values().stream()
                .sorted(Comparator.comparingLong(m -> -((Long) m.get("totalQuantity"))))
                .limit(limit)
                .collect(Collectors.toList());

        // Add rank
        for (int i = 0; i < topProducts.size(); i++) {
            topProducts.get(i).put("rank", i + 1);
        }

        // Build monthly breakdown per product (for sparkline / trend)
        // Returns last 12 months of quantity per productId
        Map<Long, List<Map<String, Object>>> monthlyTrend = new LinkedHashMap<>();
        if ("yearly".equalsIgnoreCase(period)) {
            Set<Long> topIds = topProducts.stream()
                    .map(m -> (Long) m.get("productId"))
                    .collect(Collectors.toSet());

            for (Long pid : topIds) {
                Map<Integer, Long> byMonth = allItems.stream()
                        .filter(i -> pid.equals(i.getProductId()) && i.getCreatedAt() != null
                                && i.getCreatedAt().getYear() == targetYear)
                        .collect(Collectors.groupingBy(
                                i -> i.getCreatedAt().getMonthValue(),
                                Collectors.summingLong(item -> (long) item.getQuantity())
                        ));

                List<Map<String, Object>> trend = new ArrayList<>();
                for (int m = 1; m <= 12; m++) {
                    Map<String, Object> pt = new HashMap<>();
                    pt.put("month", m);
                    pt.put("quantity", byMonth.getOrDefault(m, 0L));
                    trend.add(pt);
                }
                monthlyTrend.put(pid, trend);
            }
        }

        String periodLabel = "yearly".equalsIgnoreCase(period)
                ? String.valueOf(targetYear)
                : targetYear + "-" + String.format("%02d", targetMonth);

        Map<String, Object> result = new HashMap<>();
        result.put("period",       period);
        result.put("periodLabel",  periodLabel);
        result.put("topProducts",  topProducts);
        result.put("totalItems",   filtered.size());
        result.put("monthlyTrend", monthlyTrend);
        result.put("generatedAt",  LocalDateTime.now().toString());

        return ResponseEntity.ok(result);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private List<Map<String, Object>> getDailyRevenueTrend(List<Order> orders) {
        Map<String, Double> dailyMap = new LinkedHashMap<>();

        // Initialize last 7 days
        for (int i = 6; i >= 0; i--) {
            String date = LocalDate.now().minusDays(i).toString();
            dailyMap.put(date, 0.0);
        }

        orders.stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED && o.getCreatedAt() != null)
                .forEach(o -> {
                    String date = o.getCreatedAt().toLocalDate().toString();
                    if (dailyMap.containsKey(date)) {
                        dailyMap.merge(date, o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0, Double::sum);
                    }
                });

        return dailyMap.entrySet().stream()
                .map(e -> {
                    Map<String, Object> d = new HashMap<>();
                    d.put("date", e.getKey());
                    d.put("revenue", e.getValue());
                    return d;
                })
                .collect(Collectors.toList());
    }

    private String mapOrderStatusToPackageStatus(OrderStatus status) {
        if (status == null) return "Pending";
        return switch (status) {
            case CREATED, CONFIRMED -> "Pending";
            case PROCESSING, PACKED -> "Processing";
            case SHIPPED, OUT_FOR_DELIVERY -> "In Transit";
            case DELIVERED -> "Delivered";
            case CANCELLED, FAILED -> "Cancelled";
            default -> "Other";
        };
    }

    private Map<String, Object> mapOrderToPackage(Order order) {
        Map<String, Object> pkg = new HashMap<>();
        pkg.put("id", order.getId());
        pkg.put("orderNumber", order.getOrderNumber());
        pkg.put("customerId", order.getCustomerId());
        pkg.put("status", mapOrderStatusToPackageStatus(order.getOrderStatus()));
        pkg.put("orderStatus", order.getOrderStatus() != null ? order.getOrderStatus().name() : "UNKNOWN");
        pkg.put("trackingNumber", order.getAwbNumber() != null ? order.getAwbNumber() : "TRK-" + order.getOrderNumber());
        pkg.put("courierPartner", order.getCourierPartner() != null ? order.getCourierPartner() : "Standard Delivery");
        pkg.put("destination", order.getWarehouseName() != null ? order.getWarehouseName() : "N/A");
        pkg.put("totalAmount", order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0);
        pkg.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
        pkg.put("updatedAt", order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null);
        pkg.put("paymentStatus", order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "UNKNOWN");
        return pkg;
    }
}
