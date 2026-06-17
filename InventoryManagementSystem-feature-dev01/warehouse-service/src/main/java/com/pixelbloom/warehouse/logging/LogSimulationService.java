package com.pixelbloom.warehouse.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.UUID;

/**
 * LogSimulationService - STEP 3: Generate Different Types of Logs
 *
 * Simulates real-world scenarios:
 * - INFO  → normal operations
 * - WARN  → slow response / high latency
 * - ERROR → DB failure, API timeout, memory spike
 *
 * Logs are written in JSON format (via logback-spring.xml)
 * Filebeat picks them up → Logstash processes → Elasticsearch stores → Kibana shows
 */
@Service
public class LogSimulationService {

    private static final Logger log = LoggerFactory.getLogger(LogSimulationService.class);
    private static final Logger perfLog = LoggerFactory.getLogger("PERFORMANCE");
    private static final Logger dbLog = LoggerFactory.getLogger("DATABASE");
    private static final Logger apiLog = LoggerFactory.getLogger("API");

    private final Random random = new Random();

    // ── Scenario 1: Normal INFO logs (every 30 seconds) ──────────────────
    @Scheduled(fixedDelay = 30_000)
    public void simulateNormalOperations() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "NORMAL");

        try {
            log.info("Warehouse health check passed | status=UP | service=warehouse-service");
            log.info("Purchase order processed successfully | poId=PO-{} | items={} | totalValue={}",
                    random.nextInt(9999), random.nextInt(50) + 1, random.nextInt(50000) + 1000);
            log.info("Inventory stock level checked | sku=SKU-{} | quantity={} | location=RACK-{}",
                    random.nextInt(999), random.nextInt(500), random.nextInt(50));
            log.info("GRN created successfully | grnId=GRN-{} | supplier=SUP-{} | receivedItems={}",
                    random.nextInt(9999), random.nextInt(99), random.nextInt(100));
        } finally {
            MDC.clear();
        }
    }

    // ── Scenario 2: High Latency WARN logs (every 45 seconds) ────────────
    @Scheduled(fixedDelay = 45_000, initialDelay = 10_000)
    public void simulateHighLatency() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "HIGH_LATENCY");

        try {
            // Simulate actual delay
            int latencyMs = 2000 + random.nextInt(3000); // 2-5 seconds
            long start = System.currentTimeMillis();

            Thread.sleep(latencyMs); // Simulate slow operation

            long actual = System.currentTimeMillis() - start;
            MDC.put("latencyMs", String.valueOf(actual));

            if (actual > 3000) {
                perfLog.warn("SLOW RESPONSE DETECTED | endpoint=/api/warehouse/purchase-orders | latencyMs={} | threshold=3000ms | action=investigate",
                        actual);
            } else {
                perfLog.warn("Response time degraded | endpoint=/api/warehouse/inventory | latencyMs={} | threshold=2000ms",
                        actual);
            }

            perfLog.warn("Database query slow | query=findAllPurchaseOrders | latencyMs={} | rowsScanned={}",
                    actual, random.nextInt(10000));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Latency simulation interrupted", e);
        } finally {
            MDC.clear();
        }
    }

    // ── Scenario 3: DB Failure ERROR logs (every 60 seconds) ─────────────
    @Scheduled(fixedDelay = 60_000, initialDelay = 20_000)
    public void simulateDbFailure() {
        // Only simulate 30% of the time (realistic)
        if (random.nextInt(10) > 2) return;

        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "DB_FAILURE");
        MDC.put("errorType", "DATABASE_CONNECTION_ERROR");

        try {
            dbLog.error("DATABASE CONNECTION FAILED | host=localhost:3306 | db=warehouse_db | error=Connection refused | retryAttempt=1");
            dbLog.error("Failed to acquire connection from pool | poolSize=10 | activeConnections=10 | pendingRequests=5 | action=circuit-breaker-triggered");
            dbLog.warn("Falling back to cached data | cacheAge=120s | endpoint=/api/warehouse/locations");
            dbLog.error("Transaction rollback | txId=TX-{} | reason=DB_UNAVAILABLE | affectedTables=purchase_orders,grn_items",
                    random.nextInt(9999));
        } finally {
            MDC.clear();
        }
    }

    // ── Scenario 4: API Timeout ERROR logs (every 50 seconds) ────────────
    @Scheduled(fixedDelay = 50_000, initialDelay = 15_000)
    public void simulateApiTimeout() {
        // Only simulate 25% of the time
        if (random.nextInt(10) > 1) return;

        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "API_TIMEOUT");
        MDC.put("errorType", "FEIGN_TIMEOUT");

        try {
            apiLog.error("API TIMEOUT | service=products-service | endpoint=/api/products/{} | timeoutMs=5000 | action=fallback",
                    random.nextInt(999));
            apiLog.error("Feign client timeout | client=ProductClient | method=getProductById | connectTimeout=5000ms | readTimeout=5000ms");
            apiLog.warn("Retry attempt failed | service=inventory-service | attempt=3/3 | lastError=ReadTimeoutException");
            apiLog.error("Circuit breaker OPEN | service=orders-service | failureRate=60% | threshold=50% | waitDuration=30s");
        } finally {
            MDC.clear();
        }
    }

    // ── Scenario 5: Memory Spike WARN/ERROR logs (every 90 seconds) ──────
    @Scheduled(fixedDelay = 90_000, initialDelay = 30_000)
    public void simulateMemorySpike() {
        // Only simulate 20% of the time
        if (random.nextInt(10) > 1) return;

        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "MEMORY_SPIKE");

        try {
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
            long maxMemory = runtime.maxMemory() / (1024 * 1024);
            double usagePercent = (double) usedMemory / maxMemory * 100;

            if (usagePercent > 70) {
                perfLog.error("MEMORY SPIKE DETECTED | usedMB={} | maxMB={} | usagePercent={:.1f}% | threshold=70% | action=gc-triggered",
                        usedMemory, maxMemory, usagePercent);
            } else {
                perfLog.warn("Memory usage elevated | usedMB={} | maxMB={} | usagePercent={:.1f}%",
                        usedMemory, maxMemory, usagePercent);
            }

            perfLog.warn("Large object allocation detected | operation=bulkInventoryExport | estimatedSizeMB={} | recommendation=use-pagination",
                    random.nextInt(200) + 50);

        } finally {
            MDC.clear();
        }
    }

    // ── Scenario 6: Mixed realistic business logs (every 20 seconds) ─────
    @Scheduled(fixedDelay = 20_000, initialDelay = 5_000)
    public void simulateBusinessLogs() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);

        try {
            int scenario = random.nextInt(5);
            switch (scenario) {
                case 0 -> {
                    MDC.put("scenario", "NORMAL");
                    log.info("Pick list assigned | pickListId=PL-{} | assignedTo=picker-{} | items={} | priority=NORMAL",
                            random.nextInt(9999), random.nextInt(20), random.nextInt(30));
                }
                case 1 -> {
                    MDC.put("scenario", "NORMAL");
                    log.info("Stock replenishment triggered | sku=SKU-{} | currentQty={} | reorderPoint={} | orderQty={}",
                            random.nextInt(999), random.nextInt(10), 20, 100);
                }
                case 2 -> {
                    MDC.put("scenario", "HIGH_LATENCY");
                    MDC.put("latencyMs", String.valueOf(1500 + random.nextInt(1000)));
                    perfLog.warn("Slow inventory sync | syncType=FULL_SYNC | recordsProcessed={} | latencyMs={}",
                            random.nextInt(5000), 1500 + random.nextInt(1000));
                }
                case 3 -> {
                    MDC.put("scenario", "NORMAL");
                    log.info("Cycle count completed | locationId=LOC-{} | countedItems={} | discrepancies={} | accuracy={}%",
                            random.nextInt(99), random.nextInt(100), random.nextInt(5),
                            95 + random.nextInt(5));
                }
                case 4 -> {
                    MDC.put("scenario", "NORMAL");
                    log.info("Putaway task completed | grnId=GRN-{} | itemsPlaced={} | location=RACK-{}-{}",
                            random.nextInt(9999), random.nextInt(50), random.nextInt(10), random.nextInt(10));
                }
            }
        } finally {
            MDC.clear();
        }
    }
}
