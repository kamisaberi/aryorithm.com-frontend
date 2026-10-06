# Multi-Threaded Core Engine & Thread Pool Architecture

`sentinel-nexus` is implemented in native ISO C++20 and designed to manage up to **5,000 concurrent edge appliances** without thread contention or dynamic runtime allocations in the routing fast path.

---

## 1. Engine Threading Topology

The daemon isolates distinct network interfaces and background workers into dedicated execution domains:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                      sentinel-nexus Master Process                          │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
 ┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
 │ gRPC Fleet Thread Pool   │    │ REST & Management Pool   │    │ Background Workers       │
 │ (Port 50051 - HTTP/2)    │    │ (Ports 9443 & 9444)      │    │                          │
 │ • CompletionQueue Workers│    │ • HTTPS Epoll Handlers   │    │ • DatasetCurator Thread  │
 │ • Bidirectional Streams  │    │ • SSE 100Hz Broadcaster  │    │ • RollbackGuard Watchdog │
 │ • Heartbeat Dequeue      │    │ • Static Asset Router    │    │ • StateDatabase Flusher  │
 └──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
        │                               │                               │
        └───────────────────────────────┼───────────────────────────────┘
                                        │ Lock-Free / Read-Heavy Synchronization
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │           In-Memory State Engine (NodeRegistry & Collective Bus)            │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Asynchronous gRPC Completion Queue Pool

Edge appliance connections over port 50051 are serviced asynchronously via multiple `grpc::ServerCompletionQueue` instances bound to dedicated CPU cores:

```cpp
#include <grpcpp/grpcpp.h>
#include <vector>
#include <thread>
#include <memory>

namespace sentinel::nexus {

class GrpcThreadPool {
public:
    explicit GrpcThreadPool(size_t num_threads) : num_threads_(num_threads) {}

    void register_cq(std::unique_ptr<grpc::ServerCompletionQueue> cq) {
        cqs_.push_back(std::move(cq));
    }

    void start_workers() {
        for (size_t i = 0; i < num_threads_; ++i) {
            worker_threads_.emplace_back([this, i]() {
                auto& cq = cqs_[i % cqs_.size()];
                void* tag = nullptr;
                bool ok = false;
                
                // Process event completions without blocking other server queues
                while (cq->Next(&tag, &ok)) {
                    if (ok && tag) {
                        auto* op = static_cast<IAsyncRpcOperation*>(tag);
                        op->proceed();
                    }
                }
            });
        }
    }

private:
    size_t num_threads_;
    std::vector<std::unique_ptr<grpc::ServerCompletionQueue>> cqs_;
    std::vector<std::jthread> worker_threads_;
};

} // namespace sentinel::nexus
```

---

## 3. Worker Thread Isolation Invariants

* **Affinity Pinning:** The gRPC fleet completion workers are pinned to specific CPU sockets to optimize L3 cache hit ratios when processing high-frequency heartbeats.
* **Separation of Concerns:** Heavy active learning tasks (e.g., parsing large CSV batches in `DatasetCurator.cpp`) execute on lower-priority background threads, preventing event-loop delays in the sub-50ms Collective Defense Bus.

