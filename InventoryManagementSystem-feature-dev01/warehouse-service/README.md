# Warehouse Management Service

## Overview
Comprehensive Warehouse Management System (WMS) microservice implementing SRS requirements for:
- **Purchase Orders & GRN** (FR-20 to FR-33)
- **Warehouse Location Management** (FR-40 to FR-42)
- **Inventory Transfers** (FR-80)
- **Cycle Counting** (FR-100 to FR-101)

## Features Implemented

### 1. Purchase Order Management (FR-20 to FR-23)
- ✅ Create, approve, and cancel purchase orders
- ✅ PO lifecycle: DRAFT → APPROVED → RECEIVING → CLOSED/CANCELLED
- ✅ Partial receipt tracking
- ✅ Supplier linkage
- ✅ Line-level tracking with pricing

### 2. Goods Receipt Note (GRN) (FR-30 to FR-33)
- ✅ Create GRN from PO
- ✅ Lot/batch number tracking
- ✅ Expiration date management
- ✅ Quality inspection workflow
- ✅ Putaway location suggestion
- ✅ Manual putaway override
- ✅ Condition tracking (GOOD, DAMAGED, DEFECTIVE)

### 3. Warehouse Location Management (FR-40 to FR-42)
- ✅ Location hierarchy: Warehouse → Area → Aisle → Bay → Level → Bin
- ✅ Capacity management (max capacity, current capacity)
- ✅ Location types (RECEIVING, STORAGE, PICKING, PACKING, SHIPPING, etc.)
- ✅ Preferred product mapping
- ✅ Constraints (weight, height, temperature, hazmat)
- ✅ Availability tracking

### 4. Inventory Transfers (FR-80)
- ✅ Inter-warehouse transfers
- ✅ Intra-warehouse transfers
- ✅ Location-to-location transfers
- ✅ Transfer lifecycle: REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → COMPLETED
- ✅ Approval workflow
- ✅ Line-level tracking

### 5. Cycle Counting (FR-100 to FR-101)
- ✅ Schedule cycle counts
- ✅ Count types: FULL, LOCATION, PRODUCT, ABC_CLASS
- ✅ Variance detection and calculation
- ✅ Approval workflow
- ✅ Adjustment creation
- ✅ Recount support

## Technology Stack
- **Framework**: Spring Boot 3.5.5
- **Java**: 21
- **Database**: MySQL 8.x
- **ORM**: Spring Data JPA / Hibernate
- **Service Discovery**: Eureka Client
- **API Documentation**: Springdoc OpenAPI 3
- **Validation**: Jakarta Validation
- **Monitoring**: Actuator + Prometheus
- **Tracing**: Zipkin

## Database Schema

### Core Tables
1. **purchase_orders** - PO header
2. **purchase_order_lines** - PO line items
3. **goods_receipt_notes** - GRN header
4. **grn_lines** - GRN line items with lot/batch tracking
5. **warehouse_locations** - Location hierarchy and capacity
6. **inventory_transfers** - Transfer header
7. **transfer_lines** - Transfer line items
8. **cycle_counts** - Cycle count header
9. **cycle_count_lines** - Count results with variances

## API Endpoints

### Purchase Orders
```
POST   /api/warehouse/purchase-orders          - Create PO
PUT    /api/warehouse/purchase-orders/{id}/approve - Approve PO
PUT    /api/warehouse/purchase-orders/{id}/cancel  - Cancel PO
GET    /api/warehouse/purchase-orders/{id}     - Get PO by ID
GET    /api/warehouse/purchase-orders/status/{status} - Get POs by status
GET    /api/warehouse/purchase-orders/supplier/{id}   - Get POs by supplier
```

### Goods Receipt Notes
```
POST   /api/warehouse/grn                      - Create GRN
PUT    /api/warehouse/grn/{id}/inspect         - Complete inspection
PUT    /api/warehouse/grn/{id}/putaway/{lineId} - Complete putaway
GET    /api/warehouse/grn/{id}                 - Get GRN by ID
GET    /api/warehouse/grn/pending-putaway      - Get pending putaway GRNs
```

