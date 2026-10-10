export interface Sector {
  href: string;
  title: string;
  protocols: string[];
  blurb: string;
}

/** §2.1D — six operational sector tiles, each deep-linking to Explore. */
export const SECTORS: Sector[] = [
  {
    href: "/explore?category=energy-utilities",
    title: "Electric Power & Utilities",
    protocols: ["IEC 61850 GOOSE/MMS", "IEC 60870-5-104", "DNP3"],
    blurb: "Substation trip validation, SCADA gateways, and grid telemetry guards.",
  },
  {
    href: "/explore?category=industrial-ot",
    title: "Manufacturing & Robotics",
    protocols: ["Siemens S7", "PROFINET RT", "EtherNet/IP CIP"],
    blurb: "PLC dissectors, cell firewalls, and robotic assembly monitors.",
  },
  {
    href: "/explore?q=modbus",
    title: "Oil, Gas & Chemical",
    protocols: ["Modbus TCP/RTU", "FOUNDATION Fieldbus", "HART-IP"],
    blurb: "Refinery loops, process instrumentation, and legacy fieldbus coverage.",
  },
  {
    href: "/explore?category=healthcare-iot",
    title: "Healthcare & Diagnostics",
    protocols: ["DICOM PACS C-STORE", "HL7 v2/v3"],
    blurb: "Radiology ingress filters with PHI-aware audit logging.",
  },
  {
    href: "/explore?category=aviation-defense",
    title: "Transport & Autonomy",
    protocols: ["MAVLink UAV", "AIS Maritime", "CAN Bus"],
    blurb: "Drone datalinks, vessel transponders, and vehicle ECU guards.",
  },
  {
    href: "/explore?category=ai-models",
    title: "Enterprise SIEM & SOC",
    protocols: ["Kafka", "QRadar LEEF", "CEF", "Syslog"],
    blurb: "Forwarders and neural models piping verdicts into your SOC lake.",
  },
];
