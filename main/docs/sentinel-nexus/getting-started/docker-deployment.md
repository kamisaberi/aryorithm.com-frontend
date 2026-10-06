# Containerized Deployment & Docker Compose

For containerized environments and digital-twin cyber ranges (`sentinel-matrix`), `sentinel-nexus` can be deployed via Docker.

---

## 1. Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: "3.8"

services:
  nexus:
    build:
      context: .
      dockerfile: Dockerfile
    image: aryorithm/sentinel-nexus:2.4.0
    container_name: sentinel-nexus
    restart: always
    network_mode: "host" # Recommended for low-latency line-rate gRPC
    volumes:
      - /opt/sentinel-nexus/config:/etc/sentinel-nexus
      - /opt/sentinel-nexus/certs:/etc/sentinel-nexus/certs:ro
      - /opt/sentinel-nexus/data:/var/lib/sentinel-nexus/data
      - /opt/sentinel-nexus/models:/var/lib/sentinel-nexus/models
      - /opt/sentinel-nexus/forge_datasets:/var/lib/sentinel-nexus/forge_datasets
    environment:
      - LOG_LEVEL=INFO
      - RUST_LOG=info
    healthcheck:
      test: ["CMD", "curl", "-k", "-f", "https://localhost:9443/api/v1/health"]
      interval: 10s
      timeout: 3s
      retries: 3
```

---

## 2. Running the Container

```bash
# Build and run in background
docker compose up -d

# Check live logs
docker compose logs -f nexus
```

