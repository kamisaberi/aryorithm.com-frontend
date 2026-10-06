# Tier 2 Assertion Check: `libblackbox.so` & `xdp_filter.o`

Verifies that the active mitigation core (`libblackbox.so`) and the in-kernel eBPF bytecode filter (`xdp_filter.o`) are valid and discoverable.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify shared library in linker cache
ldconfig -p | grep -q libblackbox.so || exit 1

# 2. Verify eBPF bytecode object file
test -f /usr/local/lib/bpf/xdp_filter.o || exit 1

# 3. Verify that xdp_filter.o contains valid BPF ELF sections
llvm-objdump-16 -h /usr/local/lib/bpf/xdp_filter.o | grep -q "xdp" || exit 1
llvm-objdump-16 -h /usr/local/lib/bpf/xdp_filter.o | grep -q ".BTF" || exit 1

# 4. Verify header installation
test -f /usr/local/include/blackbox/blackbox.hpp || exit 1
```

---

## 2. Diagnostic Remediation

If `xdp_filter.o` lacks the `.BTF` section:
* Recompile the eBPF filter using `clang-16` with the `-g` flag enabled:
  ```bash
  cd /opt/sentinel-stack/src/blackbox/bpf && ./build_bpf.sh
  sudo cp xdp_filter.o /usr/local/lib/bpf/
  ```

