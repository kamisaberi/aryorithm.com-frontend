# Tier 3 Build Mechanics: `blackbox-sentinel` (`sentinel` daemon)

`blackbox-sentinel` is the commercial edge XDR appliance daemon. It links directly against **Tier 1 (`-lxinfer`)** and **Tier 2 (`-lblackbox`)**, compiling 26 native C++20 subsystems and 30 dynamic industrial protocol dissector plugins.

---

## 1. Linker Dependencies

The CMake build system resolves installed targets via standard package configurations:
* `find_package(xinfer REQUIRED CONFIG)`
* `find_package(blackbox REQUIRED CONFIG)`

---

## 2. Compilation Commands

```bash
cd /opt/sentinel-stack/src/sentinel
mkdir -p build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DSENTINEL_BUILD_TESTS=OFF \
    -DSENTINEL_BUILD_PLUGINS=ON ..

ninja -j"${PARALLEL_JOBS}"
ninja install
ldconfig
```

### Deployed Artifacts:
* `/usr/local/bin/sentinel`: Core daemon executable.
* `/usr/local/lib/sentinel-plugins/*.so`: 30 protocol dissector shared libraries.

---

## 3. Verification Assertion

```bash
/usr/local/bin/sentinel --version
# Expected Output: sentinel version 2.4.0 (Aryorithm Technologies B.V.)
```

