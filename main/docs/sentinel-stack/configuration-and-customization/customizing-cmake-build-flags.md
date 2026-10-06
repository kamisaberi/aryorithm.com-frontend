# Customizing Compiler Optimization Flags (`-O3`, `-march=native`, `-flto`)

`sentinel-stack` allows performance engineers to inject custom compiler and linker flags into downstream CMake projects to maximize throughput on specific edge hardware architectures.

---

## 1. Enabling Microarchitecture Optimization (`-march=native`)

If building on dedicated, homogeneous edge appliances (e.g., an Intel Core Ultra or AMD EPYC server), enable target microarchitecture instructions (AVX-512, BMI2, FMA):

Edit `configs/stack.yaml`:

```yaml
build_options:
  enable_native_arch: true # Appends -march=native -mtune=native to CMAKE_CXX_FLAGS
```

---

## 2. Enabling Link-Time Optimization (LTO / ThinLTO)

To enable whole-program inter-procedural optimization across native shared objects:

```yaml
build_options:
  enable_lto: true # Passes -DCMAKE_INTERPROCEDURAL_OPTIMIZATION=TRUE to CMake
```

---

## 3. Injecting Sanitizers for Debugging

To compile the entire stack with address and undefined behavior sanitizers for testbed fuzzing:

Append custom flags to `extra_cxx_flags` in `configs/stack.yaml`:

```yaml
build_options:
  build_type: "Debug"
  extra_cxx_flags: "-fsanitize=address,undefined -fno-omit-frame-pointer"
```

The installer injects these flags across all CMake configure steps automatically.
