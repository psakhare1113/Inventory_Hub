-- Run this in MySQL if warehouse-service hasn't been restarted yet
-- This creates the picker_status table manually

USE warehouse_db;

CREATE TABLE IF NOT EXISTS picker_status (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    staff_id        BIGINT       NOT NULL UNIQUE,
    staff_name      VARCHAR(255) NOT NULL,
    staff_email     VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'OFFLINE',
    role            VARCHAR(50)  NOT NULL,
    last_online_at  DATETIME,
    last_offline_at DATETIME,
    updated_at      DATETIME
);
