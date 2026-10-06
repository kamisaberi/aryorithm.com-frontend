"""License signing + capability mapping (Ed25519 offline envelopes).

Adapted from the contributor snippet to this repo's structure:
- keys come from ``app.config.settings`` (env first, dev key-file fallback)
  instead of ``os.environ`` reads scattered through the router;
- tier names are normalized so both the legacy appliance names
  (``CRITICAL_OT``/``ENTERPRISE_IT``/``SOVEREIGN_DEFENSE``/``COMMUNITY_FREE``)
  and the canonical plan slugs (``critical``/``enterprise``/``sovereign``/
  ``community``) resolve to the same capabilities;
- pure functions (no FastAPI imports) so routers *and* tests can use them.
"""

import base64
import json
import os
import secrets
import time

from app.config import settings

# ---------------------------------------------------------------------------
# Capability catalog (kept from the contributor snippet — these are the .so /
# module ids the C++ LicenseManager enforces on the appliance).
# ---------------------------------------------------------------------------
ALL_26_MODULES = [
    "01_siem_core", "02_ueba", "03_ndr", "04_ids_ips", "05_waf", "06_edr",
    "07_epp_ngav", "08_nac", "09_cwpp", "10_bad", "11_rasp", "12_itdr",
    "13_ddos", "14_ato", "15_ngfw", "16_cdr", "17_iot_sec", "18_cps_sec",
    "19_swg", "20_fse", "21_side_channel", "22_dfir", "23_ai_trism",
    "24_ztna", "25_fdp", "26_ddp",
]

# NOTE: historically called "30 plugins" but the list carries 31 entries
# (25 dissectors + 6 forwarders). Kept as-is — appliances check membership,
# so a superset is safe. Do not remove entries without a migration.
ALL_30_PLUGINS = [
    "libmodbus_dissector.so", "libdnp3_dissector.so", "libs7comm_dissector.so",
    "libprofinet_dissector.so", "libethernet_ip.so", "libhart_ip.so",
    "libmitsubishi_melsec.so", "libomron_fins.so", "libiec104_dissector.so",
    "libiec61850_goose.so", "libiec61850_mms.so", "libopc_ua_dissector.so",
    "libbacnet_building.so", "libmodbus_rtu_serial.so", "libenip_cip.so",
    "libfieldbus_h1.so", "libmavlink_uav.so", "libais_maritime.so",
    "libnmea_gps.so", "libadsb_avionics.so", "libstanag_4586.so",
    "libmil_std_1553.so", "libcanbus_automotive.so", "libdicom_pacs.so",
    "libhl7_v2.so", "libcef_forwarder.so", "libleef_forwarder.so",
    "libsyslog_rfc5424.so", "libkafka_producer.so", "libsnmp_v3_trap.so",
    "libnetflow_v9_ipfix.so",
]

FREE_COMMUNITY_MODULES = [
    "01_siem_core", "04_ids_ips", "15_ngfw", "19_swg", "22_dfir",
]

ENTERPRISE_IT_EXCLUDED_MODULES = (
    "17_iot_sec", "18_cps_sec", "20_fse", "21_side_channel", "26_ddp",
)
ENTERPRISE_IT_PLUGINS = [
    "libcef_forwarder.so", "libleef_forwarder.so", "libsyslog_rfc5424.so",
    "libkafka_producer.so", "libbacnet_building.so",
]

# Canonical plan slugs used across /plans, the dashboard and the portal.
PLAN_SLUGS = ("community", "enterprise", "critical", "sovereign")

# Legacy appliance tier names -> canonical slug.
_TIER_ALIASES = {
    "COMMUNITY_FREE": "community",
    "COMMUNITY": "community",
    "FREE": "community",
    "ENTERPRISE_IT": "enterprise",
    "ENTERPRISE": "enterprise",
    "CRITICAL_OT": "critical",
    "CRITICAL": "critical",
    "SOVEREIGN_DEFENSE": "sovereign",
    "SOVEREIGN": "sovereign",
}

# Sensible per-tier defaults for self-service subscribe.
TIER_DEFAULTS = {
    "community": {"days_valid": 0, "max_nodes": 1},
    "enterprise": {"days_valid": 30, "max_nodes": 10},
    "critical": {"days_valid": 365, "max_nodes": 10},
    "sovereign": {"days_valid": 365, "max_nodes": 10},
}


class LicenseKeyError(RuntimeError):
    """Raised when the master signing key is missing or unusable."""


def normalize_plan_slug(tier: str) -> str:
    """Map any accepted tier/plan name to a canonical plan slug."""
    key = (tier or "").strip().upper()
    if key in _TIER_ALIASES:
        return _TIER_ALIASES[key]
    lowered = (tier or "").strip().lower()
    if lowered in PLAN_SLUGS:
        return lowered
    raise ValueError(
        f"Unknown plan '{tier}'. Use one of: {', '.join(PLAN_SLUGS)}."
    )


def license_kind(plan_slug: str) -> str:
    """Billing bucket used by the dashboard filter: free | commercial."""
    return "free" if normalize_plan_slug(plan_slug) == "community" else "commercial"


def capabilities_for(plan_slug: str) -> tuple[list[str], list[str]]:
    """Authorized (modules, plugins) for a canonical plan slug."""
    slug = normalize_plan_slug(plan_slug)
    if slug in ("critical", "sovereign"):
        return list(ALL_26_MODULES), list(ALL_30_PLUGINS)
    if slug == "enterprise":
        modules = [m for m in ALL_26_MODULES if m not in ENTERPRISE_IT_EXCLUDED_MODULES]
        return modules, list(ENTERPRISE_IT_PLUGINS)
    return list(FREE_COMMUNITY_MODULES), []


