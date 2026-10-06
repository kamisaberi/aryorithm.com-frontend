# Canary Orchestrator Engine & Hash Cohort Selection

The `CanaryOrchestrator` (`src/nexus/CanaryOrchestrator.cpp`) partitions managed appliances into deterministic deployment cohorts using **consistent cryptographic hashing** over appliance hardware UUIDs.

---

## 1. Consistent Hash Cohort Selection

To ensure stable cohorts across rollouts, node assignment uses SHA-256 modulo arithmetic:

$$\text{Cohort Bucket} = \operatorname{SHA-256}(\text{ApplianceUUID} \parallel \text{Salt}) \pmod{100}$$

```text
 Appliance UUID: "edge-substation-alpha-8a2f"
                       │
                       ▼ SHA-256 Hash Engine
 Hash Digest: 0x3c12...9e84
                       │
                       ▼ Modulo 100
 Bucket Value: 3  ──► (3 < 5) ──► ASSIGNED TO CANARY 5% COHORT
```

Appliances with bucket values in $[0, 4]$ receive active Canary models; nodes with values in $[5, 99]$ remain on the verified baseline model until fleet-wide promotion.

---

## 2. Cohort Selector Implementation (`CanaryOrchestrator.hpp`)

```cpp
#pragma once

#include <string>
#include <openssl/sha.h>
#include <cstdint>

namespace sentinel::nexus {

enum class DeploymentStage {
    STAGED = 0,
    SHADOW_MODE,
    CANARY_5_PCT,
    FLEET_WIDE,
    ROLLED_BACK
};

class CanaryOrchestrator {
public:
    static bool is_node_in_canary_cohort(const std::string& uuid, uint32_t canary_percentage = 5) noexcept {
        if (canary_percentage >= 100) return true;
        if (canary_percentage == 0) return false;

        unsigned char hash[SHA256_DIGEST_LENGTH];
        SHA256(reinterpret_cast<const unsigned char*>(uuid.data()), uuid.size(), hash);

        // Map first 4 bytes to 32-bit integer
        uint32_t val = (hash[0] << 24) | (hash[1] << 16) | (hash[2] << 8) | hash[3];
        uint32_t bucket = val % 100;

        return bucket < canary_percentage;
    }
};

} // namespace sentinel::nexus
```

