# OTA Model Management Endpoints (`/api/v1/ota/*` & `/api/v1/models/*`)

These endpoints govern Canary model staging, artifact streaming, rollout state advancement, and emergency rollbacks.

---

## 1. Stage New Model Artifact: `POST /api/v1/ota/stage`

Accepts an ONNX model binary and cryptographic manifest from `xinfer-forge` or a CI/CD pipeline.

### Request (Multipart Form-Data):
```bash
curl -k -X POST https://localhost:9443/api/v1/ota/stage \
    -H "Authorization: Bearer $TOKEN" \
    -F "model_binary=@network_threat_v2.onnx" \
    -F "manifest_json=@network_threat_v2.manifest.json"
```

### Response (`201 Created`):
```json
{
  "status": "STAGED",
  "model_version": "2.4.0",
  "sha256": "e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000",
  "deployment_stage": "STAGE_SHADOW_MODE",
  "canary_cohort_percentage": 0
}
```

---

## 2. Advance Rollout Stage: `POST /api/v1/ota/advance`

Promotes the candidate model along the staged rollout progression:  
`SHADOW_MODE` $\longrightarrow$ `CANARY_5_PCT` $\longrightarrow$ `FLEET_WIDE`.

### Request:
```bash
curl -k -X POST https://localhost:9443/api/v1/ota/advance \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"target_stage": "CANARY_5_PCT"}'
```

---

## 3. Trigger Emergency Rollback: `POST /api/v1/ota/rollback`

Forces an immediate abort of active Canary models, reverting all edge appliances to the previous verified baseline in $< 50\,\text{ms}$.

---

## 4. Download Model Binary: `GET /api/v1/models/{filename}`

Streams the raw binary ONNX model to edge appliances during hot-reloads. Returns `Content-Type: application/octet-stream` and `X-Checksum-SHA256`.

