# Air-Gapped & Offline Deployment Mode

In sovereign defense networks, energy grids, and air-gapped industrial control systems (ICS), edge devices operate with zero Internet connectivity and $\$0.00$ cloud data egress.

`xinfer::ModelHub` provides an **Air-Gapped Mode** that disables outbound network calls while running entirely against pre-seeded local storage.

---

## 1. Architectural Safeguards in Offline Mode

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                  Application Execution Path                 │
 └──────────────────────────────┬──────────────────────────────┘
                                │ ModelHub::resolve()
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ xinfer::ModelHub (offline_mode = true)                      │
 │   - Bypasses outbound sockets and network thread pools      │
 │   - Searches local pre-seeded model stores only             │
 │   - If model missing: Throws immediately (Deterministic)    │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼ Resolves via read-only local store
 ┌─────────────────────────────────────────────────────────────┐
 │ Pre-Seeded Local Storage: /opt/sentinel/models/             │
 │   (Immutable squashfs, read-only mount, or USB Token)       │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Configuring Offline Mode

Offline mode can be enforced via configuration files, the C++ API, or environment variables:

### Via C++ API

```cpp
#include <xinfer/xinfer.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/sentinel/models/network_threat_v2.onnx";
config.enable_offline_mode = true; // Prevents any external network resolution

xinfer::InferenceEngine engine(config);
engine.initialize();
```

### Via Environment Variable

```bash
# Globally disable network resolution across all xinfer instances
export XINFER_OFFLINE_MODE=1
```

---

## 3. Pre-Seeding Local Models

In air-gapped environments, models are provisioned during device manufacturing or updated through authenticated USB security keys:

```bash
# 1. Mount secure read-only model partition
sudo mkdir -p /opt/sentinel/models
sudo mount -o ro /dev/sdb1 /opt/sentinel/models

# 2. Verify local permissions and hashes
cd /opt/sentinel/models
sha256sum -c manifest.sha256
```

### Expected Output

```text
network_threat_v2.onnx: OK
industrial_overheat_v1.rknn: OK
scada_modbus_v3.xml: OK
scada_modbus_v3.bin: OK
```

---

## 4. Verification Check: Confirming Zero Socket Creation

Audit the host binary using `strace` to confirm that `libxinfer.so` creates zero network sockets during execution:

```bash
strace -f -e trace=network ./hello_xinfer
```

If `offline_mode` is properly configured, no calls to `socket()`, `connect()`, or `sendto()` will occur.

