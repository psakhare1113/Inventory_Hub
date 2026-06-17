package com.pixelbloom.warehouse.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * LogSimulationController
 *
 * REST endpoints to manually trigger log scenarios for testing/demo.
 * Use these to generate your ELK dataset quickly.
 *
 * Endpoints:
 *   POST /api/warehouse/logs/simulate/info
 *   POST /api/warehouse/logs/simulate/warn
 *   POST /api/warehouse/logs/simulate/error
 *   POST /api/warehouse/logs/simulate/high-latency
 *   POST /api/warehouse/logs/simulate/db-failure
 *   POST /api/warehouse/logs/simulate/api-timeout
 *   POST /api/warehouse/logs/simulate/memory-spike
 *   POST /api/warehouse/logs/simulate/all   ← triggers all scenarios
 */
@RestController
@RequestMapping("/api/warehouse/logs/simulate")
public class LogSimulationController {

    private static final Logger log = LoggerFactory.getLogger(LogSimulationController.class);
    private final LogSimulationService simulationService;

    public LogSimulationController(LogSimulationService simulationService) {
        this.simulationService = simulationService;
    }

    // ── INFO: Normal operations ───────────────────────────────────────────
    @PostMapping("/info")
    public ResponseEntity<Map<String, String>> triggerInfoLogs() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "NORMAL");

        try {
            log.info("Manual INFO simulation triggered | traceId={}", traceId);
            simulationService.simulateNormalOperations();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "INFO - Normal Operations",
                    "traceId", traceId,
                    "message", "INFO logs generated. Check Kibana: http://localhost:5601"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── WARN: Slow response / High latency ───────────────────────────────
    @PostMapping("/warn")
    public ResponseEntity<Map<String, String>> triggerWarnLogs() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "HIGH_LATENCY");

        try {
            log.warn("Manual WARN simulation triggered | traceId={}", traceId);
            simulationService.simulateHighLatency();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "WARN - High Latency",
                    "traceId", traceId,
                    "message", "WARN logs generated with simulated latency"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── ERROR: General error ──────────────────────────────────────────────
    @PostMapping("/error")
    public ResponseEntity<Map<String, String>> triggerErrorLogs() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        MDC.put("scenario", "GENERAL_ERROR");
        MDC.put("errorType", "SIMULATED_ERROR");

        try {
            log.error("Manual ERROR simulation triggered | traceId={}", traceId);
            log.error("Simulated application error | component=WarehouseService | operation=processOrder | errorCode=500");
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "ERROR - General Error",
                    "traceId", traceId,
                    "message", "ERROR logs generated"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── DB Failure ────────────────────────────────────────────────────────
    @PostMapping("/db-failure")
    public ResponseEntity<Map<String, String>> triggerDbFailure() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);

        try {
            log.info("Triggering DB failure simulation | traceId={}", traceId);
            simulationService.simulateDbFailure();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "ERROR - DB Failure",
                    "traceId", traceId,
                    "message", "DB failure logs generated"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── API Timeout ───────────────────────────────────────────────────────
    @PostMapping("/api-timeout")
    public ResponseEntity<Map<String, String>> triggerApiTimeout() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);

        try {
            log.info("Triggering API timeout simulation | traceId={}", traceId);
            simulationService.simulateApiTimeout();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "ERROR - API Timeout",
                    "traceId", traceId,
                    "message", "API timeout logs generated"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── Memory Spike ──────────────────────────────────────────────────────
    @PostMapping("/memory-spike")
    public ResponseEntity<Map<String, String>> triggerMemorySpike() {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);

        try {
            log.info("Triggering memory spike simulation | traceId={}", traceId);
            simulationService.simulateMemorySpike();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scenario", "WARN/ERROR - Memory Spike",
                    "traceId", traceId,
                    "message", "Memory spike logs generated"
            ));
        } finally {
            MDC.clear();
        }
    }

    // ── ALL Scenarios at once ─────────────────────────────────────────────
    @PostMapping("/all")
    public ResponseEntity<Map<String, Object>> triggerAllScenarios() {
        String batchId = UUID.randomUUID().toString().substring(0, 8);
        log.info("Triggering ALL log scenarios | batchId={}", batchId);

        simulationService.simulateNormalOperations();
        simulationService.simulateDbFailure();
        simulationService.simulateApiTimeout();
        simulationService.simulateMemorySpike();
        simulationService.simulateBusinessLogs();

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "batchId", batchId,
                "scenariosTriggered", new String[]{
                        "INFO - Normal Operations",
                        "ERROR - DB Failure",
                        "ERROR - API Timeout",
                        "WARN - Memory Spike",
                        "MIXED - Business Logs"
                },
                "kibanaUrl", "http://localhost:5601",
                "elasticsearchUrl", "http://localhost:9200",
                "indexPattern", "inventory-hub-warehouse-service-*"
        ));
    }

    // ── Status: Check ELK connectivity info ──────────────────────────────
    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "service", "warehouse-service",
                "loggingStatus", "active",
                "logFormat", "JSON (Logstash encoder)",
                "logPath", "../logs/warehouse-service/application.log",
                "kibana", "http://localhost:5601",
                "elasticsearch", "http://localhost:9200",
                "indexPattern", "inventory-hub-warehouse-service-*",
                "availableScenarios", "info, warn, error, db-failure, api-timeout, memory-spike, all"
        ));
    }
}
