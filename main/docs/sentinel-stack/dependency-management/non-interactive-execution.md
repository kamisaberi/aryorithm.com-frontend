# Non-Interactive Automation: Eliminating Prompts

To support automated cloud-init provisioning, PXE boot installations, and CI/CD pipelines, `sentinel-stack` suppresses all interactive debconf dialogs.

---

## 1. Environment Variable Overrides

Phase 1 exports environment variables to force non-interactive execution:

```bash
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a # Suppresses Ubuntu 24.04/26.04 needrestart dialogs
```

---

## 2. Dpkg Configuration Options

Every `apt-get` invocation uses forced configuration options:

```bash
APT_OPTS=(
    -y
    -o Dpkg::Options::="--force-confdef"
    -o Dpkg::Options::="--force-confold"
    -o Dpkg::Options::="--force-confmiss"
)

apt-get install "${APT_OPTS[@]}" <package_list>
```

### Option Rationale:
* **`--force-confdef`:** Instructs dpkg to resolve configuration file conflicts using the package maintainer's default choice without prompting.
* **`--force-confold`:** Preserves existing local configuration files if an existing file has been modified.
* **`NEEDRESTART_MODE=a`:** Suppresses the `needrestart` terminal menu that pauses script execution on modern Ubuntu releases.

