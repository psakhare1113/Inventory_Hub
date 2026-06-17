# ELK Stack Setup Guide - Inventory Hub
## Centralized Logging System

---

## Architecture

```
Spring Boot Services
  ├── api-gateway        (port 9999)
  ├── warehouse-service  (port 8088)  ← Log Simulation here
  ├── orders-service     (port 9091)
  ├── products-service   (port 9094)
  ├── auth-server        (port 2000)
  └── ...
        │
        │ writes JSON logs to
        ▼
  ../logs/<service-name>/application.log
        │
        │ Filebeat reads
        ▼
  Logstash (port 5044)
        │
        │ processes & sends
        ▼
  Elasticsearch (port 9200)
        │
        │ visualized by
        ▼
  Kibana (port 5601)
```

---

## Step 1: Prerequisites

- Docker Desktop installed and running
- Java services built with Maven

---

## Step 2: Start ELK Stack

```bat
cd monitoring
start-elk.bat
```

Or manually:
```bat
docker-compose -f docker-compose-elk.yml up -d
```

---

## Step 3: Setup Kibana Index Pattern

1. Open Kibana: http://localhost:5601
2. Go to **Stack Management** → **Index Patterns**
3. Click **Create index pattern**
4. Enter: `inventory-hub-*`
5. Select timestamp field: `@timestamp`
6. Click **Create index pattern**

---

## Step 4: Start Spring Boot Services

Start your services normally. Logs will automatically be written to:
```
InventoryManagementSystem-feature-dev01/
  logs/
    api-gateway/application.log
    warehouse-service/application.log
    orders-service/application.log
    products-service/application.log
    auth-server/application.log
```

---

## Step 5: Generate Test Logs (Simulate Scenarios)

### Option A: Automatic (Scheduled)
Warehouse service automatically generates logs every 20-90 seconds.

### Option B: Manual via REST API

```bash
# Trigger ALL scenarios at once
POST http://localhost:8088/api/warehouse/logs/simulate/all

# Individual scenarios:
POST http://localhost:8088/api/warehouse/logs/simulate/info
POST http://localhost:8088/api/warehouse/logs/simulate/warn
POST http://localhost:8088/api/warehouse/logs/simulate/error
POST http://localhost:8088/api/warehouse/logs/simulate/db-failure
POST http://localhost:8088/api/warehouse/logs/simulate/api-timeout
POST http://localhost:8088/api/warehouse/logs/simulate/memory-spike

# Check status
GET http://localhost:8088/api/warehouse/logs/simulate/status
```

---

## Step 6: View Logs in Kibana

1. Go to **Discover** in Kibana
2. Select index pattern: `inventory-hub-*`
3. Set time range: Last 1 hour

### Useful Filters:

| Filter | Value | Purpose |
|--------|-------|---------|
| `log_level` | `ERROR` | See all errors |
| `log_level` | `WARN` | See warnings |
| `service_name` | `warehouse-service` | Filter by service |
| `scenario` | `DB_FAILURE` | DB failure logs |
| `scenario` | `HIGH_LATENCY` | Slow response logs |
| `scenario` | `API_TIMEOUT` | Timeout logs |
| `scenario` | `MEMORY_SPIKE` | Memory issues |

---

## Log Scenarios Explained

| Scenario | Log Level | Trigger | Description |
|----------|-----------|---------|-------------|
| Normal Operations | INFO | Every 30s | PO processed, GRN created, stock checked |
| High Latency | WARN | Every 45s | Response > 2000ms |
| DB Failure | ERROR | 30% chance/60s | Connection refused, pool exhausted |
| API Timeout | ERROR | 25% chance/50s | Feign client timeout, circuit breaker |
| Memory Spike | WARN/ERROR | 20% chance/90s | JVM memory > 70% |
| Business Logs | MIXED | Every 20s | Pick list, cycle count, putaway |

---

## Elasticsearch Indices

Each service gets its own daily index:
```
inventory-hub-warehouse-service-2024.01.15
inventory-hub-orders-service-2024.01.15
inventory-hub-api-gateway-2024.01.15
...
```

Check indices:
```
GET http://localhost:9200/_cat/indices?v
```

---

## Troubleshooting

### Logs not appearing in Kibana?
1. Check Filebeat is running: `docker logs inventory-filebeat`
2. Check Logstash: `docker logs inventory-logstash`
3. Check Elasticsearch: `curl http://localhost:9200/_cluster/health`
4. Verify log files exist: `ls ../logs/warehouse-service/`

### Elasticsearch not starting?
- Increase Docker memory to at least 4GB
- Run: `wsl -d docker-desktop sysctl -w vm.max_map_count=262144`

---

## Stop ELK Stack

```bat
stop-elk.bat
```
Or:
```bat
docker-compose -f docker-compose-elk.yml down
```

To also delete data:
```bat
docker-compose -f docker-compose-elk.yml down -v
```
