"""Pydantic response contracts for Hub blueprints & official appliances.

The wire shapes mirror the Blueprints / Appliances API specification.  All
timestamps are returned as Zulu strings (``2026-10-26T14:20:00Z``) because the
catalog clients already consume that format elsewhere in the Hub.
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# blueprints
# ---------------------------------------------------------------------------
class BlueprintDependencies(BaseModel):
    packages: list[str] = Field(default_factory=list)
    models: list[str] = Field(default_factory=list)


class BlueprintListItem(BaseModel):
    slug: str
    name: str
    version: str = "1.0.0"
    target_site: str | None = None
    industry: str = "CRITICAL_INFRASTRUCTURE"
    target_architecture: str = "x86_64"
    primary_interface: str = "ens160"
    max_pipeline_latency_us: float = 100.0
    downloads: int = 0
    verified_signature: bool = True
    author: str = ""
    author_public_key: str = ""
    dependencies: BlueprintDependencies = Field(default_factory=BlueprintDependencies)
    download_url: str = ""
    published_at: str = ""


class BlueprintListOut(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    results: list[BlueprintListItem] = Field(default_factory=list)


class BlueprintDetailOut(BlueprintListItem):
    description: str = ""
    file_size_bytes: int = 0
    sha256: str = ""
    hardware_binding: dict = Field(default_factory=dict)
    sla_guarantees: dict = Field(default_factory=dict)
    raw_dag_url: str = ""


class BlueprintPublishOut(BaseModel):
    status: str = "published"
    slug: str
    asset_type: str = "blueprint"
    version: str
    download_url: str
    verification: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# official appliances
# ---------------------------------------------------------------------------
class ApplianceArchitectureOut(BaseModel):
    id: str
    label: str
    target_hardware: str
    recommended_for: str


class ApplianceIndustryOut(BaseModel):
    id: str
    label: str
    protocols: list[str] = Field(default_factory=list)


class ApplianceLicenseOut(BaseModel):
    id: str
    label: str
    node_limit: int


class ApplianceMatrixOut(BaseModel):
    latest_version: str
    supported_architectures: list[ApplianceArchitectureOut] = Field(default_factory=list)
    supported_industries: list[ApplianceIndustryOut] = Field(default_factory=list)
    supported_licenses: list[ApplianceLicenseOut] = Field(default_factory=list)


class ApplianceReleaseOut(BaseModel):
    slug: str
    title: str
    version: str
    architecture: str
    industry: str
    license_tier: str
    file_name: str
    file_size_bytes: int
    sha256_checksum: str = ""
    authority_signature: str = ""
    verified_health_checks: str = "21/21"
    download_url: str = ""
    install_command: str = ""
    published_at: str = ""


class ApplianceListOut(BaseModel):
    total: int
    releases: list[ApplianceReleaseOut] = Field(default_factory=list)


class ApplianceDetailOut(ApplianceReleaseOut):
    download_count: int = 0
    is_active: bool = True


class AppliancePublishOut(BaseModel):
    status: str = "published"
    slug: str
    asset_type: str = "appliance"
    download_url: str
    size_mb: float
    authority_root_verified: bool = True
