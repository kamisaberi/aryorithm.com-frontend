# Resolving gRPC & Protocol Buffers Linking Errors

When building Tier 6 (`sentinel-nexus`), the linker resolves symbols across `libgrpc++`, `libprotobuf`, and Abseil. If system libraries are mismatched or multiple Protobuf versions coexist, linking fails.

---

## 1. Symptom & Linker Trace

```text
/usr/bin/ld: CMakeFiles/sentinel-nexus.dir/src/nexus/main.cpp.o: in function `sentinel::nexus::FleetServiceImpl::SubmitHeartbeat(...)':
main.cpp:(.text+0x1420): undefined reference to `google::protobuf::Message::InitializationErrorString[abi:cxx11]() const'
/usr/bin/ld: main.cpp:(.text+0x1580): undefined reference to `grpc::ServerBuilder::AddListeningPort(...)'
clang-16: error: linker command failed with exit code 1
```

---

## 2. Root Cause Analysis

1. **Protobuf ABI Divergence:** A locally compiled Protobuf version in `/usr/local/lib` conflicts with the Ubuntu system package in `/usr/lib/x86_64-linux-gnu`.
2. **Ubuntu 24.04/26.04 `t64` Header Mismatches:** Installing `libprotobuf-dev` without updating `libgrpc++-dev` creates an incompatible mix of 64-bit `time_t` shared objects.

---

## 3. Remediation

### Step 1: Re-install Unified System Packaging
Ensure consistent system versions of the gRPC toolchain:

```bash
sudo apt-get update
sudo apt-get install --reinstall -y \
    protobuf-compiler-grpc \
    libprotobuf-dev \
    libgrpc++-dev
```

### Step 2: Clear Stale CMake Cache
Purge the build directory to force CMake to rediscover system package configurations:

```bash
rm -rf /opt/sentinel-stack/src/nexus/build
```

### Step 3: Verify Protobuf Version Alignment
Ensure the `protoc` compiler matches the linked library headers:

```bash
protoc --version
pkg-config --modversion protobuf
```

Both outputs must report identical major version baselines. Re-run `./install.sh`.

