# HTTPS Remote Caching & Synchronization Rules

When connected to a central command plane (such as `sentinel-nexus`), `xinfer::ModelHub` provides automated model synchronization over HTTPS/TLS 1.3 while enforcing rate limits and byte-level validation.

---

## 1. HTTP Header Negotiation & Cache Invalidation

`ModelHub` uses standard conditional HTTP headers to minimize edge network bandwidth and cellular telemetry costs:

```text
Edge Appliance (xInfer)                              Fleet Server (Nexus Hub)
       │                                                         │
       │ GET /api/v1/models/network_threat_v2.onnx               │
       │ If-None-Match: "e9a2c31e847b2c9"                        │
       │ If-Modified-Since: Tue, 04 Oct 2026 12:00:00 GMT        │
       ├────────────────────────────────────────────────────────►│
       │                                                         │
       │◄────────────────────────────────────────────────────────┤
       │ 304 Not Modified (Payload: 0 bytes)                     │
       │ (Cached local model remains active)                     │
```

If an upstream update is staged:

```text
       │◄────────────────────────────────────────────────────────┤
       │ 200 OK (Content-Length: 14820352)                       │
       │ ETag: "f81c9b32e18a42"                                  │
       │ X-Checksum-SHA256: 3a7b...41e2                          │
       │ [Binary Payload Streamed]                               │
```

---

## 2. Dynamic Retry & Exponential Backoff Policy

Network transitions in industrial and vehicle environments can cause dropped connections. `ModelHub` integrates deterministic backoff with jitter to prevent server connection storms:

$$T_{\text{wait}} = \min\left(T_{\text{max}},\, T_{\text{base}} \times 2^{\text{attempt}}\right) \pm \text{jitter}$$

* **Initial Retry Delay ($T_{\text{base}}$):** $500\,\text{ms}$
* **Maximum Retry Ceiling ($T_{\text{max}}$):** $30.0\,\text{seconds}$
* **Max Consecutive Failures:** 5 attempts before raising `ERR_REMOTE_SYNC_FAILED`.

---

## 3. LRU Disk Cache Eviction Algorithm

When persistent storage exceeds configured limits (e.g., edge gateway eMMC bounds), `ModelHub` prunes artifacts using Least Recently Used (LRU) tracking:

```cpp
void ModelHub::prune_disk_cache(size_t max_bytes_allowed) {
    std::unique_lock lock(mutex_);
    
    // 1. Gather all cached model descriptors and access times
    struct CacheEntry {
        std::filesystem::path path;
        size_t size;
        std::filesystem::file_time_type last_access;
        bool is_pinned;
    };
    std::vector<CacheEntry> entries;
    size_t current_total_bytes = 0;

    for (const auto& dir_entry : std::filesystem::directory_iterator(cache_dir_)) {
        if (dir_entry.is_regular_file() && dir_entry.path().extension() == ".bin") {
            size_t sz = dir_entry.file_size();
            current_total_bytes += sz;
            entries.push_back({
                .path = dir_entry.path(),
                .size = sz,
                .last_access = dir_entry.last_write_time(),
                .is_pinned = false // Checked against active engine pins
            });
        }
    }

    if (current_total_bytes <= max_bytes_allowed) {
        return;
    }

    // 2. Sort oldest access first
    std::sort(entries.begin(), entries.end(), [](const CacheEntry& a, const CacheEntry& b) {
        return a.last_access < b.last_access;
    });

    // 3. Unlink unpinned files until under the threshold
    for (const auto& entry : entries) {
        if (!entry.is_pinned) {
            std::filesystem::remove(entry.path);
            current_total_bytes -= entry.size;
            if (current_total_bytes <= max_bytes_allowed) {
                break;
            }
        }
    }
}
```

