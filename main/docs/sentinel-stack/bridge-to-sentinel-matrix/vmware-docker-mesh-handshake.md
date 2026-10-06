# One-Touch Handover: Host Compilation to Mesh Launch

The ultimate goal of `sentinel-stack` is to enable immediate testing inside the `sentinel-matrix` digital twin mesh with a **one-touch handover**.

---

## 1. Handshake Flow

```text
 1. Developer runs: sudo ./install.sh
    [ Compiles all 6 tiers -> Installs to host -> Harvests into matrix/shared/ ]
                           │
                           ▼ Installation completes in < 8 minutes
 2. Developer enters simulation directory:
    $ cd /opt/sentinel-matrix
                           │
                           ▼
 3. Developer launches mesh:
    $ make up
    [ Containers boot instantly using pre-staged binaries and libraries ]
                           │
                           ▼
 4. Developer opens live dashboard:
    $ make tui
    [ Full cyber-range digital twin is live and interactive! ]
```

---

## 2. End-to-End Handshake Verification

Verify that the staged matrix directory is ready for launch:

```bash
# Audit staged matrix files
ls -lh /opt/sentinel-matrix/shared/bin/
ls -lh /opt/sentinel-matrix/shared/lib/
```

### Expected Output
```text
shared/bin:
-rwxr-xr-x 1 root root 1.4M sentinel
-rwxr-xr-x 1 root root 2.1M sentinel-nexus
-rwxr-xr-x 1 root root 480K nexus-ctl

shared/lib:
-rwxr-xr-x 1 root root 284K libabsl_synchronization.so.20260107
-rwxr-xr-x 1 root root 412K libre2.so.11
-rwxr-xr-x 1 root root 3.8M libgrpc++.so.1.62
```

The cyber-range is ready to launch via `make up`.

