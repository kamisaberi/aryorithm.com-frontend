export interface FastPathStage {
  id: string;
  n: string;
  title: string;
  sub: string;
  detail: string;
}

export const STAGES: FastPathStage[] = [
  { id: "ingress", n: "01", title: "Physical 10GbE Frame Ingress", sub: "enp3s0f1 · NIC driver RX ring", detail: "The frame lands in the network card's receive descriptor ring. At this instant no kernel socket structure exists for it — the packet is still raw DMA memory owned by the driver." },
  { id: "xdp", n: "02", title: "eBPF / XDP Driver Hook", sub: "xdp_filter.o · verified bytecode", detail: "Blackbox Core's verified eBPF program executes inside the driver. It hashes the 5-tuple against blocked_ip_map and evaluates compiled constraint rules. A malicious match returns XDP_DROP here — before sk_buff allocation." },
  { id: "ring", n: "03", title: "Zero-Copy SPMC EventRingBuffer", sub: "AF_XDP UMEM · shared descriptor ring", detail: "Benign frames are handed to userspace by descriptor index, not by copy. The single-producer multi-consumer ring lives in shared memory mapped by both the kernel and every inference thread." },
  { id: "threads", n: "04", title: "Lock-Free Userspace Thread Processing", sub: "nanosecond ring read · no mutex", detail: "Consumer threads claim slots with atomic compare-and-swap on a cache-line-aligned cursor. There is no mutex anywhere in the hot path, so no thread can ever stall another." },
  { id: "scoring", n: "05", title: "libblackbox Threat Scoring Engine", sub: "libxinfer MAE · 32-dim feature vector", detail: "Features are extracted in place and scored by the xInfer Engine against the site's learned baseline. The reconstruction error becomes the threat score." },
  { id: "sync", n: "06", title: "Kernel Sync", sub: "bpf_map_update_elem(blocked_ip_map)", detail: "When a flow scores malicious, the verdict is pushed back into the kernel map. Every subsequent frame from that source is now dropped at stage 02 in 0.84 µs, with no userspace involvement at all." },
];

export const FRAME_TYPES = {
  benign: {
    label: "Benign Flow",
    color: "#00FFA3",
    summary: "Modbus/TCP read-holding-registers · FC 03 · 192.168.14.22",
    verdict: "XDP_PASS",
    path: ["ingress", "xdp", "ring", "threads", "scoring", "sync"],
    score: 0.06,
  },
  exploit: {
    label: "SCADA Exploit",
    color: "#FF3366",
    summary: "Modbus/TCP force-single-coil · FC 05 · 198.51.100.77 (unauthorised writer)",
    verdict: "XDP_DROP",
    path: ["ingress", "xdp"],
    score: 0.981,
  },
} as const;

export interface IdentityTier {
  id: string;
  tier: string;
  name: string;
  color: string;
  device: string;
  spec: string;
  strength: string;
  detail: string;
  available: boolean;
}

export const IDENTITY_TIERS: IdentityTier[] = [
  { id: "tpm", tier: "Tier 1", name: "Physical TPM 2.0", color: "#00FFA3", device: "/dev/tpmrm0", spec: "TCG TSS2 (ESAPI / FAPI)", strength: "Hardware root of trust", detail: "The preferred path. Blackbox Core opens the resource-managed TPM device and requests a signed PCR quote through the TCG TSS2 stack. The endorsement key never leaves the chip, so the identity cannot be cloned by copying a disk image.", available: true },
  { id: "vtpm", tier: "Tier 2", name: "Virtual TPM", color: "#FFB800", device: "/dev/tpm0 (swtpm)", spec: "QEMU swtpm / vTPM passthrough", strength: "Hypervisor-bound trust", detail: "For virtualised nodes such as Model V-Edge. The engine detects a QEMU swtpm backend and binds identity to the hypervisor-provided vTPM, inheriting the host's attestation posture rather than claiming hardware it does not have.", available: true },
  { id: "dmi", tier: "Tier 3", name: "Zero-TPM Fallback", color: "#FF3366", device: "/sys/class/dmi/id/product_uuid", spec: "SHA-256 hardware composite hash", strength: "Best-effort — degraded", detail: "Where no TPM of any kind exists, the engine derives a cryptographic composite hash from DMI product UUID, board serial and MAC set. This is explicitly marked degraded in the Nexus command center: it deters casual spoofing but is not a hardware root of trust.", available: false },
];

export const XDP_SNIPPET = `// xdp_filter.c — compiled by Clang to BPF bytecode, verified on load.
// Executes inside the NIC driver, before the kernel allocates sk_buff.

#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

struct {
  __uint(type, BPF_MAP_TYPE_HASH);
  __uint(max_entries, 1048576);
  __type(key, __u32);   // IPv4 source address
  __type(value, __u64); // drop counter
} blocked_ip_map SEC(".maps");

SEC("xdp")
int blackbox_filter(struct xdp_md *ctx) {
  void *data_end = (void *)(long)ctx->data_end;
  void *data     = (void *)(long)ctx->data;

  struct ethhdr *eth = data;
  if ((void *)(eth + 1) > data_end) return XDP_PASS;
  if (eth->h_proto != __constant_htons(ETH_P_IP)) return XDP_PASS;

  struct iphdr *ip = (void *)(eth + 1);
  if ((void *)(ip + 1) > data_end) return XDP_PASS;

  __u64 *hits = bpf_map_lookup_elem(&blocked_ip_map, &ip->saddr);
  if (hits) {
    __sync_fetch_and_add(hits, 1);
    return XDP_DROP;  // 0.84 us total, no sk_buff ever allocated
  }

  return XDP_PASS;      // hand to AF_XDP UMEM ring by descriptor
}

char _license[] SEC("license") = "GPL";`;

export const RING_SNIPPET = `// EventRingBuffer — single-producer, multi-consumer, wait-free reads.
// Cache-line aligned cursors prevent false sharing between threads.

template <typename T, size_t N>
class EventRingBuffer {
  static_assert((N & (N - 1)) == 0, "N must be a power of two");

  alignas(64) std::atomic<uint64_t> write_cursor_{0};
  alignas(64) std::atomic<uint64_t> read_cursor_{0};
  alignas(64) std::array<T, N> slots_{};

public:
  // Producer: the AF_XDP poll thread. Never blocks, never allocates.
  bool publish(const T &event) noexcept {
    const uint64_t w = write_cursor_.load(std::memory_order_relaxed);
    if (w - read_cursor_.load(std::memory_order_acquire) >= N)
      return false;              // ring full: apply backpressure
    slots_[w & (N - 1)] = event;
    write_cursor_.store(w + 1, std::memory_order_release);
    return true;
  }

  // Consumers: N inference threads claiming slots without a mutex.
  bool claim(T &out) noexcept {
    uint64_t r = read_cursor_.load(std::memory_order_relaxed);
    while (r < write_cursor_.load(std::memory_order_acquire)) {
      if (read_cursor_.compare_exchange_weak(
              r, r + 1, std::memory_order_acq_rel)) {
        out = slots_[r & (N - 1)];
        return true;
      }
    }
    return false;
  }
};`;
