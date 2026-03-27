-- =============================================================================
-- SSHome Production Database Schema  (PostgreSQL 16)
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM types ──────────────────────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('VIEWER', 'OPERATOR', 'ADMIN', 'SUPERADMIN');
CREATE TYPE device_type     AS ENUM ('TEMPERATURE','HUMIDITY','CAMERA','MOTION','LOCK','GATEWAY','SMOKE','ENERGY','FLOOD','AIR_QUALITY','THERMOSTAT','OTHER');
CREATE TYPE device_status   AS ENUM ('ONLINE','OFFLINE','WARNING','MAINTENANCE');
CREATE TYPE alert_severity  AS ENUM ('CRITICAL','WARNING','INFO');
CREATE TYPE alert_status    AS ENUM ('ACTIVE','ACKNOWLEDGED','RESOLVED');
CREATE TYPE node_status     AS ENUM ('ONLINE','OFFLINE','DEGRADED');
CREATE TYPE audit_action    AS ENUM ('CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','AI_QUERY');

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    full_name       VARCHAR(255),
    phone           VARCHAR(64),
    role            user_role     NOT NULL DEFAULT 'VIEWER',
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    mfa_enabled     BOOLEAN       NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(64),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (LOWER(email));

-- =============================================================================
-- REFRESH TOKENS
-- =============================================================================
CREATE TABLE refresh_tokens (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           VARCHAR(512)  NOT NULL UNIQUE,
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMPTZ   NOT NULL,
    revoked         BOOLEAN       NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(512),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token) WHERE NOT revoked;

