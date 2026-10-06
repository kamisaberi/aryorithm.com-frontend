# Walkthrough: Coordinated Multi-Site Zero-Day Attack Containment

This tutorial walks through an operational scenario: an adversary launches a coordinated Modbus register override attack targeting water treatment facilities across multiple regions, demonstrating how `sentinel-nexus` neutralizes the threat fleet-wide in **$< 50\,\text{milliseconds}$**.

---

## 1. Timeline of the Coordinated Incident

```text
 TIME: 02:14:00.000 UTC
 • Adversary initiates automated script targeting Modbus port 502 across:
   - Facility 1: Munich East Water Treatment (10.240.0.101)
   - Facility 2: Nuremberg Water Treatment  (10.240.0.102)
   - Facility 3: Augsburg Water Treatment   (10.240.0.103)
```

---

## 2. Step 1: Detection & Local In-Kernel Drop at Facility 1

At $t = 02:14:00.120$, the first malicious frame hits the Munich East appliance (`10.240.0.101`):
1. Subsystem `18_cps_sec` flags an illegal setpoint jump on high-pressure valve register `40001` ($+7{,}750\,\text{PSI}$).
2. Tier 2 `libblackbox.so` executes `XDP_DROP` in driver memory in **$0.81\,\mu\text{s}$**, protecting the physical valve.
3. The appliance transmits a `ThreatIoC` to `sentinel-nexus` over gRPC port 50051:

```text
[02:14:00.134] Nexus Hub receives ThreatIoC from 'edge-substation-munich':
    Target IP : 198.51.100.42
    Threat ID : MODBUS_REGISTER_OVERRIDE (T0855)
    Severity  : CRITICAL
```

---

## 3. Step 2: Collective Defense Fanout ($< 50\,\text{ms}$)

At $t = 02:14:00.136$:
1. The `IocBroadcaster` on `sentinel-nexus` initiates an asynchronous parallel fanout over active gRPC streams.
2. A `FleetDefenseRule` is dispatched to all 4,999 remaining appliances:

```text
[02:14:00.158] Nexus Hub completes fanout:
    Total Dispatched Nodes : 4,999
    Fleet Propagation Time : 24.2 milliseconds
```

---

## 4. Step 3: Proactive Pre-Emptive Drops at Facilities 2 and 3

At $t = 02:14:00.160$, the adversary's automated scanner begins probing Facility 2 (Nuremberg) and Facility 3 (Augsburg):
1. The attacker's packets arrive at the network interfaces.
2. Because the Nuremberg and Augsburg nodes already have `198.51.100.42` programmed into their in-kernel `blocked_ip_map` tables, **the packets are dropped immediately in driver space ($0.79\,\mu\text{s}$)**.
3. The attack fails across all secondary sites with **zero application-layer compromise**.

---

## 5. Verifying Incident Details in the Web Console

Open **`https://10.240.0.10:9443`** and navigate to **Threat Management $\to$ Incident History**:
* The incident timeline illustrates the single origin point and subsequent pre-emptive drops across the fleet.
* The XAI viewer provides the root-cause register deviation evidence ready for regulatory submission.

