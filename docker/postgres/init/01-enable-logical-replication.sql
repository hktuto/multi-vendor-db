-- Enable logical replication for Electric SQL
-- This script runs when PostgreSQL container starts for the first time

-- Create replication slot (Electric will use this)
SELECT pg_create_logical_replication_slot('electric_replication_slot', 'pgoutput');

-- Create electric user (optional, can use postgres for dev)
-- CREATE USER electric WITH REPLICATION LOGIN PASSWORD 'electric';

-- Grant necessary permissions
-- GRANT ALL PRIVILEGES ON DATABASE multi_vendor TO electric;

-- Note: Electric SQL requires:
-- 1. wal_level = logical (set in postgresql.conf)
-- 2. max_replication_slots >= 1
-- 3. max_wal_senders >= 1
-- These are configured via command line in docker-compose
