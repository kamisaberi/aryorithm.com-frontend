# Class `xinfer::ModelHub`

Defined in header `<xinfer/model_hub.hpp>`  
Namespace: `xinfer`

`ModelHub` handles model artifact resolution, multi-tier caching (RAM $\to$ NVMe $\to$ HTTPS), cryptographic checksum verification, and air-gapped isolation.

---

## 1. Class Synopsis

```cpp
namespace xinfer {

struct ModelArtifact {
    std::filesystem::path local_path;
    std::string sha256_hash;
    std::string format;
    size_t size_bytes{0};
    std::shared_ptr<const std::vector<uint8_t>> in_memory_buffer{nullptr};
};

class XINFER_API ModelHub {
public:
    explicit ModelHub(
        std::filesystem::path cache_directory = "/var/cache/xinfer/models", 
        bool offline_mode = false
    );
    ~ModelHub();

    [[nodiscard]] ModelArtifact resolve(
        std::string_view model_identifier,
        std::string_view expected_sha256,
        std::string_view remote_uri = ""
    );

    void pin_to_memory(std::string_view model_identifier);
    void unpin_from_memory(std::string_view model_identifier) noexcept;
    void prune_disk_cache(size_t max_bytes_allowed);
    
    [[nodiscard]] bool is_model_cached(
        std::string_view model_identifier, 
        std::string_view expected_sha256
    ) const noexcept;
    
    void clear_all() noexcept;

private:
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

} // namespace xinfer
```

---

## 2. Key Method Documentation

### `resolve`
```cpp
ModelArtifact resolve(
    std::string_view model_identifier,
    std::string_view expected_sha256,
    std::string_view remote_uri = ""
);
```
Searches the active RAM pool and persistent disk cache for a model matching `model_identifier` and `expected_sha256`. If missing and `offline_mode == false`, pulls the model via HTTPS. Throws `InferenceException(ErrorCode::ERR_INTEGRITY_CHECK_FAILED)` if the calculated hash does not match `expected_sha256`.

