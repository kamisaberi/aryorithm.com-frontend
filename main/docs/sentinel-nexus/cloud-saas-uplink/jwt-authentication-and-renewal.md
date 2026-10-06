# JWT Authentication, Session Caching & Token Renewal

`SaaSConnector` authenticates with the cloud control plane using scoped JSON Web Tokens (JWT). It caches session state locally in `data/cloud_session.json` and implements automatic renewal upon token expiration or HTTP `401 Unauthorized` responses.

---

## 1. Authentication Lifecycle Sequence

```text
 SaaSConnector Startup
          │
          ▼ Check data/cloud_session.json
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Does a valid cached JWT exist with > 5 minutes lease?    │
 └────────┬───────────────────────────────────────────┬────────┘
          │ YES                                       │ NO / Expired
          ▼                                           ▼
 ┌─────────────────────────────┐             ┌─────────────────────────────┐
 │ Load active token from disk │             │ POST /api/v1/auth/login     │
 │ and proceed to fleet sync   │             │ Authenticate API key/secret │
 └─────────────────────────────┘             └──────────────┬──────────────┘
                                                            │
                                                            ▼ Save Session
                                             ┌─────────────────────────────┐
                                             │ Cache JWT & expiry timestamp│
                                             │ to data/cloud_session.json  │
                                             └─────────────────────────────┘
```

---

## 2. In-Engine Authentication Implementation (`SaaSConnector.cpp`)

```cpp
#include <sentinel_nexus/SaaSConnector.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <chrono>

namespace sentinel::nexus {

bool SaaSConnector::authenticate() {
    std::lock_guard<std::recursive_mutex> lock(auth_mutex_);

    // 1. Check local session cache
    if (load_cached_session()) {
        uint64_t now_epoch = get_epoch_seconds();
        if (now_epoch + 300 < token_expiry_epoch_) { // 5-minute safety buffer
            return true; // Token valid
        }
    }

    // 2. Perform authentication request
    nlohmann::json login_body = {
        {"api_key", config_.cloud_api_key},
        {"api_secret", config_.cloud_api_secret},
        {"nexus_id", config_.nexus_id}
    };

    HttpResponse resp = http_post_json("/api/v1/auth/login", login_body.dump(), false);

    if (resp.status_code == 200) {
        auto resp_json = nlohmann::json::parse(resp.body);
        active_jwt_token_ = resp_json["access_token"].get<std::string>();
        token_expiry_epoch_ = resp_json["expires_at"].get<uint64_t>();

        save_cached_session();
        XINFER_LOG_INFO("SaaSConnector: Authenticated with cloud backend successfully.");
        return true;
    }

    XINFER_LOG_ERROR("SaaSConnector: Authentication failed with status {}", resp.status_code);
    return false;
}

} // namespace sentinel::nexus
```

