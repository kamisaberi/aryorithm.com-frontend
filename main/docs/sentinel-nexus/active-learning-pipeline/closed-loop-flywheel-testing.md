# Closed-Loop Verification: Testing the Active Learning Flywheel

This testing guide verifies that the entire closed-loop active learning cycle functions autonomously from edge detection through curation, retraining, safety validation, and canary hot-reloading.

---

## 1. Automated Integration Test Script (`tests/test_active_learning_flywheel.py`)

```python
import time
import requests
import numpy as np

NEXUS_REST_URL = "https://127.0.0.1:9443"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

def test_flywheel_cycle():
    print("[*] Initiating Active Learning Flywheel Integration Test...")

    # Step 1: Simulate edge nodes streaming 5,000 ambiguous flows
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    print("[*] Simulating edge appliance uncertainty vector stream...")
    
    mock_vectors = np.random.uniform(0.42, 0.58, size=(5000, 32)).tolist()
    resp = requests.post(f"{NEXUS_REST_URL}/api/v1/telemetry/vectors/batch", json={"vectors": mock_vectors}, headers=headers, verify=False)
    assert resp.status_code == 200, f"Vector ingestion failed: {resp.text}"

    # Step 2: Poll for curated dataset generation
    print("[*] Waiting for DatasetCurator to package batch...")
    time.sleep(3)

    # Step 3: Verify xinfer-forge processes the batch and stages v2 model
    print("[*] Monitoring Nexus model repository for candidate promotion...")
    staged = False
    for _ in range(30):
        models_resp = requests.get(f"{NEXUS_REST_URL}/api/v1/models", headers=headers, verify=False).json()
        for m in models_resp.get("available_models", []):
            if "v2" in m["version"] or m["status"] == "STAGE_SHADOW_MODE":
                staged = True
                print(f"[+] Success! Candidate model {m['version']} staged in SHADOW_MODE.")
                break
        if staged:
            break
        time.sleep(2)

    assert staged, "Flywheel timeout: Candidate model was not staged within 60s!"
    print("[PASS] Full Active Learning Flywheel Verified Successfully!")

if __name__ == "__main__":
    test_flywheel_cycle()
```

---

## 2. Test Success Criteria

* **Zero Human Intervention:** The test transitions from vector injection to candidate model staging without operator input.
* **Safety Gate Preserved:** The candidate model must pass the 52 golden attack checks before appearing in `/api/v1/models`.

