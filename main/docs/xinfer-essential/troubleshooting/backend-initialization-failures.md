# Hardware Backend Initialization Failures

This guide covers troubleshooting driver failures across specific hardware targets.

---

## 1. Intel Level Zero / OpenVINO NPU Initialization Failure

### Symptom
```text
[xInfer FATAL] Initialization failed: zeInit() failed with ZE_RESULT_ERROR_UNINITIALIZED (-1)
[OpenVINO] Failed to query device capabilities for: NPU
```

### Diagnosis Checklist
1. **Device Node Access:** Check character device permissions:
   ```bash
   ls -l /dev/accel/accel*
   ```
2. **User Group Membership:** Ensure the executing user belongs to the `render` and `video` groups:
   ```bash
   groups # Must list render
   sudo usermod -aG render,video $USER
   ```
3. **NPU Module Status:** Verify that the Linux kernel accelerator driver is active:
   ```bash
   dmesg | grep -i intel_vpu
   ```

---

## 2. Rockchip RKNN Device Busy or Missing (`/dev/rknpu`)

### Symptom
```text
rknn_init failed! ret = -1, errno = 16 (Device or resource busy)
rknn_init failed! ret = -6, cannot open /dev/rknpu
```

### Remediation
1. **Permission Check:** Verify `/dev/rknpu` read/write permissions:
   ```bash
   sudo chmod 666 /dev/rknpu
   ```
2. **Core Contention:** Another background daemon may have opened an exclusive lock on all three NPU cores. Check for active processes:
   ```bash
   sudo fuser -v /dev/rknpu
   ```
3. **Core Affinity:** Assign explicit individual cores in `RKNNOptions` (`CORE_0`, `CORE_1`, or `CORE_2`) instead of `CORE_ALL` to support concurrent processes.

---

## 3. NVIDIA CUDA Driver / TensorRT Initialization Failure

### Symptom
```text
[xInfer Exception] cudaErrorNoDevice: no CUDA-capable device is detected
[TensorRT] Error Code 1: Cuda runtime execution failed (cudaGetDeviceCount)
```

### Remediation
1. Verify the NVIDIA kernel driver is loaded:
   ```bash
   nvidia-smi
   ```
2. If running within a Docker container, confirm that the NVIDIA Container Toolkit is installed and the `--gpus all` flag is supplied:
   ```bash
   docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
   ```

---

## 4. Hailo-8 M.2 Device Link Failure

### Symptom
```text
[HailoRT] [error] Driver error: Failed to communicate with PCIe board (/dev/hailo0)
```

### Remediation
1. Check if the PCIe device dropped off the bus due to power-management suspension:
   ```bash
   lspci -d 1e60:
   ```
2. Disable PCIe Active State Power Management (ASPM) by appending the following to the kernel boot parameters in `/etc/default/grub`:
   ```text
   GRUB_CMDLINE_LINUX_DEFAULT="pcie_aspm=off"
   ```
   Run `sudo update-grub` and reboot.

