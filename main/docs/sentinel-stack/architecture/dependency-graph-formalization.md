# Dependency Graph Formalization: Symbol Resolution

To understand why linear topological ordering is strictly enforced, this document examines the C++ dynamic symbol table dependencies across the shared objects.

---

## 1. Symbol Resolution Table

| Tier Binary | Required Headers | Linked Shared Libraries | Exported Symbols Used by Downstream Tiers |
| :--- | :--- | :--- | :--- |
| **`libxinfer.so`** ($T_1$) | Standard POSIX, Level Zero, CUDA | Direct driver APIs | `xinfer::InferenceEngine::initialize()`<br>`xinfer::Tensor::create_from_raw_host()` |
| **`libblackbox.so`** ($T_2$)| `<xinfer/xinfer.hpp>` | `-lxinfer` | `blackbox::XdpManager::block_ip()`<br>`blackbox::EventRingBuffer::try_enqueue()` |
| **`sentinel`** ($T_3$) | `<xinfer/xinfer.hpp>`<br>`<blackbox/blackbox.hpp>` | `-lxinfer`<br>`-lblackbox` | Native 26 subsystems, 30 protocol dissectors |
| **`forge-cli`** ($T_4$) | Python C-Extensions | PyTorch, ONNX | Exports `network_threat_v2.onnx` targeting $T_1$ |
| **`sentinel_lab`** ($T_5$)| `<xinfer/xinfer.hpp>`<br>`<blackbox/blackbox.hpp>` | `-lxinfer`<br>`-lblackbox` | SLAB protocol evaluation harness |
| **`sentinel-nexus`** ($T_6$)| `<blackbox/abi.hpp>` | `-lgrpc++`<br>`-lprotobuf` | Master command plane coordinating $T_3$ and $T_4$ |

---

## 2. Dynamic Linker Cache Refreshes (`ldconfig`)

In Linux, when a shared library is installed to `/usr/local/lib/`, it is not immediately discoverable by the GNU dynamic linker (`ld.so`) until the system cache (`/etc/ld.so.cache`) is refreshed.

`sentinel-stack` enforces an **Intermediate Cache Refresh Invariant**:

```bash
# Executed immediately after compiling Tier N:
ninja install
ldconfig
# Tier N+1 build begins ONLY after ldconfig returns 0
```

Without running `ldconfig` sequentially between tiers, compiling Tier 3 will fail during the link step with:
```text
/usr/bin/ld: cannot find -lxinfer: No such file or directory
/usr/bin/ld: cannot find -lblackbox: No such file or directory
```

