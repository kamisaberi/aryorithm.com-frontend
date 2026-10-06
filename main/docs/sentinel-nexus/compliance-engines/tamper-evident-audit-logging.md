# Cryptographic State Journaling in `data/nexus_state.json`

To satisfy legal chain-of-custody requirements, `sentinel-nexus` records all fleet state mutations, administrative actions, and policy changes into an append-only cryptographic journal anchored to **TPM 2.0 Platform Configuration Register 12 (PCR 12)**.

---

## 1. Cryptographic Hash Chaining Architecture

Every state mutation updates a forward-secure cryptographic hash chain:

$$H_0 = \text{TPM\_NEXUS\_BOOT\_SEED}$$

$$H_t = \operatorname{SHA-256}\left(H_{t-1} \parallel \text{Timestamp} \parallel \text{Action} \parallel \text{OperatorID} \parallel \text{PayloadHash}\right)$$

```text
 State Mutation 1           State Mutation 2           State Mutation 3
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │ Hash H_1             │   │ Hash H_2             │   │ Hash H_3             │
 │ SHA256(H_0 || Act_1) │──►│ SHA256(H_1 || Act_2) │──►│ SHA256(H_2 || Act_3) │
 └──────────────────────┘   └──────────────────────┘   └──────────┬───────────┘
                                                                  │
                                                                  ▼ Every 300 Seconds
                                                       ┌──────────────────────┐
                                                       │ TPM 2.0 PCR Extend   │
                                                       │ TPM2_PCR_Extend(     │
                                                       │   PCR_12, H_3)       │
                                                       └──────────────────────┘
```

---

## 2. Invariant Proof of Non-Repudiation

* If an attacker gains root access to the Nexus server and edits `nexus_state.json` to erase an incident or drop record:
  1. The recalculation of the forward hash chain diverges immediately ($H_t' \ne H_t$).
  2. The hash value stored inside hardware **TPM PCR 12** will not match the recalculated file digest, providing proof of database tampering to forensic investigators.

