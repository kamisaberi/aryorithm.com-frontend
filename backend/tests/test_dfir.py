"""DFIR route tests (PCAP vault, CDR sanitizer, firmware dissector)."""

import io
import zipfile

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


def _zip_with_macro() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<xml>hello</xml>")
        zf.writestr("word/vbaProject.bin", "MACROBYTES")
    return buf.getvalue()


@needs_db
async def test_pcap_list_and_download(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/dfir/pcaps", headers=h)
    assert r.status_code == 200
    assert [p["pcap_id"] for p in r.json()] == ["PCAP-1002", "PCAP-1001"]

    r = await ac.get("/api/v1/dfir/pcaps/PCAP-1002/download", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/vnd.tcpdump.pcap"
    assert "PCAP-1002.pcap" in r.headers["content-disposition"]


@needs_db
async def test_cdr_sanitize(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.post("/api/v1/dfir/cdr/sanitize", files={"file": ("doc.docx", _zip_with_macro())}, headers=h)
    assert r.status_code == 200
    assert r.headers["X-Sanitization-Status"] == "MACROS_STRIPPED"
    assert r.headers["X-Threats-Removed"] == "1"
    assert b"vbaProject" not in r.content

    r = await ac.post("/api/v1/dfir/cdr/sanitize", files={"file": ("note.txt", b"plain text")}, headers=h)
    assert r.headers["X-Sanitization-Status"] == "CLEAN"


@needs_db
async def test_firmware_lifecycle(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    blob = b"\x7fELF x86 firmware password: hunter2secret " + b"\x00" * 64
    r = await ac.post("/api/v1/dfir/firmware/dissect", files={"file": ("fw.bin", blob)},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200
    task_id = r.json()["task_id"]
    assert r.json()["status"] == "ANALYZED"

    r = await ac.get(f"/api/v1/dfir/firmware/reports/{task_id}", headers=auth_headers(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["sha256"] and body["cpu_architecture"] == "x86_64"
    assert any(f["category"] == "HARDCODED_CREDENTIAL" for f in body["findings"])

    r = await ac.get("/api/v1/dfir/firmware/reports/NOPE-1", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()["vulnerabilities"]) == 2

    r = await ac.post("/api/v1/dfir/firmware/dissect", files={"file": ("fw.bin", blob)},
                      headers=auth_headers(analyst_token))
    assert r.status_code == 403