### Inventory Transfers
```
POST   /api/warehouse/transfers                - Create transfer
PUT    /api/warehouse/transfers/{id}/approve   - Approve transfer
PUT    /api/warehouse/transfers/{id}/pick      - Mark as picked
PUT    /api/warehouse/transfers/{id}/receive   - Receive transfer
PUT    /api/warehouse/transfers/{id}/complete  - Complete transfer
PUT    /api/warehouse/transfers/{id}/cancel    - Cancel transfer
GET    /api/warehouse/transfers/{id}           - Get transfer by ID
GET    /api/warehouse/transfers/warehouse/{id} - Get transfers by warehouse
```

### Cycle Counts
```
POST   /api/warehouse/cycle-counts             - Schedule cycle count
PUT    /api/warehouse/cycle-counts/{id}/start  - Start cycle count
POST   /api/warehouse/cycle-counts/record      - Record count results
PUT    /api/warehouse/cycle-counts/{id}/approve - Approve cycle count
PUT    /api/warehouse/cycle-counts/{id}/reject  - Reject cycle count
GET    /api/warehouse/cycle-counts/{id}        - Get cycle count by ID
GET    /api/warehouse/cycle-counts/due         - Get due cycle counts
```

## Configuration

### application.properties
```properties
# Service Configuration
spring.application.name=warehouse-service
server.port=8087

# Database
spring.datasource.url=jdbc:mysql://localhost:3306/warehouse_db
spring.datasource.username=root
spring.datasource.password=root

# Eureka
eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

## Running the Service

### Prerequisites
- Java 21
- MySQL 8.x
- Eureka Server running on port 8761

### Build
```bash
cd InventoryManagementSystem-feature-dev01/warehouse-service
mvn clean install
```

### Run
```bash
mvn spring-boot:run
```

### Docker Build
```bash
mvn clean compile jib:dockerBuild
```

## API Documentation
Once running, access Swagger UI at:
```
http://localhost:8087/swagger-ui.html
```

## Integration with Other Services

### Products Service
- Fetch product details for PO/GRN creation
- Validate product IDs

### Inventory Service
- Update inventory on GRN completion
- Create adjustment transactions from cycle counts
- Update inventory on transfers

### Suppliers (Products Service)
- Fetch supplier details for PO creation
- Track supplier performance

## Business Workflows

### 1. Purchase Order to Receipt Flow
```
1. Create PO (DRAFT)
2. Approve PO (APPROVED)
3. Create GRN when goods arrive (PENDING)
4. Inspect goods (INSPECTED)
5. Putaway to locations (PUTAWAY/COMPLETED)
6. PO status updates to RECEIVING/CLOSED
```

### 2. Cycle Count Flow
```
1. Schedule cycle count (SCHEDULED)
2. Start count (IN_PROGRESS)
3. Record physical counts (COMPLETED)
4. Review variances
5. Approve and create adjustments (APPROVED)
   OR Reject for recount (REJECTED)
```

### 3. Transfer Flow
```
1. Create transfer request (REQUESTED)
2. Approve transfer (APPROVED)
3. Pick items (IN_TRANSIT)
4. Receive at destination (RECEIVED)
5. Update inventory (COMPLETED)
```

## Future Enhancements
- [ ] Barcode scanning integration
- [ ] Mobile app for warehouse operations
- [ ] Advanced putaway strategies (ABC classification, velocity-based)
- [ ] Wave picking optimization
- [ ] Real-time location tracking
- [ ] Integration with 3PL systems
- [ ] Automated reorder point alerts
- [ ] Warehouse capacity analytics dashboard

## SRS Compliance
This service implements the following SRS requirements:
- ✅ FR-20 to FR-23: Purchase Orders
- ✅ FR-30 to FR-33: Receiving & Putaway
- ✅ FR-40 to FR-42: Warehouse Locations
- ✅ FR-80: Inventory Transfers
- ✅ FR-100 to FR-101: Cycle Counting

## License
Proprietary - PixelBloom Technologies

## Contact
For support, contact: support@pixelbloom.com
