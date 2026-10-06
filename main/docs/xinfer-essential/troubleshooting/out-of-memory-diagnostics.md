# Out-of-Memory (OOM) & DMA Allocation Diagnostics

This guide addresses memory locking, DMA allocation, and buffer pool failures in constrained edge environments.

---

## 1. Locked Memory Limit Exceeded (`ERR_MEMORY_PIN_FAILED`)

### Symptom
```text
[xInfer FATAL] mlock() failed with errno = 12 (Cannot allocate memory)
[xInfer Exception] ERR_MEMORY_PIN_FAILED: Memory locking limit exceeded
```

### Cause
The Linux security limit `RLIMIT_MEMLOCK` restricts the number of RAM pages an unprivileged process can lock into physical memory.

### Remediation
1. Inspect current process limits:
   ```bash
   ulimit -l
   ```
2. Update `/etc/security/limits.conf` to grant unlimited locked memory:
   ```text
   *    soft    memlock    unlimited
   *    hard    memlock    unlimited
   ```
3. For systemd services, add the following to the unit file:
   ```ini
   [Service]
   LimitMEMLOCK=infinity
   ```

---

## 2. Linux Kernel CMA / DMA-Heap Exhaustion

### Symptom
```text
[xInfer Exception] ERR_OUT_OF_MEMORY: Kernel DMA heap allocation failed (/dev/dma_heap/system)
dmesg output: cma: cma_alloc: alloc failed, req-size: 1024 pages, ret: -12
```

### Cause
Embedded vision systems and DMA-BUF zero-copy pipelines require contiguous physical memory reserved via the kernel Contiguous Memory Allocator (CMA). If the CMA pool is exhausted by camera drivers or display framebuffers, allocations fail.

### Remediation
Increase the kernel CMA reservation by modifying `/boot/cmdline.txt` (on ARM) or `/etc/default/grub` (on x86):

```text
cma=512M
```

Reboot and verify the allocated pool size:
```bash
cat /proc/meminfo | grep -i cma
```

---

## 3. Diagnosing IOMMU Faults

### Symptom
High-bandwidth DMA-BUF execution freezes the machine or emits kernel page faults:
```text
dmesg output: DMAR: DRHD: handling fault status reg 2
dmesg output: DMAR: [DMA Read] Request device [01:00.0] fault addr 0x...
```

### Remediation
Verify whether the IOMMU is running in pass-through mode:
```text
GRUB_CMDLINE_LINUX_DEFAULT="intel_iommu=on iommu=pt"
```
Setting `iommu=pt` enables hardware translation pass-through for high-throughput PCIe network and accelerator devices while preventing false page protection faults.

