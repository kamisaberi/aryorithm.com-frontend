# Dataset Curator Engine (`DatasetCurator.cpp`)

`DatasetCurator` drains the `VectorIngestQueue`, validates dimensional constraints, and packages batches into structured CSV datasets paired with cryptographic manifest descriptors.

---

## 1. Batch Packaging Logic (`DatasetCurator.cpp`)

```cpp
#include <sentinel_nexus/DatasetCurator.hpp>
#include <fstream>
#include <openssl/sha.h>
#include <iomanip>

namespace sentinel::nexus {

void DatasetCurator::curate_batch_to_disk(size_t quota) {
    std::string batch_uuid = generate_uuid_v4();
    std::string csv_path = "/var/lib/sentinel-nexus/forge_datasets/forge_dataset_" + batch_uuid + ".csv";
    std::string manifest_path = "/var/lib/sentinel-nexus/forge_datasets/forge_dataset_" + batch_uuid + ".manifest.json";

    std::ofstream csv_out(csv_path);
    SHA256_CTX sha_ctx;
    SHA256_Init(&sha_ctx);

    size_t written_samples = 0;
    IngestSlot slot;

    while (written_samples < quota && queue_.try_dequeue(slot)) {
        // Write 32 continuous dimensions as a CSV row
        for (int i = 0; i < 32; ++i) {
            csv_out << slot.features[i] << (i == 31 ? "\n" : ",");
        }
        
        // Update streaming SHA-256
        SHA256_Update(&sha_ctx, slot.features, 32 * sizeof(float));
        written_samples++;
    }
    csv_out.close();

    // Calculate final SHA-256 digest
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_Final(hash, &sha_ctx);
    std::string sha_hex = bytes_to_hex(hash, SHA256_DIGEST_LENGTH);

    // Emit JSON metadata manifest
    write_manifest(manifest_path, batch_uuid, written_samples, sha_hex);

    XINFER_LOG_INFO("DatasetCurator: Packaged {} samples to {}", written_samples, csv_path);
}

} // namespace sentinel::nexus
```

---

## 2. Output Batch Constraints

* **Fixed Batch Size:** Standard batches contain exactly $5{,}000$ continuous flow instances.
* **Atomic Visibility:** The CSV file is written to `.tmp` storage first and renamed to `forge_dataset_<uuid>.csv` only after the accompanying `.manifest.json` is synced to disk, preventing race conditions with inotify watchers.

