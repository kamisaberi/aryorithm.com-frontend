-- ============================================================================
-- Aryorithm MySQL migration: Hub production blueprints + official appliances
-- ============================================================================
-- Adds the two tables required by:
--   * GET/POST/DELETE /api/v1/hub/blueprints
--   * GET/POST/DELETE /api/v1/hub/appliances
--
-- Safe to run on an existing database (CREATE TABLE IF NOT EXISTS). The
-- application also creates these tables automatically on startup via
-- SQLAlchemy Base.metadata.create_all(); this file is for DBAs who prefer to
-- pre-provision the schema or who manage MySQL through phpMyAdmin/cPanel.
--
-- Apply AFTER the base `users` table exists:
--   mysql -u USER -p DBNAME < migrations/2026_10_27_hub_blueprints_appliances.sql
-- Or: cPanel -> phpMyAdmin -> select database -> Import.
--
-- MySQL 8.0+ / MariaDB 10.6+; utf8mb4 required.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `hub_blueprints` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `version` VARCHAR(32) NOT NULL,
    `target_site` VARCHAR(255) NULL,
    `industry` VARCHAR(64) NOT NULL,
    `target_architecture` VARCHAR(32) NOT NULL,
    `description` TEXT NOT NULL,
    `primary_interface` VARCHAR(64) NOT NULL,
    `max_pipeline_latency_us` FLOAT NOT NULL,
    `dependencies_json` JSON NOT NULL,
    `hardware_binding_json` JSON NOT NULL,
    `sla_guarantees_json` JSON NOT NULL,
    `raw_dag_yaml` TEXT NOT NULL,
    `sha256` VARCHAR(64) NOT NULL,
    `author` VARCHAR(255) NOT NULL,
    `author_public_key` VARCHAR(128) NOT NULL,
    `signature` VARCHAR(256) NOT NULL,
    `owner_user_id` VARCHAR(36) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `verified_signature` BOOL NOT NULL DEFAULT 1,
    `is_yanked` BOOL NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ix_hub_blueprints_slug` (`slug`),
    KEY `ix_hub_blueprints_industry` (`industry`),
    KEY `ix_hub_blueprints_target_architecture` (`target_architecture`),
    KEY `ix_hub_blueprints_owner_user_id` (`owner_user_id`),
    KEY `ix_hub_blueprints_is_yanked` (`is_yanked`),
    CONSTRAINT `fk_hub_blueprints_owner_user`
        FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hub_appliance_releases` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `version` VARCHAR(32) NOT NULL,
    `architecture` VARCHAR(64) NOT NULL,
    `industry` VARCHAR(64) NOT NULL,
    `license_tier` VARCHAR(32) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL,
    `sha256_checksum` VARCHAR(64) NOT NULL,
    `authority_signature` VARCHAR(256) NOT NULL,
    `verified_health_checks` VARCHAR(16) NOT NULL DEFAULT '21/21',
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOL NOT NULL DEFAULT 1,
    `published_by` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ix_hub_appliance_releases_slug` (`slug`),
    KEY `ix_hub_appliance_releases_version` (`version`),
    KEY `ix_hub_appliance_releases_architecture` (`architecture`),
    KEY `ix_hub_appliance_releases_industry` (`industry`),
    KEY `ix_hub_appliance_releases_license_tier` (`license_tier`),
    KEY `ix_hub_appliance_releases_is_active` (`is_active`),
    KEY `ix_hub_appliance_releases_published_by` (`published_by`),
    CONSTRAINT `fk_hub_appliance_releases_published_by`
        FOREIGN KEY (`published_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quick post-migration verification:
-- SHOW TABLES LIKE 'hub_blueprints';
-- SHOW TABLES LIKE 'hub_appliance_releases';
