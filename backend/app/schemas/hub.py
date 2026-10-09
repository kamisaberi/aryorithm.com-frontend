"""Pydantic schemas for the Aryorithm Hub (feature store) API."""

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# catalog
# ---------------------------------------------------------------------------
class PluginAuthorOut(BaseModel):
    name: str
    avatar_url: str = ""
    verified: bool = False
    github_handle: str = ""
    website: str = ""


class PluginMetricsOut(BaseModel):
    install_count: int = 0
    stars: int = 0
    fast_path_latency_us: float | None = None


class PluginActiveVersionOut(BaseModel):
    version: str
    release_date: str
    package_size_bytes: int = 0
    sha256: str = ""
    min_sentinel_version: str = ">= 2.0.0"
    download_url: str = ""


class PluginItemOut(BaseModel):
    id: str
    slug: str
    title: str
    short_description: str = ""
    category: str
    runtime: str
    supported_silicon: list[str] = []
    verification_tier: str
    author: PluginAuthorOut
    metrics: PluginMetricsOut
    active_version: PluginActiveVersionOut | None = None
    ports: list[int] = []
    tags: list[str] = []


class PaginatedPluginsOut(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: list[PluginItemOut]


class FacetsOut(BaseModel):
    categories: dict[str, int] = {}
    runtimes: dict[str, int] = {}
    silicon_targets: dict[str, int] = {}
    verification_tiers: dict[str, int] = {}


class PluginDetailOut(PluginItemOut):
    security_envelope: dict = {}
    install_commands: dict[str, str] = {}
    repository_url: str = ""


class ReadmeOut(BaseModel):
    version: str
    content_markdown: str = ""


class ManifestOut(BaseModel):
    version: str
    raw_yaml: str = ""
    parsed_json: dict = {}


# ---------------------------------------------------------------------------
# versions
# ---------------------------------------------------------------------------
class VersionSummaryOut(BaseModel):
    version: str
    release_date: str
    sha256: str = ""
    changelog: str = ""
    yanked: bool = False


class VersionHistoryOut(BaseModel):
    slug: str
    versions: list[VersionSummaryOut]


class VersionDetailOut(BaseModel):
    slug: str
    version: str
    release_date: str
    sha256: str = ""
    min_sentinel_version: str = ">= 2.0.0"
    package_size_bytes: int = 0
    changelog: str = ""
    yanked: bool = False
    dependencies: list = []
    download_url: str = ""


class SecurityOut(BaseModel):
    slug: str
    version: str
    provenance: dict = {}
    runtime_privileges: dict = {}


# ---------------------------------------------------------------------------
# registry
# ---------------------------------------------------------------------------
class ValidateRequest(BaseModel):
    manifest_yaml: str = Field(description="Raw splugin.yaml text to lint")


class LintIssue(BaseModel):
    field: str = ""
    code: str = ""
    message: str = ""


class ValidateOkOut(BaseModel):
    valid: bool = True
    warnings: list[LintIssue] = []
    parsed_metadata: dict = {}


class YankRequest(BaseModel):
    reason: str = Field(default="DEPRECATED", description="Machine-readable yank reason")
    advisory_notes: str = ""


class YankOut(BaseModel):
    slug: str
    version: str
    yanked: bool = True


class PublishOut(BaseModel):
    status: str = "PUBLISHED"
    id: str
    version: str
    sha256: str
    hub_url: str
    install_command: str


class TokenCreateRequest(BaseModel):
    name: str = Field(description="Human label, e.g. CI-CD-Github-Actions-Token")
    scopes: list[str] = Field(default_factory=lambda: ["packages:publish", "packages:validate"])
    expires_in_days: int | None = Field(default=365, description="Null = never expires")


class TokenCreateOut(BaseModel):
    token_id: str
    name: str
    api_key: str = Field(description="Full key — shown once, never again")
    created_at: str


class TokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    token_id: str
    name: str
    key_prefix: str
    scopes: list[str] = []
    expires_at: str | None = None
    revoked: bool = False
    last_used: str | None = None
    created_at: str | None = None


# ---------------------------------------------------------------------------
# sync + telemetry
# ---------------------------------------------------------------------------
class InstalledPluginIn(BaseModel):
    slug: str
    current_version: str


class CheckUpdatesRequest(BaseModel):
    sentinel_version: str = ""
    installed_plugins: list[InstalledPluginIn] = []


class UpdateAvailableOut(BaseModel):
    slug: str
    current_version: str
    latest_version: str
    critical_security_update: bool = False
    sha256: str = ""
    download_url: str = ""


class CheckUpdatesOut(BaseModel):
    updates_available: list[UpdateAvailableOut] = []


class AirgapPluginIn(BaseModel):
    slug: str
    version: str


class AirgapBundleRequest(BaseModel):
    requested_plugins: list[AirgapPluginIn] = []
    target_silicon: str = "UNIVERSAL"


class InstallTelemetryIn(BaseModel):
    slug: str
    version: str = ""
    silicon_target: str = "UNIVERSAL"


class StarOut(BaseModel):
    starred: bool
    total_stars: int
