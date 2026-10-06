# Modbus APDU Vectorizer Plugin (`libxinfer_plugin_modbus.so`)

The Modbus APDU Vectorizer plugin parses raw industrial Application Protocol Data Units (APDU) from Modbus TCP packets (port 502) and maps register mutations, coil writes, and function codes into normalized tensors for industrial SCADA anomaly detection.

---

## 1. Frame Vector Representation

The plugin normalizes the Modbus ADU/APDU into a structured 16-dimensional tensor:

```text
 0: Function Code (Normalized / 127)
 1: Unit ID / Slave Address (/ 255)
 2: Starting Reference Register Address (/ 65535)
 3: Register / Coil Quantity (/ 2000)
 4: Byte Count (/ 256)
 5: Write Payload Mean Value (/ 65535)
 6: Write Payload Variance (/ 65535)
 7: Is Exception Response Flag (0.0 or 1.0)
 8: Exception Code Value (/ 16)
 9: Inter-Poll Arrival Delta (ms)
10: Payload Entropy (Shannon Entropy: 0.0 - 8.0)
11: Diagnostic Sub-Function Code (/ 65535)
12: Register Write Frequency Spike Counter
13: Read/Write Operation Ratio
14: Transaction ID Cyclic Deviation
15: Reserved Safety Critical Signal Flag
```

---

## 2. Ingestion & Transformation Routine

```cpp
#include <cstdint>
#include <span>
#include <cmath>

namespace xinfer::plugins {

#pragma pack(push, 1)
struct ModbusHeader {
    uint16_t transaction_id;
    uint16_t protocol_id; // Always 0 for Modbus TCP
    uint16_t length;
    uint8_t  unit_id;
    uint8_t  function_code;
};
#pragma pack(pop)

void vectorize_modbus_apdu(
    const uint8_t* raw_packet_bytes, 
    size_t packet_len,
    std::span<float, 16> out_tensor
) {
    if (packet_len < sizeof(ModbusHeader)) {
        out_tensor.fill(0.0f);
        return;
    }

    const auto* mb = reinterpret_cast<const ModbusHeader*>(raw_packet_bytes);

    out_tensor[0] = static_cast<float>(mb->function_code & 0x7F) / 127.0f;
    out_tensor[1] = static_cast<float>(mb->unit_id) / 255.0f;

    // Check if exception response
    bool is_exception = (mb->function_code & 0x80) != 0;
    out_tensor[7] = is_exception ? 1.0f : 0.0f;

    if (is_exception && packet_len > sizeof(ModbusHeader)) {
        out_tensor[8] = static_cast<float>(raw_packet_bytes[sizeof(ModbusHeader)]) / 16.0f;
    } else {
        out_tensor[8] = 0.0f;
    }

    // Parse Read/Write specifics for Function Codes 03, 04, 06, 16
    if (packet_len >= sizeof(ModbusHeader) + 4) {
        uint16_t start_addr = (raw_packet_bytes[sizeof(ModbusHeader)] << 8) | 
                               raw_packet_bytes[sizeof(ModbusHeader) + 1];
        uint16_t quantity   = (raw_packet_bytes[sizeof(ModbusHeader) + 2] << 8) | 
                               raw_packet_bytes[sizeof(ModbusHeader) + 3];
        
        out_tensor[2] = static_cast<float>(start_addr) / 65535.0f;
        out_tensor[3] = static_cast<float>(quantity) / 2000.0f;
    }
}

} // namespace xinfer::plugins
```

---

## 3. Threat Detection Use Cases

* Detects unauthorized Function Code `0x08` (Diagnostics) or `0x2B` (Encapsulated Interface Transport).
* Identifies out-of-range register write values indicative of malicious PLC set-point override attacks (e.g., Stuxnet, Triton).

