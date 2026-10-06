# Semantic Dictionary Mapping: Tensor Coordinates to Physical Units

In raw neural tensor processing, an anomaly is represented as a deviation on abstract index `j`. The **Semantic Dictionary** (`src/xai/SemanticDictionary.hpp`) translates continuous tensor indices into human-readable physical parameters.

---

## 1. 32-Dimensional NetFlow/SCADA Mapping Dictionary

```text
 Index  Feature Identifier               Physical Engineering Units
 ─────  ───────────────────────────────  ──────────────────────────
   0    FLOW_DURATION                    Seconds (s)
   1    TOTAL_PACKETS_SRC_TO_DST         Packets (count)
   2    TOTAL_PACKETS_DST_TO_SRC         Packets (count)
   3    TOTAL_BYTES_SRC_TO_DST           Bytes (B)
   4    TOTAL_BYTES_DST_TO_SRC           Bytes (B)
   5    PACKET_LENGTH_MIN                Bytes (B)
   6    PACKET_LENGTH_MAX                Bytes (B)
   7    PACKET_LENGTH_MEAN               Bytes (B)
   8    PACKET_LENGTH_STDDEV             Bytes (B)
   9    TCP_WINDOW_BYTES_SRC             Bytes (B)
  10    TCP_WINDOW_BYTES_DST             Bytes (B)
  11    HEADER_LENGTH_SRC                Bytes (B)
  12    HEADER_LENGTH_DST                Bytes (B)
  13    AVG_SEGMENT_SIZE_SRC             Bytes (B)
  14    AVG_SEGMENT_SIZE_DST             Bytes (B)
  15    TCP_INITIAL_RTT                  Microseconds (µs)
  16    INTER_ARRIVAL_TIME_MEAN          Seconds (s)
  17    INTER_ARRIVAL_TIME_STDDEV        Seconds (s)
  18    FLOW_ACTIVE_TIME_MEAN            Seconds (s)
  19    FLOW_IDLE_TIME_MEAN              Seconds (s)
  20    FLOW_PACKETS_PER_SECOND          Packets per Second (pps)
  21    FLOW_BYTES_PER_SECOND            Bytes per Second (Bps)
  22    TCP_FLAG_SYN                     Binary Flag (0/1)
  23    TCP_FLAG_RST                     Binary Flag (0/1)
  24    TCP_FLAG_PSH                     Binary Flag (0/1)
  25    TCP_FLAG_ACK                     Binary Flag (0/1)
  26    TCP_FLAG_URG                     Binary Flag (0/1)
  27    TCP_FLAG_ECE                     Binary Flag (0/1)
  28    DOWN_UP_RATIO                    Scalar Ratio
  29    AVG_PACKET_SIZE                  Bytes (B)
  30    PROTOCOL_ENCODING                Protocol (6=TCP, 17=UDP)
  31    DESTINATION_PORT                 Port Number (1-65535)
```

---

## 2. In-Engine Un-Scaling Implementation (`SemanticDictionary.hpp`)

```cpp
#pragma once

#include <string_view>
#include <array>
#include <cmath>

namespace sentinel::nexus {

struct FeatureSemanticDescriptor {
    std::string_view identifier;
    std::string_view unit;
    double scale_factor;
    bool is_log_scaled;
};

class SemanticDictionary {
public:
    static double unscale_feature(uint32_t index, float normalized_val) noexcept {
        if (index >= DICTIONARY.size()) return static_cast<double>(normalized_val);
        const auto& desc = DICTIONARY[index];
        
        if (desc.is_log_scaled) {
            // Invert log1p: x = exp(norm) - 1.0
            return std::expm1(static_cast<double>(normalized_val));
        }
        return static_cast<double>(normalized_val) * desc.scale_factor;
    }

private:
    static constexpr std::array<FeatureSemanticDescriptor, 32> DICTIONARY{{
        {"FLOW_DURATION", "s", 1.0, true},
        {"TOTAL_PACKETS_SRC_TO_DST", "pkts", 1.0, true},
        // ... (Remaining 30 semantic descriptors)
        {"DESTINATION_PORT", "port", 65535.0, false}
    }};
};

} // namespace sentinel::nexus
```

