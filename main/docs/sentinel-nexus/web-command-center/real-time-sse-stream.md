# Real-Time Telemetry Push Engine (Port 9444 SSE)

Instead of using resource-intensive client polling, `sentinel-nexus` streams real-time updates over **Server-Sent Events (SSE)** on port **9444**.

---

## 1. SSE Stream Protocol Specification

* **Endpoint:** `GET http://<NEXUS_HOST>:9444/stream`
* **Content-Type:** `text/event-stream; charset=utf-8`
* **Cache-Control:** `no-cache`
* **Connection:** `keep-alive`

```text
event: fleet_tick
data: {"timestamp_ns":1791172800184000000,"online_nodes":142,"drops_today":41209,"fleet_sla_us":0.82}

event: threat_drop
data: {"incident_id":"inc-1802","src_ip":"198.51.100.42","mitre_id":"T0855","action":"XDP_DROP","latency_us":0.81}

event: collective_rule_injected
data: {"rule_id":1042,"target_ip":"198.51.100.42","ttl_seconds":3600,"fanout_nodes":141}
```

---

## 2. C++20 Server-Side Broadcaster (`SseBroadcaster.cpp`)

```cpp
#include <string>
#include <vector>
#include <mutex>
#include <sys/socket.h>

namespace sentinel::nexus {

class SseBroadcaster {
public:
    void register_client(int client_socket) {
        std::lock_guard lock(mutex_);
        clients_.push_back(client_socket);
    }

    void broadcast(std::string_view event_type, std::string_view json_data) {
        std::string payload = "event: " + std::string(event_type) + "\n" +
                              "data: " + std::string(json_data) + "\n\n";

        std::lock_guard lock(mutex_);
        for (auto it = clients_.begin(); it != clients_.end();) {
            ssize_t sent = ::send(*it, payload.data(), payload.size(), MSG_NOSIGNAL);
            if (sent < 0) {
                // Client disconnected: clean up socket
                ::close(*it);
                it = clients_.erase(it);
            } else {
                ++it;
            }
        }
    }

private:
    std::mutex mutex_;
    std::vector<int> clients_;
};

} // namespace sentinel::nexus
```

