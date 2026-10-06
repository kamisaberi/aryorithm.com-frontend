# Tier 5 Assertion Check: `sentinel-lab` (`sentinel_lab`)

Verifies that the SLAB benchmark research testbed compiles, executes, and locates its dataset conversion tools.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify testbed binary execution
test -x /usr/local/bin/sentinel_lab || exit 1

# 2. Check help flag response
/usr/local/bin/sentinel_lab --help | grep -q "SLAB" || exit 1

# 3. Verify dataset serializer script
test -f /opt/sentinel-stack/src/lab/tools/csv_to_slab.py || exit 1
```

---

## 2. Diagnostic Remediation

If `sentinel_lab` fails to build:
* Check CMake configuration options in `/opt/sentinel-stack/src/lab/build/CMakeCache.txt`.

