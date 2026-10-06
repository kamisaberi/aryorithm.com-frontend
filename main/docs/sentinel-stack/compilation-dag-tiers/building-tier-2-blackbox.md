# Tier 2 Build Mechanics: `blackbox-essential` (`libblackbox.so`)

`blackbox-essential` requires compiling two distinct targets:
1. The in-kernel eBPF packet mitigation filter (`xdp_filter.o`) using Clang targeting the BPF virtual machine.
2. The user-space active mitigation shared library (`libblackbox.so`), which links against `libxinfer.so`.

---

## 1. Step 1: Compiling In-Kernel eBPF Bytecode

Before running CMake, the installer executes `bpf/build_bpf.sh`:

```bash
cd /opt/sentinel-stack/src/blackbox/bpf

ARCH=$(uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/')

clang-16 -O2 -g \
    -target bpf \
    -D__TARGET_ARCH_${ARCH} \
    -I/usr/include \
    -I/usr/include/$(uname -m)-linux-gnu \
    -c xdp_filter.c -o xdp_filter.o

# Install BPF bytecode object to system directory
mkdir -p /usr/local/lib/bpf
cp xdp_filter.o /usr/local/lib/bpf/xdp_filter.o
```

---

## 2. Step 2: Compiling `libblackbox.so`

```bash
cd /opt/sentinel-stack/src/blackbox
mkdir -p build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DBLACKBOX_BUILD_TESTS=OFF \
    -DBLACKBOX_ENABLE_TPM=ON ..

ninja -j"${PARALLEL_JOBS}"
ninja install
ldconfig
```

---

## 3. Verification Assertion

```bash
# Verify shared library and eBPF bytecode
ldconfig -p | grep libblackbox
test -f /usr/local/lib/bpf/xdp_filter.o && echo "[+] xdp_filter.o verified"
```

