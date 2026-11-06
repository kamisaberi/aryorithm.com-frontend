"use client";

import { useMemo, useRef } from "react";

import Badge from "@/components/ui/Badge";
import type {
  ScenarioCompileIssue,
  ScenarioNode,
  ScenarioPalette,
  ScenarioPaletteItem,
} from "@/lib/backend";

import {
  CANVAS_PADDING,
  LANE_GAP,
  LANE_TOP,
  LANE_WIDTH,
  NODE_HEIGHT,
  NODE_WIDTH,
  NETWORK_TYPES,
  categoryForType,
  laneX,
  nodeTypeLabel,
  paletteIndex,
  type ScenarioDraft,
  type ScenarioSelection,
} from "./scenario-studio-config";

interface ScenarioCanvasProps {
  draft: ScenarioDraft;
  palette: ScenarioPalette;
  selection: ScenarioSelection;
  issues: ScenarioCompileIssue[];
  canEdit: boolean;
  onSelect: (selection: ScenarioSelection) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onCommitNode: (
    id: string,
    x: number,
    y: number,
    subnetId: string | null
  ) => void;
  onDropPalette: (
    item: ScenarioPaletteItem,
    subnetId: string | null,
    x: number,
    y: number
  ) => void;
  onAddSubnet: () => void;
}

const CATEGORY_TINT: Record<string, string> = {
  NETWORKS: "border-cyan/35 hover:border-cyan/70",
  PLCS_AND_CONTROLLERS: "border-kernel/30 hover:border-kernel/65",
  FIELD_SENSORS: "border-telemetry/30 hover:border-telemetry/65",
  SIMULATION_ACTORS: "border-threat/30 hover:border-threat/65",
};

const CATEGORY_TEXT: Record<string, string> = {
  NETWORKS: "text-cyan",
  PLCS_AND_CONTROLLERS: "text-kernel",
  FIELD_SENSORS: "text-telemetry",
  SIMULATION_ACTORS: "text-threat",
};

const LINK_COLORS: Record<string, string> = {
  ATTACK: "#ff5c6c",
  ETHERNET: "#28d7ff",
  TELEMETRY: "#42e6b3",
  ROUTE: "#ffb547",
  WAN: "#ffb547",
  UPLINK: "#ffb547",
};

const MAX_CANVAS_HEIGHT = 4200;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function linkColor(kind: string): string {
  return LINK_COLORS[kind.toUpperCase()] ?? "#65738c";
}

function nodeCenter(node: ScenarioNode): { x: number; y: number } {
  return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
}

