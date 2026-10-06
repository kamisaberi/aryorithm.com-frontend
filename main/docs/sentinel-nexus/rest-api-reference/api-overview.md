# REST API Overview & Request Specifications

The `sentinel-nexus` REST API operates over **HTTPS TLS 1.3 on port 9443**. It provides administrative and programmatic control for external security orchestration (SOAR), operations dashboards, and continuous integration pipelines.

---

## 1. Base URL & Common Request Headers

```text
https://<NEXUS_HOST>:9443/api/v1
```

### Standard Request Headers

| Header Name | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| **`Authorization`** | String | **Mandatory** | Scoped Bearer token: `Bearer <JWT_TOKEN>`. |
| **`X-Tenant-ID`** | String | Optional | Scopes operations to a specific tenant in multi-tenant hubs. |
| **`Content-Type`** | String | Mandatory for POST/PUT | Must be `application/json` or `multipart/form-data`. |
| **`Accept`** | String | Optional | Preferred response: `application/json` or `text/event-stream`. |

---

## 2. Standard HTTP Status & Error Codes

All error responses return structured JSON compliant with the standard error schema:

```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Node with UUID 'edge-substation-delta' is not registered in the active fleet.",
  "status_code": 404,
  "timestamp_ns": 1791172800184000000
}
```

| HTTP Status Code | Meaning | Common Scenario |
| :--- | :--- | :--- |
| **`200 OK`** | Request Succeeded | Successful query or synchronous command execution. |
| **`201 Created`** | Resource Created | Successful model upload (`/api/v1/ota/stage`). |
| **`400 Bad Request`** | Invalid Parameters | Malformed JSON payload or out-of-range argument. |
| **`401 Unauthorized`** | Missing/Invalid Token| Bearer token expired, revoked, or signature failed. |
| **`403 Forbidden`** | Insufficient Rights | Operator role lacks permission for the action. |
| **`404 Not Found`** | Resource Missing | Node UUID or model artifact not found on disk. |
| **`422 Unprocessable`** | Validation Failure | SHA-256 digest does not match uploaded binary. |
| **`500 Internal Error`** | Server Fault | Internal database or gRPC dispatch failure. |

