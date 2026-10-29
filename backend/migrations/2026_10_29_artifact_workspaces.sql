-- Unified artifact workspace: tenancy, visibility, forking and sharing.
-- Apply after the existing hub tables have been created.  The application
-- also adds missing columns lazily on startup for SQLite/dev deployments.

ALTER TABLE hub_asset_meta
    ADD COLUMN tenant_id VARCHAR(36) NULL,
    ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'private',
    ADD COLUMN forked_from_type VARCHAR(16) NULL,
    ADD COLUMN forked_from_slug VARCHAR(128) NULL,
    ADD COLUMN fork_count INT NOT NULL DEFAULT 0,
    ADD COLUMN orphaned_root TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at DATETIME NULL;

-- Existing rows must stay publicly discoverable.  Only rows created by the
-- new publish/workspace paths receive visibility='private'.
UPDATE hub_asset_meta SET visibility = 'public' WHERE visibility = 'private';

CREATE INDEX ix_hub_asset_meta_tenant_id ON hub_asset_meta (tenant_id);
CREATE INDEX ix_hub_asset_meta_visibility ON hub_asset_meta (visibility);
CREATE INDEX ix_hub_asset_meta_forked_from_type ON hub_asset_meta (forked_from_type);
CREATE INDEX ix_hub_asset_meta_forked_from_slug ON hub_asset_meta (forked_from_slug);

CREATE TABLE IF NOT EXISTS hub_asset_shares (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    asset_type VARCHAR(16) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    grantee_type VARCHAR(16) NOT NULL,
    grantee_id VARCHAR(128) NULL,
    grantee_email VARCHAR(255) NULL,
    permission VARCHAR(16) NOT NULL,
    created_by VARCHAR(36) NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_hub_asset_share UNIQUE (asset_type, slug, grantee_type, grantee_id, grantee_email, permission),
    CONSTRAINT fk_hub_asset_share_creator FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX ix_hub_asset_shares_asset (asset_type, slug),
    INDEX ix_hub_asset_shares_grantee (grantee_type, grantee_id),
    INDEX ix_hub_asset_shares_email (grantee_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hub_share_links (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    asset_type VARCHAR(16) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_prefix VARCHAR(24) NOT NULL DEFAULT '',
    permission VARCHAR(16) NOT NULL DEFAULT 'VIEW',
    expires_at DATETIME NULL,
    max_uses INT NULL,
    use_count INT NOT NULL DEFAULT 0,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL,
    last_used_at DATETIME NULL,
    CONSTRAINT fk_hub_share_link_creator FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX ix_hub_share_links_asset (asset_type, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
