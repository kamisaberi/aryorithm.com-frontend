# Tier 3 Assertion Check: `blackbox-sentinel` (`sentinel` daemon)

Verifies that the edge appliance daemon compiles, links against Tier 1 and Tier 2, and discovers dynamic protocol plugins.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify daemon binary execution and version output
/usr/local/bin/sentinel --version | grep -q "version 2.4.0" || exit 1

# 2. Verify binary links cleanly against libxinfer and libblackbox
ldd /usr/local/bin/sentinel | grep -q "libxinfer.so" || exit 1
ldd /usr/local/bin/sentinel | grep -q "libblackbox.so" || exit 1

# 3. Verify protocol dissector plugin count (Must be >= 25)
PLUGIN_COUNT=$(ls -1 /usr/local/lib/sentinel-plugins/*.so 2>/dev/null | wc -l)
if [ "$PLUGIN_COUNT" -lt 25 ]; then
    echo "[-] Only ${PLUGIN_COUNT} plugins found (Expected >= 25)" >&2
    exit 1
fi
```

---

## 2. Diagnostic Remediation

If `sentinel --version` fails with a missing library error:
* Check library search paths using `ldd /usr/local/bin/sentinel`.
* Confirm that `libxinfer.so` and `libblackbox.so` reside in `/usr/local/lib`.

