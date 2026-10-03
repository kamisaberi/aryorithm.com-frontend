# Verifying Services

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Validating gRPC (50051), REST (9443), and SSE (9444) ports.

## Checks

One probe per port; all three must answer before appliances connect.

## TLS

mTLS on 50051, HTTPS on 9443, event stream on 9444.

```bash
$ nexus-ctl fleet list          # 50051 alive
$ curl -sk https://localhost:9443/api/v1/ota/status
$ curl -sN https://localhost:9444/api/v1/telemetry/stream | head
```

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
