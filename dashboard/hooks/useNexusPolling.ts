"use client";

import { useEffect, useRef, useState } from "react";
import {
  backend,
  NEXUS_TENANT_ID,
  type FleetSyncResult,
  type GlobalFeedItem,
} from "@/lib/backend";

interface NexusPollingState {
  lastSync: FleetSyncResult | null;
  lastFeed: GlobalFeedItem[] | null;
  syncError: string | null;
  feedError: string | null;
  lastSyncAt: string | null;
  lastFeedAt: string | null;
}

/**
 * Nexus live polling — mounted once in the admin layout so the dashboard
 * hits the FastAPI backend on the same cadence as the edge collector:
 * - POST /api/v1/fleet/sync every 5s (watch uvicorn for [fleet/sync] logs)
 * - GET  /api/v1/threats/global-feed every 20s (watch for [threats/global-feed])
 */
export function useNexusPolling(token: string | null, enabled = true) {
  const [state, setState] = useState<NexusPollingState>({
    lastSync: null,
    lastFeed: null,
    syncError: null,
    feedError: null,
    lastSyncAt: null,
    lastFeedAt: null,
  });
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const doSync = async () => {
      try {
        const res = await backend.fleetSync(
          {
            tenant_id: NEXUS_TENANT_ID,
            nexus_id: "NEXUS-LOCAL",
            nexus_version: "1.0.0",
            timestamp: Math.floor(Date.now() / 1000),
            nodes_count: 2,
            nodes: [
              {
                node_id: "NODE-8fa901",
                site: "PowerGrid-North-01",
                hostname: "sentinel-substation-01",
                status: "ONLINE",
                cpu_pct: 14.2,
                ebpf_drops: 48,
                mitigation_latency_us: 0.84,
                sensors_count: 3,
                sensors: [
                  { sensor_id: "PLC-000C29A1-UNIT1", name: "Main Transformer PLC (Siemens S7)", type: "INDUSTRIAL_PLC", protocol: "MODBUS_TCP", ip_address: "192.168.1.10", status: "ACTIVE", last_packet_seen_sec_ago: 0.2 },
                  { sensor_id: "COIL-105-VALVE", name: "Cooling Valve Pressure Actuator", type: "SCADA_ACTUATOR", protocol: "MODBUS_TCP", ip_address: "192.168.1.10", status: "ACTIVE", last_packet_seen_sec_ago: 0.4 },
                  { sensor_id: "CAM-PERIMETER-CH01", name: "Substation Yard Thermal Camera", type: "OPTICAL_VISION", protocol: "RTSP_H264", ip_address: "192.168.1.50", status: "FAULT_NO_DATA", last_packet_seen_sec_ago: 45.0 },
                ],
              },
              {
                node_id: "NODE-c34b12",
                site: "Metro-General-Hospital",
                hostname: "sentinel-hospital-pacs",
                status: "ONLINE",
                cpu_pct: 18.7,
                ebpf_drops: 35,
                mitigation_latency_us: 0.79,
                sensors_count: 1,
                sensors: [
                  { sensor_id: "DICOM-MRI_DEPT1-10.0.1.50", name: "Radiology MRI Scanner", type: "MEDICAL_PACS", protocol: "DICOM_C_STORE", ip_address: "10.0.1.50", status: "ACTIVE", last_packet_seen_sec_ago: 1.1 },
                ],
              },
            ],
          },
          tokenRef.current
        );
        if (!cancelled) {
          setState((s) => ({
            ...s,
            lastSync: res,
            syncError: null,
            lastSyncAt: new Date().toISOString(),
          }));
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            syncError: e instanceof Error ? e.message : "fleet/sync failed",
          }));
        }
      }
    };

    const doFeed = async () => {
      try {
        const res = await backend.globalFeed(tokenRef.current);
        if (!cancelled) {
          setState((s) => ({
            ...s,
            lastFeed: res,
            feedError: null,
            lastFeedAt: new Date().toISOString(),
          }));
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            feedError: e instanceof Error ? e.message : "global-feed failed",
          }));
        }
      }
    };

    // Immediate first run so uvicorn logs appear at once.
    doSync();
    doFeed();
    const syncId = setInterval(doSync, 5000);
    const feedId = setInterval(doFeed, 20000);
    return () => {
      cancelled = true;
      clearInterval(syncId);
      clearInterval(feedId);
    };
  }, [enabled]);

  return state;
}
