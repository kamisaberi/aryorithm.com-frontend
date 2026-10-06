# Resolving Compiler Out-of-Memory (OOM) Fatal Crashes

When compiling large C++20 template libraries (such as `blackbox-sentinel`'s 26 subsystems or `sentinel-nexus`'s gRPC stubs), compilers (`clang++-16` or `g++-12`) allocate significant memory per translation unit during intermediate representation (IR) optimization passes.

If system memory is exhausted, the Linux kernel Out-of-Memory (OOM) killer abruptly terminates the compiler process.

---

## 1. Symptoms & Error Traces

```text
clang-16: error: unable to execute command: Killed
clang-16: error: clang frontend command failed due to signal (use -v to see invocation)
ninja: build stopped: subcommand failed.
```
Or with GCC:
```text
c++: fatal error: Killed signal terminated program cc1plus
compilation terminated.
```

Checking `dmesg` confirms the kernel OOM invocation:
```bash
dmesg -T | grep -i "oom-killer"
# Output: Out of memory: Killed process 24102 (clang++-16) total-vm:4120912kB, anon-rss:3214000kB
```

---

## 2. Root Cause Analysis

Running `ninja` or `make -j$(nproc)` on a multi-core machine with insufficient RAM attempts to compile too many translation units concurrently:

$$\text{Memory Demand} = \text{Parallel Jobs} \times 2.5\,\text{GB}$$

For an 8-core CPU with only 8 GB of RAM:
$$\text{Demand} = 8 \times 2.5\,\text{GB} = 20\,\text{GB} \gg 8\,\text{GB Available} \implies \text{KERNEL OOM KILL}$$

---

## 3. Permanent Remediation

### Option A: Throttle Parallel Compilation Jobs
Manually override the parallel build ceiling before executing the build:

```bash
# Cap compilation to 2 parallel jobs
export PARALLEL_JOBS=2
sudo -E ./install.sh
```

### Option B: Allocate an Emergency Swapfile
If compiling on a low-memory physical edge gateway (e.g., 4 GB or 8 GB RAM):

```bash
# Create a 4 GB swapfile
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Verify active swap
free -h
```

Re-run the installation: `sudo ./install.sh`.

