# Verifying Installation

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Built-in self-tests and sanity checks.

## Self-test binary

xinfer-selftest runs backend probing, tensor round-trips, and a 1000-inference latency histogram.

## Interpreting results

All checks must print PASS. A backend showing 'absent' means its driver device is missing, not a broken install.

```bash
$ xinfer-selftest
[+] openvino backend .......... READY
[+] tensor round-trip ......... PASS (0 copies)
[+] 1000 inferences .......... p50 11.8us p99 14.1us
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