def normalize_hw_uuid(hardware_token: str) -> str:
    """Strip the ARY-HW- prefix and whitespace for the locked claim."""
    return (hardware_token or "").replace("ARY-HW-", "").replace("ARY_HW_", "").strip()


def _ed25519_private_key():
    try:
        from cryptography.hazmat.primitives.asymmetric import ed25519
    except ImportError as exc:
        raise LicenseKeyError(
            "The 'cryptography' package is required for license signing. "
            "Install it with: pip install -r requirements.txt"
        ) from exc

    b64 = (settings.ARYORITHM_MASTER_PRIVATE_KEY_B64 or "").strip()
    if b64:
        try:
            raw = base64.b64decode(b64)
        except Exception as exc:
            raise LicenseKeyError("ARYORITHM_MASTER_PRIVATE_KEY_B64 is not valid base64.") from exc
        if len(raw) != 32:
            raise LicenseKeyError("Private key must decode to exactly 32 bytes (Ed25519 seed).")
        return ed25519.Ed25519PrivateKey.from_private_bytes(raw)

    key_path = settings.LICENSE_KEY_FILE or "tools/licensing/master_private.key"
    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            raw = f.read().strip()
        # Accept both raw 32 bytes and base64-encoded file contents.
        if len(raw) != 32:
            try:
                raw = base64.b64decode(raw)
            except Exception as exc:
                raise LicenseKeyError(f"Key file {key_path} is neither raw 32 bytes nor base64.") from exc
        if len(raw) != 32:
            raise LicenseKeyError(f"Key file {key_path} must hold exactly 32 bytes.")
        return ed25519.Ed25519PrivateKey.from_private_bytes(raw)

    raise LicenseKeyError(
        "Licensing private key not configured. Set ARYORITHM_MASTER_PRIVATE_KEY_B64 "
        f"or place the raw 32-byte seed at {key_path} "
        "(generate with: PYTHONPATH=. python tools/licensing/generate_keys.py)."
    )


def _ed25519_public_key():
    try:
        from cryptography.hazmat.primitives.asymmetric import ed25519
    except ImportError as exc:
        raise LicenseKeyError(
            "The 'cryptography' package is required for license verification."
        ) from exc

    b64 = (settings.ARYORITHM_MASTER_PUBLIC_KEY_B64 or "").strip()
    if b64:
        raw = base64.b64decode(b64)
        if len(raw) != 32:
            raise LicenseKeyError("Public key must decode to exactly 32 bytes.")
        return ed25519.Ed25519PublicKey.from_public_bytes(raw)

    # Derive from the private key when no standalone public key is configured.
    return _ed25519_private_key().public_key()


def public_key_b64() -> str:
    """Master public key (base64) for appliance-side offline verification."""
    from cryptography.hazmat.primitives import serialization

    raw = _ed25519_public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.b64encode(raw).decode("utf-8")


def build_claims(
    customer_name: str,
    plan_slug: str,
    hw_uuid: str,
    days_valid: int = 365,
    max_nodes: int = 10,
    now_sec: int | None = None,
) -> dict:
    """Build the unsigned license claims payload."""
    slug = normalize_plan_slug(plan_slug)
    now = now_sec if now_sec is not None else int(time.time())
    if slug == "community":
        days_valid = 0
    expires = now + (days_valid * 86400) if days_valid > 0 else 0
    modules, plugins = capabilities_for(slug)
    prefix = (customer_name or "GEN")[:3].upper().ljust(3, "X")
    # Random suffix keeps ids unique even when several licenses are issued
    # within the same second (the naive LIC-{now}-{prefix} scheme collides).
    rand = secrets.token_hex(2).upper()
    return {
        "license_id": f"LIC-{now}-{prefix}-{rand}",
        "customer": customer_name,
        "tier": slug,
        "plan": slug,
        "issued_at": now,
        "expires_at": expires,
        "max_nodes": max_nodes,
        "locked_hardware_uuid": normalize_hw_uuid(hw_uuid),
        "authorized_modules": modules,
        "authorized_plugins": plugins,
    }


def sign_claims(claims: dict) -> dict:
    """Sign canonical claims JSON bytes and return the full envelope."""
    private_key = _ed25519_private_key()
    canonical = json.dumps(claims, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = base64.b64encode(private_key.sign(canonical)).decode("utf-8")
    return {
        "claims": claims,
        "signature_algorithm": "ED25519",
        "signature": signature,
    }


def generate_signed_envelope(
    customer_name: str,
    tier: str,
    hw_uuid: str,
    days_valid: int = 365,
    max_nodes: int = 10,
) -> dict:
    """Drop-in replacement for the contributor snippet's helper.

    Same signature, but tier accepts both legacy (``CRITICAL_OT``) and
    canonical (``critical``) names and keys resolve via app settings.
    """
    claims = build_claims(customer_name, tier, hw_uuid, days_valid, max_nodes)
    return sign_claims(claims)


def verify_envelope(envelope: dict) -> bool:
    """Verify an envelope's Ed25519 signature. Returns True/False (no raise)."""
    try:
        from cryptography.exceptions import InvalidSignature

        claims = envelope.get("claims", {})
        signature = base64.b64decode(envelope.get("signature", ""))
        canonical = json.dumps(claims, sort_keys=True, separators=(",", ":")).encode("utf-8")
        _ed25519_public_key().verify(signature, canonical)
        return True
    except Exception:
        return False


def computed_status(expires_at: int, revoked: bool, now_sec: int | None = None) -> str:
    """active | expired | revoked — expired derives from the clock, not storage."""
    if revoked:
        return "revoked"
    if expires_at and expires_at > 0:
        now = now_sec if now_sec is not None else int(time.time())
        if expires_at < now:
            return "expired"
    return "active"