function nodeEdge(
  node: ScenarioNode,
  toward: { x: number; y: number }
): { x: number; y: number } {
  const center = nodeCenter(node);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const scale = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : NODE_WIDTH / 2 / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : NODE_HEIGHT / 2 / Math.abs(dy)
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function wirePath(source: ScenarioNode, target: ScenarioNode): string {
  const from = nodeEdge(source, nodeCenter(target));
  const to = nodeEdge(target, nodeCenter(source));
  if (Math.abs(from.x - to.x) < 12) {
    const bulge = Math.max(120, Math.abs(from.y - to.y) / 2);
    return `M ${from.x} ${from.y} C ${from.x + bulge} ${from.y}, ${
      to.x + bulge
    } ${to.y}, ${to.x} ${to.y}`;
  }
  const direction = to.x >= from.x ? 1 : -1;
  const handle = Math.max(70, Math.abs(to.x - from.x) * 0.45) * direction;
  return `M ${from.x} ${from.y} C ${from.x + handle} ${from.y}, ${
    to.x - handle
  } ${to.y}, ${to.x} ${to.y}`;
}

export default function ScenarioStudioCanvas({
  draft,
  palette,
  selection,
  issues,
  canEdit,
  onSelect,
  onMoveNode,
  onCommitNode,
  onDropPalette,
  onAddSubnet,
}: ScenarioCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const itemByType = useMemo(() => paletteIndex(palette), [palette]);
  const nodeById = useMemo(() => {
    const map: Record<string, ScenarioNode> = {};
    for (const node of draft.nodes) map[node.id] = node;
    return map;
  }, [draft.nodes]);

  const unassigned = draft.nodes.filter(
    (node) => !draft.subnets.some((subnet) => subnet.id === node.subnet_id)
  );
  const laneCount = draft.subnets.length + (unassigned.length > 0 ? 1 : 0);
  const canvasWidth = Math.max(
    920,
    laneCount * (LANE_WIDTH + LANE_GAP) + CANVAS_PADDING * 2
  );
  const maxNodeY = draft.nodes.reduce(
    (max, node) => Math.max(max, node.y + NODE_HEIGHT),
    LANE_TOP + 240
  );
  const canvasHeight = Math.max(620, maxNodeY + 110);

  const errorByNode = useMemo(() => {
    const map: Record<string, ScenarioCompileIssue[]> = {};
    for (const issue of issues) {
      if (issue.severity !== "error" || !issue.node_id) continue;
      (map[issue.node_id] ??= []).push(issue);
    }
    return map;
  }, [issues]);
  const warningByNode = useMemo(() => {
    const map: Record<string, ScenarioCompileIssue[]> = {};
    for (const issue of issues) {
      if (issue.severity !== "warning" || !issue.node_id) continue;
      (map[issue.node_id] ??= []).push(issue);
    }
    return map;
  }, [issues]);
  const errorBySubnet = useMemo(() => {
    const map: Record<string, ScenarioCompileIssue[]> = {};
    for (const issue of issues) {
      if (issue.severity !== "error" || !issue.subnet_id) continue;
      (map[issue.subnet_id] ??= []).push(issue);
    }
    return map;
  }, [issues]);
  const errorByLink = useMemo(() => {
    const map: Record<string, ScenarioCompileIssue[]> = {};
    for (const issue of issues) {
      if (issue.severity !== "error" || !issue.link_id) continue;
      (map[issue.link_id] ??= []).push(issue);
    }
    return map;
  }, [issues]);

  const laneForNode = (node: ScenarioNode): number => {
    const index = draft.subnets.findIndex(
      (subnet) => subnet.id === node.subnet_id
    );
    if (index >= 0) return index;
    return draft.subnets.length;
  };

  const handleNodePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    node: ScenarioNode
  ) => {
    event.stopPropagation();
    onSelect({ kind: "node", id: node.id });
    if (!canEdit) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: node.id,
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top,
      originX: node.x,
      originY: node.y,
      moved: false,
    };
  };

  const handleNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextX = clamp(
      drag.originX + (event.clientX - rect.left - drag.startX),
      0,
      canvasWidth - NODE_WIDTH
    );
    const nextY = clamp(
      drag.originY + (event.clientY - rect.top - drag.startY),
      LANE_TOP + 46,
      Math.min(canvasHeight - NODE_HEIGHT - 18, MAX_CANVAS_HEIGHT)
    );
    if (
      Math.abs(nextX - drag.originX) > 2 ||
      Math.abs(nextY - drag.originY) > 2
    ) {
      drag.moved = true;
    }
    onMoveNode(drag.id, Math.round(nextX), Math.round(nextY));
  };

  const handleNodePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp(
      drag.originX + (event.clientX - rect.left - drag.startX),
      0,
      canvasWidth - NODE_WIDTH
    );
    const y = clamp(
      drag.originY + (event.clientY - rect.top - drag.startY),
      LANE_TOP + 46,
      Math.min(canvasHeight - NODE_HEIGHT - 18, MAX_CANVAS_HEIGHT)
    );
    const center = x + NODE_WIDTH / 2;
    const index = Math.round(
      (center - CANVAS_PADDING - LANE_WIDTH / 2) / (LANE_WIDTH + LANE_GAP)
    );
    const target = draft.subnets[index] ?? null;
    onCommitNode(drag.id, Math.round(x), Math.round(y), target?.id ?? null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-aryo-scenario");
    if (!raw) return;
    let type = "";
    try {
      const parsed = JSON.parse(raw) as { type?: string };
      type = parsed.type ?? "";
    } catch {
      return;
    }
    const item = itemByType[type];
    if (!item) return;
    const rect =
      contentRef.current?.getBoundingClientRect() ??
      canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = Math.round(
      (x - CANVAS_PADDING - LANE_WIDTH / 2) / (LANE_WIDTH + LANE_GAP)
    );
    const subnet = draft.subnets[index] ?? draft.subnets[0] ?? null;
    onDropPalette(
      item,
      NETWORK_TYPES.has(item.type) ? null : subnet?.id ?? null,
      clamp(Math.round(x - NODE_WIDTH / 2), 0, canvasWidth - NODE_WIDTH),
      clamp(
        Math.round(y - NODE_HEIGHT / 2),
        LANE_TOP + 46,
        Math.min(canvasHeight - NODE_HEIGHT - 18, MAX_CANVAS_HEIGHT)
      )
    );
  };

  const selectedNode =
    selection?.kind === "node" ? nodeById[selection.id] ?? null : null;

  return (
    <div
      ref={canvasRef}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
      onClick={() => onSelect(null)}
      className="blueprint-scroll relative max-h-[calc(100vh-210px)] overflow-auto rounded-md border border-hairline bg-void/70"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(26,34,50,0.46) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,34,50,0.46) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        minHeight: 620,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-panel/85 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
            {"// Scenario Graph Canvas"}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {draft.subnets.length} subnets · {draft.nodes.length} containers ·{" "}
            {draft.links.length} links
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          <span className="rounded border border-hairline bg-panel px-2 py-1">
            drag to move
          </span>
          <span className="rounded border border-hairline bg-panel px-2 py-1">
            drop palette
          </span>
        </div>
      </div>

      {draft.subnets.length === 0 && draft.nodes.length === 0 ? (
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full border border-cyan/30 bg-cyan/5 p-5 font-mono text-2xl text-cyan">
            ⬢
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              Start with a subnet
            </p>
            <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted">
              Drag a Bridged or Air-Gapped Subnet from the palette, then drop
              PLCs, sensors and attackers into it. Red borders appear only when
              the topology fails a compile rule.
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddSubnet();
            }}
            disabled={!canEdit}
            className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Create bridge subnet
          </button>
        </div>
      ) : (
        <div
          ref={contentRef}
          className="relative"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden="true"
          >
            <defs>
              {Array.from(
                new Set([
                  "ATTACK",
                  "ETHERNET",
                  "TELEMETRY",
                  "ROUTE",
                  "WAN",
                  "UPLINK",
                ])
              ).map((kind) => (
                  <marker
                    key={kind}
                    id={`studio-arrow-${kind}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 z" fill={linkColor(kind)} />
                  </marker>
                ))}
            </defs>
            {draft.links.map((link) => {
              const source = nodeById[link.source_node_id];
              const target = nodeById[link.target_node_id];
              if (!source || !target) return null;
              const color = linkColor(link.kind);
              const selected =
                selection?.kind === "link" && selection.id === link.id;
              const hasError = Boolean(errorByLink[link.id]?.length);
              const from = nodeEdge(source, nodeCenter(target));
              const to = nodeEdge(target, nodeCenter(source));
              return (
                <g key={link.id}>
                  <path
                    d={wirePath(source, target)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "link", id: link.id });
                    }}
                  />
                  <path
                    d={wirePath(source, target)}
                    fill="none"
                    stroke={hasError ? "#ff5c6c" : color}
                    strokeWidth={selected ? 2.6 : 1.5}
                    strokeDasharray={
                      link.kind.toUpperCase() === "ATTACK" ? "7 5" : undefined
                    }
                    markerEnd={`url(#studio-arrow-${
                      [
                        "ATTACK",
                        "ETHERNET",
                        "TELEMETRY",
                        "ROUTE",
                        "WAN",
                        "UPLINK",
                      ].includes(link.kind.toUpperCase())
                        ? link.kind.toUpperCase()
                        : "ETHERNET"
                    })`}
                    opacity={selected ? 1 : 0.8}
                    style={{ pointerEvents: "none" }}
                  />
                  {link.label && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 5}
                      textAnchor="middle"
                      fill={hasError ? "#ff5c6c" : color}
                      fontSize={9}
                      fontFamily="ui-monospace, monospace"
                      style={{ pointerEvents: "none" }}
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {draft.subnets.map((subnet, index) => {
            const subnetNodes = draft.nodes.filter(
              (node) => node.subnet_id === subnet.id
            );
            const errors = errorBySubnet[subnet.id] ?? [];
            const selected =
              selection?.kind === "subnet" && selection.id === subnet.id;
            return (
              <div
                key={subnet.id}
                className={`absolute rounded-md border bg-panel/55 ${
                  selected
                    ? "border-cyan/80 shadow-[0_0_34px_-16px_rgba(0,229,255,0.9)]"
                    : errors.length > 0
                      ? "border-threat/70"
                      : "border-hairline"
                }`}
                style={{
                  left: laneX(index),
                  top: LANE_TOP,
                  width: LANE_WIDTH,
                  height: canvasHeight - LANE_TOP - 20,
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect({ kind: "subnet", id: subnet.id });
                  }}
                  className="w-full border-b border-hairline bg-panel/80 px-3 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {subnet.name}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-cyan">
                        {subnet.cidr}
                      </p>
                    </div>
                    <Badge variant={subnet.internal ? "muted" : "cyan"}>
                      {subnet.internal ? "airgap" : "routed"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-muted">
                    <span>
                      L{subnet.purdue_level} · gw {subnet.gateway || "—"}
                    </span>
                    <span className={errors.length > 0 ? "text-threat" : ""}>
                      {errors.length > 0
                        ? `${errors.length} error${errors.length === 1 ? "" : "s"}`
                        : `${subnetNodes.length} nodes`}
                    </span>
                  </div>
                </button>
                {subnetNodes.length === 0 && (
                  <p className="mx-3 mt-3 rounded border border-dashed border-hairline px-2 py-3 text-center font-mono text-[9px] leading-relaxed text-muted/60">
                    drop PLCs / sensors / actors here
                  </p>
                )}
              </div>
            );
          })}

          {unassigned.length > 0 && (
            <div
              className="absolute rounded-md border border-threat/60 bg-threat/5"
              style={{
                left: laneX(draft.subnets.length),
                top: LANE_TOP,
                width: LANE_WIDTH,
                height: canvasHeight - LANE_TOP - 20,
              }}
            >
              <div className="border-b border-threat/30 bg-panel/80 px-3 py-3">
                <p className="text-[12px] font-semibold text-threat">
                  Unassigned
                </p>
                <p className="mt-1 font-mono text-[9px] text-muted">
                  {unassigned.length} containers need a subnet
                </p>
              </div>
            </div>
          )}

          {draft.nodes.map((node) => {
            const item = itemByType[node.type];
            const category = item
              ? categoryForType(palette, node.type)
              : "SIMULATION_ACTORS";
            const errors = errorByNode[node.id] ?? [];
            const warnings = warningByNode[node.id] ?? [];
            const selected =
              selection?.kind === "node" && selection.id === node.id;
            const laneIndex = laneForNode(node);
            const tint =
              CATEGORY_TINT[category] ?? CATEGORY_TINT.SIMULATION_ACTORS;
            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                title={
                  errors.length > 0
                    ? errors.map((issue) => issue.message).join("\n")
                    : warnings.length > 0
                      ? warnings.map((issue) => issue.message).join("\n")
                      : node.name
                }
                onPointerDown={(event) =>
                  handleNodePointerDown(event, node)
                }
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerUp}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "node", id: node.id });
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                className={`absolute z-10 touch-none select-none rounded-md border bg-panel/95 px-3 py-2.5 text-left shadow-lg transition-shadow ${
                  selected
                    ? "border-cyan/80 shadow-[0_0_32px_-12px_rgba(0,229,255,0.8)]"
                    : errors.length > 0
                      ? "border-threat/80 shadow-[0_0_28px_-12px_rgba(255,77,94,0.8)]"
                      : warnings.length > 0
                        ? "border-telemetry/60"
                        : tint
                } ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`font-mono text-[15px] ${
                      CATEGORY_TEXT[category] ?? "text-cyan"
                    }`}
                  >
                    {category === "PLCS_AND_CONTROLLERS"
                      ? "▣"
                      : category === "FIELD_SENSORS"
                        ? "◌"
                        : category === "SIMULATION_ACTORS"
                          ? "✦"
                          : "▦"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold text-ink">
                      {node.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[9px] text-muted">
                      {nodeTypeLabel(palette, node.type)}
                    </p>
                  </div>
                  {(errors.length > 0 || warnings.length > 0) && (
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[8px] ${
                        errors.length > 0
                          ? "border-threat/40 bg-threat/10 text-threat"
                          : "border-telemetry/40 bg-telemetry/10 text-telemetry"
                      }`}
                    >
                      {errors.length > 0 ? errors.length : warnings.length}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px]">
                  <span className="truncate text-cyan/80">
                    {node.ip || "no ip"}
                  </span>
                  <span className="truncate text-muted">
                    {node.ports.length > 0
                      ? `:${node.ports[0].split(":")[0]}`
                      : "no ports"}
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-[8.5px] text-muted/70">
                  {laneIndex >= 0
                    ? draft.subnets[laneIndex]?.name ?? "unassigned"
                    : "unassigned"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-panel/60 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted/70">
        <span>click a subnet, node or link to edit · error borders glow red</span>
        {(selectedNode?.config?.wan_egress as boolean) ? (
          <span className="text-threat">WAN egress enabled</span>
        ) : (
          <span>air-gap invariant enforced at compile</span>
        )}
      </div>
    </div>
  );
}
