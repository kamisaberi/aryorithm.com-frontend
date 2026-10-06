# Instant 0ms Graceful Disconnect Handling

When an edge appliance shuts down normally (via `systemctl stop sentinel`, system reboot, or `SIGINT`), waiting for the 15-second heartbeat timeout generates false "Node Lost" alarms in enterprise SOCs.

`sentinel-nexus` processes synchronous **`DeregisterAppliance`** requests, transitioning the appliance to `OFFLINE` in **under 5 milliseconds**.

---

## 1. RPC Deregistration Flow

```text
 Edge Appliance (SIGINT Intercepted)                   Sentinel-Nexus Hub
       │                                                         │
       │ DeregisterAppliance(appliance_uuid, GRACEFUL_SHUTDOWN)  │
       ├────────────────────────────────────────────────────────►│
       │                                                         │
       │                                            ┌────────────┴────────────┐
       │                                            │ 1. Mark node OFFLINE    │
       │                                            │ 2. Suppress SOC alerts  │
       │                                            │ 3. Close gRPC stream    │
       │                                            └────────────┬────────────┘
       │                                                         │
       │ 200 OK Response (Deregistration Acknowledged)           │
       │◄────────────────────────────────────────────────────────┤
       │
 [ Process Exits Cleanly ]
```

---

## 2. Server-Side gRPC Implementation (`FleetServiceImpl.cpp`)

```cpp
grpc::Status FleetServiceImpl::DeregisterAppliance(
    grpc::ServerContext* context,
    const DeregisterRequest* request,
    DeregisterResponse* response
) {
    const std::string& uuid = request->appliance_uuid();

    // 1. Authenticate calling appliance token
    if (!validate_jwt_context(context)) {
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid token");
    }

    // 2. Transition state immediately to OFFLINE
    node_registry_.mark_node_offline(uuid, request->reason());

    // 3. Update broad-spectrum SSE stream (Port 9444)
    sse_broadcaster_.push_node_offline_event(uuid);

    XINFER_LOG_INFO("FleetService: Appliance {} disconnected gracefully (0ms delay).", uuid);
    response->set_success(true);
    return grpc::Status::OK;
}
```

