# Command: `nexus-ctl auth login`

Authenticates an administrative operator or automation service account against `sentinel-nexus` or the cloud SaaS portal (`app.aryorithm.com`), acquiring and caching a cryptographically signed Bearer JWT token.

---

## 1. Syntax

```bash
nexus-ctl auth login [EMAIL] [PASSWORD] [OPTIONS]
```

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `EMAIL` | String | Administrative account email address. |
| `PASSWORD` | String | Account password (prompted securely if omitted). |
| `--cloud` | Flag | Authenticates against cloud backend (`app.aryorithm.com`). |
| `--local` | Flag | Authenticates against on-premises Nexus Hub (Default). |
| `--mfa-token STR` | String | 6-digit Time-based One-Time Password (TOTP) token. |

---

## 2. Interactive Login Example

```bash
nexus-ctl auth login admin@substation.internal
```

### Terminal Prompt:
```text
Enter password: ****************
Enter MFA OTP token (if enabled): 412891
[*] Authenticating against https://127.0.0.1:9443/api/v1/auth/login...
[+] Authentication Successful!
    Operator Identity : admin@substation.internal
    Assigned Role     : FLEET_SECURITY_ADMIN
    Token Lease       : 8 Hours (Expires: 2026-10-05 16:00:00 UTC)
    Session Cached To : ~/.nexus/session.json (Permissions: 0600)
```

---

## 3. Session Verification

Verify the active session status without logging in again:

```bash
nexus-ctl auth whoami
```

### Output:
```text
Authenticated as: admin@substation.internal [Role: FLEET_SECURITY_ADMIN]
Nexus Management URL: https://127.0.0.1:9443
Token Status: ACTIVE (4 hours, 12 minutes remaining)
```
