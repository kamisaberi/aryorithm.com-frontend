export interface Sector {
  href: string;
  title: string;
  protocols: string[];
  blurb: string;
}

/** §2.1D — six operational sector tiles, each deep-linking to Explore. */
export const SECTORS: Sector[] = [
  {
    href: "/explore?search=IEC_60870",
    title: "Electric Power & Utilities",
    protocols: ["IEC 60870-5-104", "DNP3", "IEC 61850"],
    blurb: "Substation trip validation, SCADA gateways, and grid telemetry guards.",
  },
  {
    href: "/explore?search=S7COMM",
    title: "Manufacturing & Robotics",
    protocols: ["Siemens S7Comm", "PLC Safety", "Interlocks"],
    blurb: "PLC safety interlocks and unauthorized-stop prevention.",
  },
  {
    href: "/explore?search=MODBUS",
    title: "Oil, Gas & Chemical",
    protocols: ["Modbus TCP", "Coils", "Actuators"],
    blurb: "Coil-override prevention and valve-jitter mitigation.",
  },
  {
    href: "/explore?search=DICOM",
    title: "Healthcare & Diagnostics",
    protocols: ["DICOM PACS", "PHI DLP", "HL7"],
    blurb: "PHI privacy sanitizing for medical imaging networks.",
  },
  {
    href: "/explore?search=MAVLINK",
    title: "Transport & Autonomy",
    protocols: ["MAVLink", "UAV", "Flight Control"],
    blurb: "Spoofed disarm and landing-override protection for drones.",
  },
  {
    href: "/explore?search=HTTP2",
    title: "Web App Gateways, APIs",
    protocols: ["HTTP/2", "RST_STREAM", "DoS"],
    blurb: "Rapid-reset flood mitigation for web gateways.",
  },
];
