# Real-Time Process Scheduling (`SCHED_RR` Priority 98)

To enforce the **$< 0.84\,\mu\text{s}$ mitigation SLA**, the `sentinel` daemon must not be delayed by the Linux Completely Fair Scheduler (CFS) when other background processes (such as log rotation or cron jobs) execute.

---

## 1. Round-Robin Real-Time Scheduling (`SCHED_RR`)

`sentinel.service` requests the kernel's real-time round-robin scheduler:

```ini
CPUSchedulingPolicy=rr
CPUSchedulingPriority=98
Nice=-20
```

### Scheduling Properties:
* **Preemptive Execution:** A thread with `SCHED_RR` priority 98 immediately preempts standard user-space and kernel CFS threads.
* **Deterministic Execution:** The network driver poll loop executes immediately upon packet arrival, eliminating scheduling jitter.
* **OOM Immunity (`OOMScoreAdjust=-1000`):** Protects the mitigation daemon from being terminated by the kernel out-of-memory killer during severe DDoS floods.

---

## 2. Verifying Real-Time Priority

Verify the active scheduling policy using `chrt`:

```bash
chrt -p $(pgrep sentinel)
```

### Expected Output
```text
pid 14022's current scheduling policy: SCHED_RR
pid 14022's current scheduling priority: 98
```

