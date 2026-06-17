CREATE TABLE user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_token VARCHAR(255),
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    session_duration_minutes BIGINT,
    
    INDEX idx_user_id (user_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_login_time (login_time),
    INDEX idx_last_activity (last_activity),
    INDEX idx_is_active (is_active)
);