-- ============================================================================
-- Aryorithm MySQL migration: Scenario Graph Studio
-- ============================================================================
-- Adds the normalized graph tables used by:
--   * GET/POST/DELETE /api/v1/matrix-scenarios
--   * GET /api/v1/matrix-scenarios/palette
--   * POST /api/v1/matrix-scenarios/{scenario_id}/compile
--   * POST /api/v1/matrix-scenarios/{scenario_id}/bundle
--   * POST /api/v1/matrix-scenarios/{scenario_id}/launch
--
-- These tables are intentionally separate from `matrix_scenarios` (the earlier
-- flat editor) and `threat_blueprints` (the physical edge DAG).
--
-- Safe to run on an existing database (CREATE TABLE IF NOT EXISTS). The app
-- also creates the tables on startup through SQLAlchemy metadata, but MySQL
-- operators can pre-provision them here.
--
-- Apply AFTER `tenants` exists:
--   mysql -u USER -p DBNAME < migrations/2026_11_06_scenario_studio.sql
--
-- MySQL 8.0+ / MariaDB 10.6+; utf8mb4 required.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `scenario_studio_graphs` (
    `id` VARCHAR(36) NOT NULL,
    `scenario_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `target_sector` VARCHAR(128) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'VALIDATED', 'BUNDLED', 'LAUNCHED') NOT NULL DEFAULT 'DRAFT',
    `compiled_yaml` TEXT NULL,
    `compiled_at` DATETIME NULL,
    `bundle_path` VARCHAR(512) NULL,
    `bundle_name` VARCHAR(255) NULL,
    `bundle_sha256` VARCHAR(64) NULL,
    `bundle_size_bytes` INTEGER NULL,
    `bundled_at` DATETIME NULL,
    `hub_slug` VARCHAR(128) NULL,
    `last_launch_id` VARCHAR(64) NULL,
    `last_launch_agent_id` VARCHAR(64) NULL,
    `last_launch_status` VARCHAR(32) NULL,
    `last_launch_message` TEXT NULL,
    `last_launched_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_scenario_studio_graph_tenant` (`tenant_id`, `scenario_id`),
    KEY `ix_scenario_studio_graphs_scenario_id` (`scenario_id`),
    KEY `ix_scenario_studio_graphs_tenant_id` (`tenant_id`),
    KEY `ix_scenario_studio_graphs_hub_slug` (`hub_slug`),
    CONSTRAINT `fk_scenario_studio_graphs_tenant`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scenario_studio_subnets` (
    `id` VARCHAR(36) NOT NULL,
    `graph_pk` VARCHAR(36) NOT NULL,
    `subnet_key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `cidr` VARCHAR(64) NOT NULL,
    `gateway` VARCHAR(64) NOT NULL,
    `internal` TINYINT(1) NOT NULL DEFAULT 0,
    `purdue_level` INTEGER NOT NULL DEFAULT 3,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_scenario_studio_subnet_key` (`graph_pk`, `subnet_key`),
    KEY `ix_scenario_studio_subnets_graph_pk` (`graph_pk`),
    CONSTRAINT `fk_scenario_studio_subnets_graph`
        FOREIGN KEY (`graph_pk`) REFERENCES `scenario_studio_graphs` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scenario_studio_nodes` (
    `id` VARCHAR(36) NOT NULL,
    `graph_pk` VARCHAR(36) NOT NULL,
    `node_key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `node_type` VARCHAR(64) NOT NULL,
    `subnet_key` VARCHAR(64) NULL,
    `ip` VARCHAR(64) NOT NULL DEFAULT '',
    `image` VARCHAR(255) NOT NULL DEFAULT '',
    `protocols` JSON NOT NULL,
    `ports` JSON NOT NULL,
    `config` JSON NOT NULL,
    `x` DOUBLE NOT NULL DEFAULT 0,
    `y` DOUBLE NOT NULL DEFAULT 0,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_scenario_studio_node_key` (`graph_pk`, `node_key`),
    KEY `ix_scenario_studio_nodes_graph_pk` (`graph_pk`),
    KEY `ix_scenario_studio_nodes_subnet_key` (`subnet_key`),
    CONSTRAINT `fk_scenario_studio_nodes_graph`
        FOREIGN KEY (`graph_pk`) REFERENCES `scenario_studio_graphs` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scenario_studio_links` (
    `id` VARCHAR(36) NOT NULL,
    `graph_pk` VARCHAR(36) NOT NULL,
    `link_key` VARCHAR(64) NOT NULL,
    `source_node_key` VARCHAR(64) NOT NULL,
    `target_node_key` VARCHAR(64) NOT NULL,
    `link_kind` VARCHAR(32) NOT NULL DEFAULT 'ETHERNET',
    `label` VARCHAR(255) NOT NULL DEFAULT '',
    `protocol` VARCHAR(64) NOT NULL DEFAULT '',
    `config` JSON NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_scenario_studio_link_key` (`graph_pk`, `link_key`),
    KEY `ix_scenario_studio_links_graph_pk` (`graph_pk`),
    CONSTRAINT `fk_scenario_studio_links_graph`
        FOREIGN KEY (`graph_pk`) REFERENCES `scenario_studio_graphs` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quick post-migration verification:
-- SHOW TABLES LIKE 'scenario_studio_%';
