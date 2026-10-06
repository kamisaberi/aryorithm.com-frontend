# Deterministic Sensor & Industrial Asset Identification

Industrial automation networks often feature unmanaged legacy devices lacking hostname registration, DHCP leases, or SNMP agents. 

`sentinel-nexus` derives **Deterministic Sensor Identifiers** using physical network coordinates and protocol attributes.

---

## 1. Deterministic Identifier Derivation Formula

$$\text{SensorID} = \text{Protocol} \parallel \text{"-"} \parallel \text{IPv4} \parallel \text{"-"} \parallel \text{Port} \parallel \text{"-"} \parallel \text{UnitAddress}$$

```text
 Modbus TCP Example:
  • Protocol: "modbus"
  • Ingress IP: "10.240.0.101"
  • Port: "502"
  • Unit ID: "u1"
  ──► Resulting Sensor ID: "modbus-10.240.0.101-502-u1"

 Siemens S7Comm Example:
  • Protocol: "s7"
  • Ingress IP: "10.240.0.102"
  • Port: "102"
  • Rack/Slot: "r0-s2"
  ──► Resulting Sensor ID: "s7-10.240.0.102-102-r0-s2"
```

---

## 2. C++ Identifier Generator (`AssetTopology.hpp`)

```cpp
#pragma once

#include <string>
#include <sstream>
#include <cstdint>

namespace sentinel::nexus {

class SensorIdentifierGenerator {
public:
    static std::string generate_modbus_id(uint32_t ip, uint16_t port, uint8_t unit_id) {
        std::ostringstream ss;
        ss << "modbus-"
           << (ip & 0xFF) << "." << ((ip >> 8) & 0xFF) << "."
           << ((ip >> 16) & 0xFF) << "." << ((ip >> 24) & 0xFF)
           << "-" << port << "-u" << static_cast<int>(unit_id);
        return ss.str();
    }

    static std::string generate_s7_id(uint32_t ip, uint16_t port, uint8_t rack, uint8_t slot) {
        std::ostringstream ss;
        ss << "s7-"
           << (ip & 0xFF) << "." << ((ip >> 8) & 0xFF) << "."
           << ((ip >> 16) & 0xFF) << "." << ((ip >> 24) & 0xFF)
           << "-" << port << "-r" << static_cast<int>(rack) << "-s" << static_cast<int>(slot);
        return ss.str();
    }
};

} // namespace sentinel::nexus
```

