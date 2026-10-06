# Scaling to 5,000 Edge Appliances: Linux OS & gRPC Tuning

Managing up to 5,000 concurrent edge appliances over bidirectional HTTP/2 gRPC streaming connections requires tuning the Linux kernel networking stack, TCP buffer pools, and process file descriptor limits.

---

## 1. Operating System Kernel Tuning (`/etc/sysctl.d/99-nexus.conf`)

Deploy the following kernel network configuration parameters:

```ini
# Increase system-wide file descriptor ceiling
fs.file-max = 2097152

# Expand socket listen backlog queues for bursty reconnects
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Enforce high-throughput memory buffers (Min, Default, Max in bytes)
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Enable TCP BBR Congestion Control for low-latency WAN links
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Expand ephemeral port range
net.ipv4.ip_local_port_range = 1024 65535

# Fast socket recycling
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
```

Apply the configuration immediately:

```bash
sudo sysctl --system
```

---

## 2. Process File Descriptor Limits (`/etc/security/limits.conf`)

Ensure the executing user can maintain over $10{,}000$ open sockets:

```text
root    soft    nofile    1048576
root    hard    nofile    1048576
```

---

## 3. gRPC Server Channel Arguments (`src/nexus/main.cpp`)

In the `sentinel-nexus` C++ initialization code, pass these channel arguments to optimize resource usage:

```cpp
grpc::ServerBuilder builder;
builder.AddListeningPort("0.0.0.0:50051", creds);

// Optimize for high-density, low-latency streaming
builder.AddChannelArgument(GRPC_ARG_MAX_CONCURRENT_STREAMS, 5000);
builder.AddChannelArgument(GRPC_ARG_KEEPALIVE_TIME_MS, 10000);        // 10s ping
builder.AddChannelArgument(GRPC_ARG_KEEPALIVE_TIMEOUT_MS, 5000);      // 5s timeout
builder.AddChannelArgument(GRPC_ARG_HTTP2_MIN_SENT_PING_INTERVAL_WITHOUT_DATA_MS, 5000);
```

