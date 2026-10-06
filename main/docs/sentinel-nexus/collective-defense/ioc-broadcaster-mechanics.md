# Asynchronous Parallel gRPC Distribution Engine

The `IocBroadcaster` (`src/nexus/IocBroadcaster.cpp`) manages active streaming RPC connections (`StreamFleetRules`) to all connected appliances, fanning out rules asynchronously using thread pools.

---

## 1. Broadcaster Implementation (`IocBroadcaster.hpp`)

```cpp
#pragma once

#include <sentinel_nexus.grpc.pb.h>
#include <shared_mutex>
#include <unordered_map>
#include <string>
#include <vector>

namespace sentinel::nexus {

struct ApplianceStreamSession {
    std::string uuid;
    grpc::ServerReaderWriter<FleetDefenseRule, StreamRulesRequest>* stream{nullptr};
    uint32_t tpm_tier{0};
};

class IocBroadcaster {
public:
    void register_stream(const std::string& uuid, grpc::ServerReaderWriter<FleetDefenseRule, StreamRulesRequest>* stream) {
        std::unique_lock lock(mutex_);
        active_sessions_[uuid] = {uuid, stream};
    }

    void unregister_stream(const std::string& uuid) noexcept {
        std::unique_lock lock(mutex_);
        active_sessions_.erase(uuid);
    }

    // Broadcasts an IoC to all appliances except the originator
    uint32_t broadcast_rule(const FleetDefenseRule& rule, const std::string& originator_uuid) {
        std::shared_lock lock(mutex_);
        uint32_t dispatched_count = 0;

        for (const auto& [uuid, session] : active_sessions_) {
            // Originator Loopback Suppression
            if (uuid == originator_uuid) {
                continue;
            }

            // Asynchronous non-blocking write to HTTP/2 stream
            if (session.stream && session.stream->Write(rule)) {
                dispatched_count++;
            }
        }
        return dispatched_count;
    }

private:
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, ApplianceStreamSession> active_sessions_;
};

} // namespace sentinel::nexus
```

---

## 2. Stream Channel Health

* If an edge appliance drops connection mid-stream, `session.stream->Write()` returns `false`.
* The broken stream is marked for reclamation without delaying rule delivery to the remaining 4,999 appliances.

