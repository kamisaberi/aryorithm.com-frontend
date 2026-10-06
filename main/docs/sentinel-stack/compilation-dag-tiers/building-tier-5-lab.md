# Tier 5 Build Mechanics: `sentinel-lab` (`sentinel_lab`)

`sentinel-lab` provides the SLAB protocol benchmarking engine and raw socket testbed. It links against `libxinfer.so` and `libblackbox.so`.

---

## 1. Compilation Commands

```bash
cd /opt/sentinel-stack/src/lab
mkdir -p build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DENABLE_OPENVINO=ON \
    -DBUILD_BENCHMARKS=ON ..

ninja -j"${PARALLEL_JOBS}"
ninja install
```

### Deployed Artifacts:
* `/usr/local/bin/sentinel_lab`: Benchmark evaluation engine.
* `/usr/local/bin/slab_generator`: Dataset serializer tool.

---

## 2. Verification Assertion

```bash
test -x /usr/local/bin/sentinel_lab && echo "[+] sentinel_lab binary verified"
```

