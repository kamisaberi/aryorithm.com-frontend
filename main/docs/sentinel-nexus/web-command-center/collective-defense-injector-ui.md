# Collective Defense Manual Injector UI

The Web Command Center includes a manual **Collective Defense Injector**, allowing security operators to broadcast emergency IP block rules to all 5,000 edge appliances with a single click.

---

## 1. Injector User Interface

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ MANUAL COLLECTIVE DEFENSE INJECTOR                                          │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ Target IPv4 Address    : [ 198.51.100.42                 ]                  │
 │ Ephemeral TTL (Seconds): [ 3600                          ] (1 Hour)         │
 │ Threat Classification  : [ EMERGENCY_OPERATOR_BLOCK      ]                  │
 │ MITRE Technique ID     : [ T0855                         ]                  │
 │ Justification / Ticket : [ INC-8941: Active Wellhead Attack ]              │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ [ BROADCAST IMMUNITY FLEET-WIDE (< 50ms) ]        [ PURGE / UNBLOCK IP ]    │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Client-Side Submission Handler (`app.js`)

```javascript
async function broadcastManualThreat() {
    const payload = {
        target_ip: document.getElementById('target_ip').value,
        ttl_seconds: parseInt(document.getElementById('ttl_seconds').value, 10),
        threat_name: document.getElementById('threat_name').value,
        mitre_id: document.getElementById('mitre_id').value,
        justification: document.getElementById('justification').value
    };

    const response = await fetch('/api/v1/threats/broadcast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok) {
        showToast(`Rule broadcast to ${result.dispatched_nodes} appliances in ${result.elapsed_ms}ms!`, 'success');
    } else {
        showToast(`Broadcast failed: ${result.error}`, 'error');
    }
}
```