-- =============================================================================
-- EDGE NODES  (Gateways)
-- =============================================================================
CREATE TABLE edge_nodes (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id         VARCHAR(64)   NOT NULL UNIQUE,
    name            VARCHAR(255)  NOT NULL,
    location        VARCHAR(255),
    ip_address      VARCHAR(128),
    firmware        VARCHAR(64),
    status          node_status   NOT NULL DEFAULT 'OFFLINE',
    cpu_load        DOUBLE PRECISION DEFAULT 0,
    mem_load        DOUBLE PRECISION DEFAULT 0,
    latency_ms      DOUBLE PRECISION DEFAULT 0,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DEVICES
-- =============================================================================
CREATE TABLE devices (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id           VARCHAR(64)   NOT NULL UNIQUE,
    name                VARCHAR(255)  NOT NULL,
    type                device_type   NOT NULL DEFAULT 'OTHER',
    status              device_status NOT NULL DEFAULT 'OFFLINE',
    location            VARCHAR(255),
    firmware            VARCHAR(64),
    description         TEXT,
    -- Encryption: AES key stored RSA-encrypted
    data_encrypted      BOOLEAN       NOT NULL DEFAULT FALSE,
    encrypted_key_b64   TEXT,                              -- RSA-encrypted AES key
    -- Edge node association
    edge_node_id        UUID          REFERENCES edge_nodes(id) ON DELETE SET NULL,
    -- Ownership
    created_by_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
    -- Timestamps
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_status   ON devices (status);
CREATE INDEX idx_devices_type     ON devices (type);
CREATE INDEX idx_devices_location ON devices (location);
CREATE INDEX idx_devices_edge     ON devices (edge_node_id);

-- =============================================================================
-- SENSOR READINGS  (Time-series)
-- =============================================================================
CREATE TABLE sensor_readings (
    id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id   UUID             NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    channel     VARCHAR(64)      NOT NULL,    -- e.g. temperature, humidity, co2
    value       DOUBLE PRECISION NOT NULL,
    unit        VARCHAR(32),
    quality     VARCHAR(16)      DEFAULT 'GOOD',   -- GOOD | SUSPECT | BAD
    read_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Partial index on recent data for fast dashboard queries
CREATE INDEX idx_readings_device_time ON sensor_readings (device_id, read_at DESC);
CREATE INDEX idx_readings_channel     ON sensor_readings (channel, read_at DESC);

-- For PostgreSQL time-series partitioning (optional optimization):
-- PARTITION BY RANGE (read_at)  -- add monthly partitions in production

-- =============================================================================
-- ALERT RULES  (Threshold-based rules engine)
-- =============================================================================
CREATE TABLE alert_rules (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255)  NOT NULL,
    channel             VARCHAR(64)   NOT NULL,   -- sensor channel to watch
    device_type         device_type,              -- NULL = apply to all types
    operator            VARCHAR(8)    NOT NULL,   -- GT | LT | GTE | LTE | EQ | NEQ
    threshold           DOUBLE PRECISION NOT NULL,
    severity            alert_severity NOT NULL,
    message_template    TEXT          NOT NULL,
    cooldown_minutes    INTEGER       NOT NULL DEFAULT 5,
    enabled             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ALERTS
-- =============================================================================
CREATE TABLE alerts (
    id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id           UUID           REFERENCES devices(id) ON DELETE SET NULL,
    rule_id             UUID           REFERENCES alert_rules(id) ON DELETE SET NULL,
    severity            alert_severity NOT NULL,
    message             TEXT           NOT NULL,
    status              alert_status   NOT NULL DEFAULT 'ACTIVE',
    device_snapshot     JSONB,                   -- Device state at alert time
    sensor_value        DOUBLE PRECISION,
    acknowledged_by_id  UUID           REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at     TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status    ON alerts (status, severity);
CREATE INDEX idx_alerts_device    ON alerts (device_id, created_at DESC);
CREATE INDEX idx_alerts_created   ON alerts (created_at DESC);

-- =============================================================================
-- NOTIFICATION CHANNELS
-- =============================================================================
CREATE TABLE notification_channels (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(32)   NOT NULL,     -- EMAIL | TELEGRAM | WEBHOOK | SLACK
    config      JSONB         NOT NULL,     -- channel-specific config (encrypted endpoint)
    enabled     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notification_channels (user_id);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE audit_logs (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    action          audit_action  NOT NULL,
    entity_type     VARCHAR(64),
    entity_id       VARCHAR(255),
    user_id         UUID          REFERENCES users(id) ON DELETE SET NULL,
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(512),
    details         JSONB,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user       ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_entity     ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_action     ON audit_logs (action, created_at DESC);

-- Partition audit_logs by month in production for better query performance

-- =============================================================================
-- REPORTS (metadata for generated files)
-- =============================================================================
CREATE TABLE reports (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255)  NOT NULL,
    type            VARCHAR(64)   NOT NULL,     -- UPTIME | ALERTS | SENSORS | ACTIVITY | ENERGY
    format          VARCHAR(16)   NOT NULL,     -- PDF | XLSX
    period_from     TIMESTAMPTZ,
    period_to       TIMESTAMPTZ,
    file_path       TEXT,
    file_size_bytes BIGINT,
    generated_by_id UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports (generated_by_id, created_at DESC);

-- =============================================================================
-- SEED DATA (Admin user: admin@sshome.io / Admin1234!)
-- Password hashed with BCrypt strength=12
-- =============================================================================
INSERT INTO users (email, password_hash, full_name, role, active)
VALUES (
    'admin@sshome.io',
    '$2a$12$RV.bqyHUjl9bANIzYKP5GOiO.8KtBkU7WPbSzEaMCAmhJjJM0oA7e',
    'System Admin',
    'ADMIN',
    TRUE
);

-- =============================================================================
-- DEFAULT ALERT RULES
-- =============================================================================
INSERT INTO alert_rules (name, channel, operator, threshold, severity, message_template, cooldown_minutes)
VALUES
    ('High Temperature',    'temperature', 'GT',  30.0, 'WARNING',  'Temperature {value}°C exceeds threshold of 30°C on device {device}', 10),
    ('Critical Temperature','temperature', 'GT',  40.0, 'CRITICAL', 'CRITICAL: Temperature {value}°C is dangerously high on {device}', 5),
    ('Low Humidity',        'humidity',    'LT',  20.0, 'WARNING',  'Humidity {value}% is below minimum threshold on {device}', 15),
    ('High Humidity',       'humidity',    'GT',  80.0, 'WARNING',  'Humidity {value}% exceeds maximum threshold on {device}', 15),
    ('Poor Air Quality',    'aqi',         'GT', 100.0, 'WARNING',  'Air Quality Index {value} is unhealthy on {device}', 10),
    ('Dangerous CO2',       'co2',         'GT', 600.0, 'CRITICAL', 'CRITICAL: CO2 level {value}ppm is dangerous on {device}', 5),
    ('Low Battery',         'battery',     'LT',  15.0, 'WARNING',  'Device {device} battery at {value}%, please recharge', 120);
