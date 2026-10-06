# Resolving JWT Authentication & 401 Unauthorized Failures

Authentication failures manifest in two distinct vectors:
1. **Inbound 401s:** Security operators or scripts calling `https://localhost:9443/api/v1/*`.
2. **Outbound 401s:** `SaaSConnector.cpp` transmitting 4-tier tree telemetry to `https://app.aryorithm.com`.

---

## 1. Inbound REST API 401 Unauthorized

### Symptom
```text
HTTP/1.1 401 Unauthorized
{"error": "TOKEN_EXPIRED", "message": "JWT token lease expired at epoch 1791176400"}
```

### Remediation
1. Re-authenticate using the operations CLI:
   ```bash
   nexus-ctl auth login admin@substation.internal
   ```
2. Verify token validity:
   ```bash
   nexus-ctl auth whoami
   ```
3. In automated scripts, pass the new token via the `Authorization: Bearer <TOKEN>` header.

---

## 2. Outbound `SaaSConnector` 401 Token Cycling

### Symptom
```text
[ERROR] SaaSConnector: Cloud sync rejected with status 401. Token refresh required.
```

### The C++ Mutex Deadlock Fix
In earlier versions, `SaaSConnector::authenticate()` acquired `auth_mutex_`, then invoked `http_post_json()`, which called `get_active_token()` and attempted to acquire the same non-recursive mutex on the same thread—freezing the background connector.

Verify that `SaaSConnector.hpp` declares an **`std::recursive_mutex`**:

```cpp
// Correct declaration in SaaSConnector.hpp:
std::recursive_mutex auth_mutex_;
```

This permits re-entrant calls within the same thread while keeping token acquisition safe across asynchronous workers.

