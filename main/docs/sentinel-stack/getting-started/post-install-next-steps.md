# Post-Installation Next Steps

Once `sentinel-stack` completes installation and smoke tests verify nominal status, explore the three management interfaces:

---

## 1. Access the Local Web Command Center (Port 9443)

Open your desktop browser and navigate to:

👉 **`https://localhost:9443`**

Log in using the default administrative credentials configured during installation. Explore:
* The **HTML5 Canvas Radial Fleet Topology**.
* The **Real-Time MITRE ATT&CK Threat Matrix**.
* Active in-kernel eBPF drop rules.

---

## 2. Interrogate the Fleet via `nexus-ctl`

Test the command-line administration tool:

```bash
# Query managed edge appliances
nexus-ctl fleet list

# Check active Canary OTA rollout progression
nexus-ctl ota status

# View recent explainable AI (XAI) feature attributions
nexus-ctl report scada
```

---

## 3. Launch the Digital Twin Cyber-Range (`sentinel-matrix`)

Because `sentinel-stack` harvested host binaries and libraries into `sentinel-matrix/shared/lib/`, you can launch the containerized simulation mesh immediately:

```bash
cd sentinel-matrix
make up
make tui
```

