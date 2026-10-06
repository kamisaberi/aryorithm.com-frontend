# Tier 1 Build Mechanics: `xinfer-essential` (`libxinfer.so`)

`xinfer-essential` is the foundational inference runtime in the topological DAG. It must be compiled and installed system-wide first so downstream tiers can locate its C++20 headers and link against `libxinfer.so`.

---

## 1. Source Directory & Build Location

* **Source Path:** `/opt/sentinel-stack/src/xinfer`
* **Build Directory:** `/opt/sentinel-stack/src/xinfer/build`
* **Installed Artifacts:**
  * Headers: `/usr/local/include/xinfer/*.hpp`
  * Shared Library: `/usr/local/lib/libxinfer.so -> libxinfer.so.1.0.0`
  * CMake Config: `/usr/local/lib/cmake/xinfer/xinferConfig.cmake`

---

## 2. Compilation Commands (`scripts/03_build_all_tiers.sh`)

```bash
cd /opt/sentinel-stack/src/xinfer
mkdir -p build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DXINFER_BUILD_TESTS=OFF \
    -DXINFER_ENABLE_OPENVINO=ON \
    -DXINFER_ENABLE_ZERO_COPY=ON ..

ninja -j"${PARALLEL_JOBS}"
ninja install

# Refresh dynamic linker cache immediately
ldconfig
```

---

## 3. Verification Assertion

Confirm that `libxinfer.so` is registered in `/etc/ld.so.cache`:

```bash
ldconfig -p | grep libxinfer
# Output: libxinfer.so.1 (libc6,x86-64) => /usr/local/lib/libxinfer.so.1
```

