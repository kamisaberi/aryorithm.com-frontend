# Air-Gapped Sneakernet Telemetry & Model Synchronization

In classified defense installations and strictly segregated air-gapped facilities, network connections to outside networks are prohibited. 

`sentinel-nexus` supports **Sneakernet Operations**: exporting telemetry and importing signed models using removable physical storage media.

---

## 1. Sneakernet Workflow Overview

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ AIR-GAPPED ON-PREMISES ENCLAVE                              │
 │  - sentinel-nexus exports signed telemetry bundle to USB    │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Physical Media Transfer
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ INTERNET-CONNECTED ANALYSIS WORKSTATION                     │
 │  - Uploads telemetry to app.aryorithm.com                   │
 │  - Retrains weights via Cloud Forge farm                    │
 │  - Downloads cryptographically signed network_threat_v3.onnx│
 └──────────────────────────────┬──────────────────────────────┘
                                │ Physical Media Return
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ AIR-GAPPED ON-PREMISES ENCLAVE                              │
 │  - sentinel-nexus verifies signature and deploys to fleet   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: Exporting Telemetry Bundles

On the air-gapped Nexus server, run `export_telemetry_bundle.py` to extract audit logs, performance traces, and curated active-learning CSVs onto an encrypted USB drive:

```bash
sudo python3 /opt/sentinel-nexus/scripts/export_telemetry_bundle.py \
    --output-dir /media/secure_usb/nexus_export_20261005 \
    --include-curated-datasets \
    --include-audit-logs
```

The script signs the bundle using the local TPM 2.0 Attestation Identity Key.

---

## 3. Step 2: Importing Signed Model Artifacts

After fine-tuning on the analysis workstation, copy the signed model package (`network_threat_v3.onnx` and `network_threat_v3.manifest.json`) to the USB drive.

On the air-gapped Nexus server, import and verify the package:

```bash
sudo python3 /opt/sentinel-nexus/scripts/import_signed_model.py \
    --model-path /media/secure_usb/network_threat_v3.onnx \
    --manifest-path /media/secure_usb/network_threat_v3.manifest.json
```

### Verification Output:
```text
[*] Validating /media/secure_usb/network_threat_v3.onnx...
[+] SHA-256 Digest     : 3a7b41e2d9010000e9a2c31e847b2c94b13a7b41e2... (MATCHED)
[+] Digital Signature  : VALID (Signed by Aryorithm Master Signing CA)
[+] Safety Gate Proof  : VERIFIED (100% Detection across Golden Attacks)
[+] Model imported to fleet repository. Initiating STAGE_SHADOW_MODE rollout!
```

