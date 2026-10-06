# Resolving Port Collisions & Socket Binding Failures

`sentinel-nexus` exposes three network listener interfaces: **Port 50051** (gRPC), **Port 9443** (HTTPS REST & Web UI), and **Port 9444** (SSE Stream). If another background process or an improperly terminated instance holds these ports, startup will fail.

---

## 1. Symptoms & Diagnostic Traces

```text
[ERROR] GrpcServer: Failed to bind to 0.0.0.0:50051: Address already in use (EADDRINUSE)
[FATAL] WebServer: bind() failed on 0.0.0.0:9443 (errno 98: Address already in use)
[FATAL] SseBroadcaster: Failed to open socket on port 9444
```

---

## 2. Port Diagnosis & Conflict Resolution

Identify the process holding the contested ports using `ss` or `lsof`:

```bash
# Check all three Nexus service ports
sudo ss -tulpn | grep -E '50051|9443|9444'
```

Alternatively, query by process file descriptor:

```bash
sudo lsof -i :50051
sudo lsof -i :9443
sudo lsof -i :9444
```

### Terminating Lingering Instances
If an orphaned `sentinel-nexus` process remains in memory:

```bash
# Force-terminate the conflicting process
sudo fuser -k 50051/tcp
sudo fuser -k 9443/tcp
sudo fuser -k 9444/tcp
```

---

## 3. Resolving TCP `TIME_WAIT` Sockets in C++20

If the daemon is restarted rapidly during maintenance, sockets may linger in the kernel `TIME_WAIT` state. `sentinel-nexus` applies the `SO_REUSEADDR` and `SO_REUSEPORT` socket options:

```cpp
int opt = 1;
::setsockopt(server_sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#if defined(SO_REUSEPORT)
::setsockopt(server_sock, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
#endif
```

In systemd deployments, ensure `RestartSec=3s` is configured to allow kernel descriptor recycling before relaunch.

