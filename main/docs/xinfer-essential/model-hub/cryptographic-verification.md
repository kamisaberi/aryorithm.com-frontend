# Pre-Execution Cryptographic Integrity Enforcement

Untrusted or corrupted neural network weights present a direct threat to critical infrastructure. Adversarial weight manipulation can introduce stealth backdoors or induce denial-of-service conditions.

`xinfer-essential` guarantees that no model is loaded into memory or executed on silicon without passing **strict pre-execution SHA-256 verification**.

---

## 1. Cryptographic Validation Pipeline

```text
 Candidate Model Binary (Disk or Memory Stream)
                     │
                     ▼
+─────────────────────────────────────────────────────────────+
| Streaming SHA-256 Checksum Calculation (OpenSSL EVP)        |
|   - 64 KB block streaming (Memory friendly)                 |
|   - Hardware acceleration via Intel SHA Extensions / ARMv8 CE|
+─────────────────────────────────────────────────────────────+
                     │
                     ▼ Computed Hex Digest
+─────────────────────────────────────────────────────────────+
| Constant-Time String Comparison                             |
|   - Evaluates: CRYPTO_memcmp(computed, expected, 32)        |
|   - Eliminates timing side-channel analysis                 |
+─────────────────────────────────────────────────────────────+
        │                                             │
        ▼ (Match Verified)                            ▼ (Mismatch Detected)
[ Load Into Silicon Driver ]               [ Immediate Abort & Raise Alert ]
                                            - Purge candidate file
                                            - Throw ERR_INTEGRITY_CHECK_FAILED
                                            - Emit Security Warning Log
```

---

## 2. In-Engine Verification Implementation

```cpp
#include <openssl/evp.h>
#include <openssl/crypto.h>
#include <fstream>
#include <vector>
#include <string>
#include <iomanip>
#include <sstream>
#include <xinfer/exception.hpp>

namespace xinfer {

std::string compute_file_sha256(const std::filesystem::path& file_path) {
    std::ifstream file(file_path, std::ios::binary);
    if (!file.is_open()) {
        throw InferenceException(ErrorCode::ERR_FILE_NOT_FOUND, "Cannot open model for hashing");
    }

    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) {
        throw InferenceException(ErrorCode::ERR_INTERNAL_EXCEPTION, "Failed to create EVP_MD_CTX");
    }

    if (EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr) != 1) {
        EVP_MD_CTX_free(ctx);
        throw InferenceException(ErrorCode::ERR_INTERNAL_EXCEPTION, "DigestInit failed");
    }

    std::vector<char> buffer(65536); // 64 KB chunk size
    while (file.read(buffer.data(), buffer.size()) || file.gcount() > 0) {
        if (EVP_DigestUpdate(ctx, buffer.data(), file.gcount()) != 1) {
            EVP_MD_CTX_free(ctx);
            throw InferenceException(ErrorCode::ERR_INTERNAL_EXCEPTION, "DigestUpdate failed");
        }
    }

    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int length = 0;
    if (EVP_DigestFinal_ex(ctx, hash, &length) != 1) {
        EVP_MD_CTX_free(ctx);
        throw InferenceException(ErrorCode::ERR_INTERNAL_EXCEPTION, "DigestFinal failed");
    }

    EVP_MD_CTX_free(ctx);

    std::ostringstream ss;
    for (unsigned int i = 0; i < length; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    return ss.str();
}

void enforce_cryptographic_integrity(
    const std::filesystem::path& path, 
    std::string_view expected_hash
) {
    std::string computed = compute_file_sha256(path);

    // Constant-time equality check
    if (computed.size() != expected_hash.size() || 
        CRYPTO_memcmp(computed.data(), expected_hash.data(), computed.size()) != 0) {
        
        // Remove corrupt candidate artifact immediately
        std::filesystem::remove(path);

        throw InferenceException(
            ErrorCode::ERR_INTEGRITY_CHECK_FAILED,
            fmt::format("SHA-256 Mismatch! Expected: {} | Computed: {}", expected_hash, computed)
        );
    }
}

} // namespace xinfer
```

---

## 3. Manifest Verification

Models bundled as a collection can be deployed with an accompanying `manifest.sha256` signed by an administrative key:

```text
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  network_threat_v2.onnx
872983acbe44816c21e69da8a07c126d41829e23c1d8961726a57c2a713912da  yolov8s_industrial.engine
```

