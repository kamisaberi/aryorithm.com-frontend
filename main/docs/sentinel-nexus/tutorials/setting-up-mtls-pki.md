# Setting Up Mutual TLS (mTLS) PKI Infrastructure

Every edge appliance authenticates to `sentinel-nexus` using **Mutual TLS 1.3**. This tutorial demonstrates how to generate an offline Certificate Authority (CA), issue the Nexus server certificate, and sign edge appliance client keys using `gen_certs.sh`.

---

## 1. Public Key Infrastructure (PKI) Layout

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Nexus Root Certificate Authority (ca.crt & ca.key)          │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ Signs Server Cert                             ▼ Signs Client Certs
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │ Nexus Hub Certificate       │         │ Edge Appliance Certificates │
 │ (server.crt & server.key)   │         │ (appliance.crt / key)       │
 │ SAN: DNS:nexus.internal     │         │ CN: edge-substation-alpha   │
 └─────────────────────────────┘         └─────────────────────────────┘
```

---

## 2. Generating Certificates via `scripts/gen_certs.sh`

Execute the automated PKI setup script:

```bash
cd /opt/sentinel-nexus/scripts
chmod +x gen_certs.sh
sudo ./gen_certs.sh /etc/sentinel-nexus/certs
```

### Script Execution Steps:

```bash
# 1. Generate Root CA (Valid 10 Years)
openssl req -x509 -new -nodes -newkey rsa:4096 -days 3650 \
    -keyout /etc/sentinel-nexus/certs/ca.key \
    -out /etc/sentinel-nexus/certs/ca.crt \
    -subj "/C=DE/O=Aryorithm/CN=Sentinel-Nexus-Root-CA"

# 2. Generate Server Certificate with Subject Alternative Names (SAN)
openssl req -new -nodes -newkey rsa:2048 \
    -keyout /etc/sentinel-nexus/certs/server.key \
    -out /etc/sentinel-nexus/certs/server.csr \
    -subj "/C=DE/O=Aryorithm/CN=nexus.internal"

cat <<EOF > /tmp/server_ext.cnf
subjectAltName = DNS:nexus.internal,IP:10.240.0.10,IP:127.0.0.1
EOF

openssl x509 -req -days 1095 \
    -in /etc/sentinel-nexus/certs/server.csr \
    -CA /etc/sentinel-nexus/certs/ca.crt \
    -CAkey /etc/sentinel-nexus/certs/ca.key \
    -CAcreateserial \
    -out /etc/sentinel-nexus/certs/server.crt \
    -extfile /tmp/server_ext.cnf
```

---

## 3. Testing the mTLS Handshake with `grpcurl`

Test connection to the gRPC fleet endpoint:

```bash
grpcurl -cacert /etc/sentinel-nexus/certs/ca.crt \
        -cert /etc/sentinel-nexus/certs/client.crt \
        -key /etc/sentinel-nexus/certs/client.key \
        10.240.0.10:50051 list
```

### Expected Output
```text
grpc.health.v1.Health
sentinel.nexus.FleetOrchestrator
```

