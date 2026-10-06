# 10-Minute Quickstart: Booting Nexus & Connecting Your First Node

This walkthrough guides you through generating local mTLS certificates, booting `sentinel-nexus`, and verifying communication with a test appliance.

---

## 1. Step 1: Generate Local Test mTLS Certificates

`sentinel-nexus` includes a script to generate development PKI certificates:

```bash
cd /opt/sentinel-nexus/scripts
chmod +x gen_certs.sh
sudo ./gen_certs.sh /etc/sentinel-nexus/certs
```

This generates `ca.crt`, `server.crt`, `server.key`, `client.crt`, and `client.key`.

---

## 2. Step 2: Launch `sentinel-nexus`

Start the daemon directly in foreground console mode to observe startup logs:

```bash
sentinel-nexus --config /etc/sentinel-nexus/nexus.yaml
```

### Expected Console Output
```text
================================================================================
                    ARYORITHM SENTINEL-NEXUS FLEET HUB
================================================================================
Version                : 2.4.0 (Release Build)
Node Capacity          : 5,000 Edge Appliances Supported
gRPC Fleet Service     : Listening on 0.0.0.0:50051 (mTLS 1.3 Active)
Web Command Center     : Listening on https://0.0.0.0:9443 (Zero CDNs)
Real-Time SSE Stream   : Listening on http://0.0.0.0:9444/stream
Active Model Version   : network_threat_v1.onnx (SHA256: e9a2c31e...)
================================================================================
[INFO] StateDatabase: Restored 0 registered nodes from data/nexus_state.json
[INFO] CollectiveDefenseBus: Armed and ready for sub-50ms rule fanouts.
```

---

## 3. Step 3: Connect a Blackbox-Sentinel Appliance

On your edge appliance, configure `/etc/sentinel/sentinel.yaml` to point to the Nexus IP:

```yaml
nexus_uplink:
  enabled: true
  hub_address: "10.240.0.10" # IP of your Sentinel-Nexus host
  hub_port: 50051
  tls_enabled: true
  ca_certificate: "/etc/sentinel/certs/ca.crt"
  client_certificate: "/etc/sentinel/certs/client.crt"
  client_private_key: "/etc/sentinel/certs/client.key"
```

Restart the edge appliance daemon (`sudo systemctl restart sentinel`). 

Within seconds, the Nexus console logs:
```text
[INFO] gRPC: Handshake completed for node 'edge-substation-alpha' [TPM: TIER 1 IFX]
[INFO] FleetRegistry: Node edge-substation-alpha registered. Total Active: 1
```

---

## 4. Step 4: Verify the Connection via CLI

In a new terminal on the Nexus server, query the active fleet:

```bash
nexus-ctl fleet list
```

### Output:
```text
UUID                       HOSTNAME                 STATUS    VERSION   DROPS    SLA (LATENCY)
edge-substation-alpha      substation-01.internal   ONLINE    2.4.0     1,420    0.82 µs
```

