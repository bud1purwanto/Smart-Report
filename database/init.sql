-- Database Initialization for SMART REPORT
-- Database: ABAP_DB
-- Schema: smart_report

CREATE SCHEMA IF NOT EXISTS smart_report;

-- 1. SAP Server Profiles
CREATE TABLE IF NOT EXISTS smart_report.sap_server_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    sid VARCHAR(10) NOT NULL,
    host VARCHAR(255) NOT NULL,
    instance VARCHAR(10) NOT NULL DEFAULT '00',
    client VARCHAR(10) NOT NULL DEFAULT '100',
    username VARCHAR(100) NOT NULL,
    encrypted_password TEXT NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'development', -- development, qa, production, sandbox
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Saved Queries
CREATE TABLE IF NOT EXISTS smart_report.saved_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_json JSONB NOT NULL, -- tables, joins, selectedFields, filters, sort, options
    abap_sql_preview TEXT,
    created_by VARCHAR(100) DEFAULT 'abap_user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Report Variants (Layouts & Filter Configurations)
CREATE TABLE IF NOT EXISTS smart_report.report_variants (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES smart_report.saved_queries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    hidden_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    filter_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_columns JSONB NOT NULL DEFAULT '[]'::jsonb, -- formulas: e.g. [{"name": "TOTAL", "formula": "NETPR * MENGE"}]
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Report Schedules & Telegram Blast
CREATE TABLE IF NOT EXISTS smart_report.report_schedules (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES smart_report.saved_queries(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES smart_report.report_variants(id) ON DELETE SET NULL,
    server_id INTEGER REFERENCES smart_report.sap_server_profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 8 * * *',
    channel VARCHAR(50) NOT NULL DEFAULT 'telegram', -- telegram, email, etc.
    telegram_chat_id VARCHAR(100),
    telegram_bot_token VARCHAR(255),
    anonymize BOOLEAN NOT NULL DEFAULT TRUE,
    deduplicate BOOLEAN NOT NULL DEFAULT TRUE,
    export_format VARCHAR(20) NOT NULL DEFAULT 'xlsx',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(50),
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SAP Metadata Sync (Data Dictionary Cache)
CREATE TABLE IF NOT EXISTS smart_report.sap_metadata_sync (
    id SERIAL PRIMARY KEY,
    tablename VARCHAR(30) NOT NULL,
    fieldname VARCHAR(30) NOT NULL,
    keyflag VARCHAR(1) DEFAULT '',
    datatype VARCHAR(10),
    leng INTEGER DEFAULT 0,
    rollname VARCHAR(30),
    fieldtext VARCHAR(255),
    checktable VARCHAR(30),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_table_field UNIQUE (tablename, fieldname)
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_metadata_table ON smart_report.sap_metadata_sync(tablename);
CREATE INDEX IF NOT EXISTS idx_metadata_checktable ON smart_report.sap_metadata_sync(checktable);
CREATE INDEX IF NOT EXISTS idx_queries_name ON smart_report.saved_queries(name);
CREATE INDEX IF NOT EXISTS idx_variants_query ON smart_report.report_variants(query_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON smart_report.report_schedules(is_active);

