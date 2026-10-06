# ModelHub Architecture & Dynamic Resolution Pipeline

The `xinfer::ModelHub` subsystem decouples high-level model requests from physical storage locations. It resolves model targets through a three-tier fallback hierarchy designed to guarantee deterministic execution on edge appliances while supporting remote fleet updates.

---

## 1. Three-Tier Resolution Flow

```text
 Client Request: ModelHub::resolve("network_threat_v2", expected_sha256)
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 1: In-Memory Hot Ring Cache                            │
 │   - Fast lookup via std::shared_mutex                       │
 │   - Returns instantly if weights are already mapped in RAM  │
 └─────────────────────────────┬───────────────────────────────┘
                               │ (Cache Miss)
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 2: Local NVMe/eMMC Persistent Storage Cache            │
 │   - Path: /var/cache/xinfer/models/<hash>/model.bin         │
 │   - Validates SHA-256 checksum before returning descriptor  │
 └─────────────────────────────┬───────────────────────────────┘
                               │ (Cache Miss & Offline Mode == false)
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 3: Secure Remote HTTPS Endpoint (Sentinel-Nexus Hub)   │
 │   - Performs TLS 1.3 mutual authentication (mTLS)           │
 │   - Streams payload to atomic .tmp staging file             │
 │   - Enforces SHA-256 cryptographic gate before caching      │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core API Architecture (`xinfer::ModelHub`)

```cpp
#pragma once

#include <xinfer/data_types.hpp>
#include <string>
#include <string_view>
#include <memory>
#include <span>
#include <shared_mutex>
#include <unordered_map>
#include <filesystem>

namespace xinfer {

struct ModelArtifact {
    std::filesystem::path local_path;
    std::string sha256_hash;
    std::string format;
    size_t size_bytes{0};
    std::shared_ptr<const std::vector<uint8_t>> in_memory_buffer{nullptr};
};

class ModelHub {
public:
    explicit ModelHub(std::filesystem::path cache_directory, bool offline_mode = false);
    ~ModelHub() = default;

    // Resolves a model handle by identifier and mandatory cryptographic digest
    ModelArtifact resolve(
        std::string_view model_identifier,
        std::string_view expected_sha256,
        std::string_view remote_uri = ""
    );

    // Explicitly pins model weights into host RAM
    void pin_to_memory(std::string_view model_identifier);

    // Evicts model weights from memory
    void unpin_from_memory(std::string_view model_identifier) noexcept;

    // Purges local disk cache respecting LRU policy
    void prune_disk_cache(size_t max_bytes_allowed);

private:
    std::filesystem::path cache_dir_;
    bool offline_mode_{false};
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, ModelArtifact> memory_cache_;
};

} // namespace xinfer
```

---

## 3. Atomic Cache Guarantees

To ensure worker threads never read partially written or corrupt models during live fleet over-the-air (OTA) deployments:

1. Downloads stream to an isolated temporary file: `/var/cache/xinfer/models/.staging_<uuid>.tmp`.
2. Full SHA-256 checksum verification occurs across the temporary file.
3. Upon cryptographic validation, the engine performs an atomic POSIX `rename()` syscall to the target destination (`model.bin`).
4. Read operations acquire a shared lock (`std::shared_lock`), preventing cache pruning threads from unlinking models actively in use.

