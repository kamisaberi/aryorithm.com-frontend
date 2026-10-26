"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { useBackend } from "@/hooks/useBackend";
import { ApiError } from "@/lib/api";
import { isAdminRole, useAuth } from "@/lib/auth";
import {
  backend,
  type BlueprintCompileResult,
  type BlueprintDeployResult,
  type BlueprintDetail,
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintSavePayload,
  type BlueprintSummary,
  type CatalogNode,
  type NodeCatalog,
} from "@/lib/backend";
import {
  CONFIG_FIELDS,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_HEADER_H,
  NODE_W,
  PORT_GAP,
  PORT_START_Y,
  SOCKET_COLORS,
  SOCKET_COMPATIBILITY,
  STAGE_COLORS,
  STAGE_H,
  STAGE_W,
  TYPE_ICONS,
  buildExampleBlueprint,
  formatDate,
  formatLatency,
  getNodeSpec,
  localGraphChecks,
  makeNode,
  nodeHeight,
  portCenter,
  uid,
  uniqueSites,
  wirePath,
  type NodeSpec,
  type PortSpec,
} from "./blueprint-config";

type BadgeVariant = "kernel" | "threat" | "telemetry" | "cyan" | "muted";
type EditorView = "library" | "editor";
type EditorMode = "edit" | "view";
type BottomTab = "yaml" | "console";
type BusyAction =
  | "load"
  | "save"
  | "validate"
  | "compile"
  | "deploy"
  | "delete"
  | null;
type LogLevel = "info" | "ok" | "warn" | "error";
type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

interface PendingConnection {
  nodeId: string;
  port: string;
  socketType: string;
}

interface LogLine {
  id: string;
  time: string;
  level: LogLevel;
  text: string;
}

const LOG_COLORS: Record<LogLevel, string> = {
  info: "text-cyan",
  ok: "text-kernel",
  warn: "text-telemetry",
  error: "text-threat",
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  DRAFT: "muted",
  VALIDATED: "cyan",
  DEPLOYED: "kernel",
  INVALID: "threat",
};

function statusVariant(status: string): BadgeVariant {
  return STATUS_VARIANTS[status.toUpperCase()] ?? "muted";
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected request failure.";
}

function extractApiErrors(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const errors = error.details.errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter((item): item is string => typeof item === "string");
}

function errorSummary(error: unknown): string {
  const errors = extractApiErrors(error);
  return errors.length > 0 ? `${describeError(error)} (${errors.length} issue${errors.length === 1 ? "" : "s"})` : describeError(error);
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export default function ThreatBlueprintsPage() {
  const { token, user } = useAuth();
  const canEdit = isAdminRole(user?.role);

  const libraryQuery = useBackend<BlueprintSummary[]>(
    [],
    (t) => backend.blueprints(t),
    token
  );
  const catalogQuery = useBackend<NodeCatalog | null>(
    null,
    (t) => backend.blueprintNodeCatalog(t),
    token
  );
  const refreshLibrary = libraryQuery.refresh;
  const catalog = catalogQuery.data;

  const catalogByType = useMemo(() => {
    const map: Record<string, CatalogNode> = {};
    for (const node of catalog?.nodes ?? []) {
      if (!map[node.type]) map[node.type] = node;
    }
    return map;
  }, [catalog]);

  const socketColors = useMemo(() => {
    const map = { ...SOCKET_COLORS };
    for (const [type, meta] of Object.entries(catalog?.socket_types ?? {})) {
      map[type] = meta.color;
    }
    return map;
  }, [catalog]);

  /* ------------------------------ state ------------------------------ */
  const [view, setView] = useState<EditorView>("library");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled Threat Blueprint");
  const [description, setDescription] = useState("");
  const [sitesInput, setSitesInput] = useState("");
  const [nodes, setNodes] = useState<BlueprintNode[]>([]);
  const [edges, setEdges] = useState<BlueprintEdge[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const [dirty, setDirty] = useState(false);
  const [yamlText, setYamlText] = useState("");
  const [compiledAt, setCompiledAt] = useState<string | null>(null);
  const [lastDeployedAt, setLastDeployedAt] = useState<string | null>(null);
  const [compileResult, setCompileResult] =
    useState<BlueprintCompileResult | null>(null);
  const [deployResult, setDeployResult] =
    useState<BlueprintDeployResult | null>(null);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [compileWarnings, setCompileWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<Selection>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [zoom, setZoom] = useState(0.85);
  const [snap, setSnap] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("console");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [query, setQuery] = useState("");
  const [collapsedStages, setCollapsedStages] = useState<
    Record<number, boolean>
  >({});
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const canModify = canEdit && mode === "edit";
  const selectedNode =
    selected?.kind === "node"
      ? nodes.find((node) => node.id === selected.id) ?? null
      : null;
  const selectedEdge =
    selected?.kind === "edge"
      ? edges.find((edge) => edge.id === selected.id) ?? null
      : null;
  const checks = useMemo(
    () => localGraphChecks(nodes, edges, catalogByType),
    [nodes, edges, catalogByType]
  );

  const pushLog = useCallback((level: LogLevel, text: string) => {
    setLogs((previous) => [
      ...previous.slice(-119),
      { id: uid("log"), time: nowLabel(), level, text },
    ]);
  }, []);

  const handleFailure = useCallback(
    (caught: unknown, fallback: string) => {
      const errors = extractApiErrors(caught);
      if (errors.length > 0) {
        setCompileErrors(errors);
        setBottomTab("console");
      }
      const message = caught ? errorSummary(caught) : fallback;
      setError(message);
      pushLog("error", message);
    },
    [pushLog]
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPending(null);
        setCursor(null);
        setDragging(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const resetDragState = () => setDragOver(false);
    window.addEventListener("dragend", resetDragState);
    window.addEventListener("drop", resetDragState);
    return () => {
      window.removeEventListener("dragend", resetDragState);
      window.removeEventListener("drop", resetDragState);
    };
  }, []);

  /* --------------------------- load / lifecycle ---------------------- */
  const loadDetail = useCallback(
    (detail: BlueprintDetail) => {
      setDraftId(detail.blueprint_id);
      setName(detail.name);
      setDescription(detail.description ?? "");
      setSitesInput((detail.target_sites ?? []).join(", "));
      setNodes(
        (detail.nodes ?? []).map((node) => ({
          ...node,
          position: {
            ...node.position,
            x: Number(node.position?.x ?? 0),
            y: Number(node.position?.y ?? 0),
          },
        }))
      );
      setEdges(detail.edges ?? []);
      setStatus(detail.status);
      setYamlText(detail.compiled_yaml ?? "");
      setCompiledAt(detail.compiled_at ?? null);
      setLastDeployedAt(detail.last_deployed_at ?? null);
      setCompileResult(null);
      setDeployResult(null);
      setCompileErrors([]);
      setCompileWarnings([]);
      setDirty(false);
      setSelected(null);
      setPending(null);
      setPanMode(false);
      setMode(canEdit ? "edit" : "view");
      setZoom(0.85);
      setQuery("");
      setBottomTab("console");
      pushLog(
        "ok",
        `Loaded ${detail.blueprint_id} · ${detail.nodes?.length ?? 0} nodes · ${detail.status}`
      );
    },
    [canEdit, pushLog]
  );

  const openBlueprint = useCallback(
    async (blueprintId: string) => {
      if (dirty && !window.confirm("Discard unsaved changes and open another blueprint?")) {
        return;
      }
      setBusy("load");
      setError(null);
      setNotice(null);
      try {
        const detail = await backend.blueprint(blueprintId, token);
        loadDetail(detail);
        setView("editor");
      } catch (caught) {
        handleFailure(caught, "Could not load blueprint.");
      } finally {
        setBusy(null);
      }
    },
    [dirty, handleFailure, loadDetail, token]
  );

  const newBlueprint = useCallback(
    (withExample: boolean) => {
      if (dirty && !window.confirm("Discard unsaved changes and start a new blueprint?")) {
        return;
      }
      setError(null);
      setNotice(null);
      setDraftId(null);
      setSelected(null);
      setPending(null);
      setCompileResult(null);
      setDeployResult(null);
      setCompileErrors([]);
      setCompileWarnings([]);
      setYamlText("");
      setCompiledAt(null);
      setLastDeployedAt(null);
      setStatus("DRAFT");
      setPanMode(false);
      setBottomTab("console");
      setQuery("");
      setMode(canEdit ? "edit" : "view");
      if (withExample) {
        const example = buildExampleBlueprint(catalog);
        setName(example.name);
        setDescription(example.description);
        setSitesInput(example.targetSites.join(", "));
        setNodes(example.nodes);
        setEdges(example.edges);
        setZoom(0.78);
        setDirty(true);
        pushLog(
          "info",
          "Example graph loaded: 5 nodes, 6 wires, cross-modal fusion path."
        );
      } else {
        setName("Untitled Threat Blueprint");
        setDescription("");
        setSitesInput("");
        setNodes([]);
        setEdges([]);
        setZoom(0.85);
        setDirty(true);
        pushLog(
          "info",
          "Blank canvas ready. Drag a node from the palette to begin."
        );
      }
      setView("editor");
    },
    [canEdit, catalog, dirty, pushLog]
  );

  const leaveEditor = useCallback(
    (force = false) => {
      if (
        !force &&
        dirty &&
        !window.confirm("Discard unsaved changes and return to the library?")
      ) {
        return;
      }
      setView("library");
      setDraftId(null);
      setNodes([]);
      setEdges([]);
      setYamlText("");
      setSelected(null);
      setPending(null);
      setDirty(false);
      setError(null);
      setNotice(null);
      setCompileResult(null);
      setDeployResult(null);
      setCompileErrors([]);
      setCompileWarnings([]);
      setQuery("");
    },
    [dirty]
  );

  const persistDraft = useCallback(async (): Promise<BlueprintDetail> => {
    if (!token) throw new Error("Session expired — sign in again.");
    if (!name.trim()) throw new Error("Blueprint name is required.");
    const payload: BlueprintSavePayload = {
      ...(draftId ? { blueprint_id: draftId } : {}),
      name: name.trim(),
      description,
      target_sites: uniqueSites(sitesInput),
      nodes,
      edges,
    };
    const saved = await backend.saveBlueprint(payload, token);
    setDraftId(saved.blueprint_id);
    setName(saved.name);
    setDescription(saved.description ?? "");
    setSitesInput((saved.target_sites ?? []).join(", "));
    setNodes(saved.nodes ?? []);
    setEdges(saved.edges ?? []);
    setStatus(saved.status);
    setYamlText(saved.compiled_yaml ?? "");
    setCompiledAt(saved.compiled_at ?? null);
    setLastDeployedAt(saved.last_deployed_at ?? null);
    setCompileResult(null);
    setDeployResult(null);
    setCompileErrors([]);
    setCompileWarnings([]);
    setDirty(false);
    refreshLibrary();
    pushLog("ok", `Draft saved · ${saved.blueprint_id}`);
    return saved;
  }, [
    description,
    draftId,
    edges,
    name,
    nodes,
    pushLog,
    refreshLibrary,
    sitesInput,
    token,
  ]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      await persistDraft();
      setNotice("Blueprint draft saved.");
    } catch (caught) {
      handleFailure(caught, "Could not save blueprint.");
    } finally {
      setBusy(null);
    }
  }, [canEdit, handleFailure, persistDraft]);

  const compileCurrent = useCallback(
    async (focus: "validate" | "compile") => {
      if (!canEdit) return;
      if (nodes.length === 0) {
        setError("Add at least one palette node before validating or compiling.");
        setBottomTab("console");
        pushLog("warn", "Compile blocked: the canvas has no nodes.");
        return;
      }
      setBusy(focus);
      setError(null);
      setNotice(null);
      setCompileErrors([]);
      setCompileWarnings([]);
      try {
        let id = draftId;
        if (dirty || !id) {
          const saved = await persistDraft();
          id = saved.blueprint_id;
        }
        if (!id) throw new Error("Save the blueprint before compiling.");
        const result = await backend.compileBlueprint(id, token);
        setCompileResult(result);
        setDeployResult(null);
        setStatus(result.status);
        setYamlText(result.compiled_yaml ?? "");
        setCompiledAt(result.compiled_at ?? null);
        setCompileErrors(result.errors);
        setCompileWarnings(result.warnings);
        setBottomTab(focus === "compile" ? "yaml" : "console");
        setNotice(
          focus === "compile"
            ? "model_routes.yaml compiled successfully."
            : "Graph validation passed."
        );
        pushLog(
          "ok",
          `Compile OK · ${result.node_count} nodes / ${result.edge_count} wires · ${formatLatency(result.estimated_latency_ns)}`
        );
        result.warnings.forEach((warning) => pushLog("warn", warning));
        refreshLibrary();
      } catch (caught) {
        const errors = extractApiErrors(caught);
        if (errors.length > 0) {
          setCompileErrors(errors);
          setCompileResult(null);
          setYamlText("");
          setCompiledAt(null);
        }
        setBottomTab("console");
        handleFailure(caught, "Compile failed.");
      } finally {
        setBusy(null);
      }
    },
    [
      canEdit,
      dirty,
      draftId,
      handleFailure,
      nodes.length,
      persistDraft,
      pushLog,
      refreshLibrary,
      token,
    ]
  );

  const handleDeploy = useCallback(async () => {
    if (!canEdit) return;
    if (nodes.length === 0) {
      setError("Add at least one palette node before deploying.");
      setBottomTab("console");
      pushLog("warn", "Deploy blocked: the canvas has no nodes.");
      return;
    }
    if (
      !window.confirm(
        "Compile and broadcast this route table to the configured target sites?"
      )
    ) {
      return;
    }
    setBusy("deploy");
    setError(null);
    setNotice(null);
    setCompileErrors([]);
    setCompileWarnings([]);
    try {
      let id = draftId;
      if (dirty || !id) {
        const saved = await persistDraft();
        id = saved.blueprint_id;
      }
      if (!id) throw new Error("Save the blueprint before deployment.");
      const result = await backend.deployBlueprint(id, token);
      setDeployResult(result);
      setStatus(result.status);
      setLastDeployedAt(result.deployed_at);
      setBottomTab("console");
      setNotice(
        `Deployed to ${result.target_sites.length || 1} target(s) in ${result.broadcast_latency_ms} ms.`
      );
      pushLog(
        "ok",
        `DEPLOYED · ${result.target_sites.join(", ") || "global fleet"} · gRPC ${result.broadcast_latency_ms} ms (${result.grpc_status}) · fleet ${result.fleet_health}`
      );
      try {
        const detail = await backend.blueprint(id, token);
        setYamlText(detail.compiled_yaml ?? "");
        setCompiledAt(detail.compiled_at ?? null);
      } catch {
        /* The deployment succeeded; the YAML refresh is best effort. */
      }
      refreshLibrary();
    } catch (caught) {
      handleFailure(caught, "Deployment failed.");
    } finally {
      setBusy(null);
    }
  }, [
    canEdit,
    dirty,
    draftId,
    handleFailure,
    nodes.length,
    persistDraft,
    pushLog,
    refreshLibrary,
    token,
  ]);

  const handleDeleteBlueprint = useCallback(
    async (blueprintId: string) => {
      if (!canEdit) return;
      if (
        !window.confirm(
          "Delete this blueprint? The graph and compiled route table will be removed."
        )
      ) {
        return;
      }
      setBusy("delete");
      setError(null);
      setNotice(null);
      try {
        await backend.deleteBlueprint(blueprintId, token);
        pushLog("warn", `Blueprint deleted · ${blueprintId}`);
        refreshLibrary();
        if (draftId === blueprintId) {
          leaveEditor(true);
        }
        setNotice("Blueprint deleted.");
      } catch (caught) {
        handleFailure(caught, "Could not delete blueprint.");
      } finally {
        setBusy(null);
      }
    },
    [
      canEdit,
      draftId,
      handleFailure,
      leaveEditor,
      pushLog,
      refreshLibrary,
      token,
    ]
  );

  /* ------------------------------ canvas ----------------------------- */
  const handleNodePointerDown = useCallback(
    (event: React.PointerEvent, node: BlueprintNode) => {
      if (panMode) return;
      event.stopPropagation();
      setSelected({ kind: "node", id: node.id });
      if (!canModify || event.button !== 0) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      dragMovedRef.current = false;
      setDragging({
        id: node.id,
        offsetX: (event.clientX - rect.left) / zoom - node.position.x,
        offsetY: (event.clientY - rect.top) / zoom - node.position.y,
      });
    },
    [canModify, panMode, zoom]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const rawX = (event.clientX - rect.left) / zoom - dragging.offsetX;
      const rawY = (event.clientY - rect.top) / zoom - dragging.offsetY;
      const x = snap ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
      const y = snap ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;
      dragMovedRef.current = true;
      setNodes((previous) =>
        previous.map((node) =>
          node.id === dragging.id
            ? {
                ...node,
                position: {
                  ...node.position,
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                },
              }
            : node
        )
      );
    };
    const onUp = () => {
      setDragging(null);
      if (dragMovedRef.current) setDirty(true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, snap, zoom]);

  const addNode = useCallback(
    (item: CatalogNode, position: { x: number; y: number }) => {
      if (!canModify) return;
      const x = snap
        ? Math.round(position.x / GRID_SIZE) * GRID_SIZE
        : position.x;
      const y = snap
        ? Math.round(position.y / GRID_SIZE) * GRID_SIZE
        : position.y;
      const node = makeNode(
        item,
        { x: Math.max(0, x), y: Math.max(0, y) },
        nodes.length
      );
      setNodes((previous) => [...previous, node]);
      setSelected({ kind: "node", id: node.id });
      setDirty(true);
      pushLog(
        "info",
        `Placed ${item.label} (${item.type}) at stage ${item.stage}.`
      );
    },
    [canModify, nodes.length, pushLog, snap]
  );

  const addFromPalette = useCallback(
    (item: CatalogNode) => {
      if (!canModify) return;
      const spec = getNodeSpec(catalogByType, item.type);
      const height = nodeHeight(spec);
      let x = 70 + (item.stage - 1) * 310;
      let y = 140;
      // Find a free slot in the stage column instead of stacking new nodes
      // on top of an existing card.
      for (let attempt = 0; attempt < 48; attempt += 1) {
        const collides = nodes.some((node) => {
          const nodeSpec = getNodeSpec(catalogByType, node.type);
          const nodeCardHeight = nodeHeight(nodeSpec);
          return (
            x < node.position.x + NODE_W + 18 &&
            x + NODE_W + 18 > node.position.x &&
            y < node.position.y + nodeCardHeight + 18 &&
            y + height + 18 > node.position.y
          );
        });
        if (!collides) break;
        y += 170;
        if (y > 760) {
          y = 140;
          x += 300;
        }
      }
      addNode(item, { x, y });
    },
    [addNode, canModify, catalogByType, nodes]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      if (!canModify) return;
      const catalogId = event.dataTransfer.getData(
        "application/x-threat-blueprint-node"
      );
      const item = catalog?.nodes.find(
        (node) => node.catalog_id === catalogId
      );
      const stage = stageRef.current;
      if (!item || !stage) return;
      const rect = stage.getBoundingClientRect();
      addNode(item, {
        x: (event.clientX - rect.left) / zoom - NODE_W / 2,
        y: (event.clientY - rect.top) / zoom - 26,
      });
    },
    [addNode, canModify, catalog, zoom]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      if (!canModify) return;
      const node = nodes.find((item) => item.id === nodeId);
      setNodes((previous) => previous.filter((item) => item.id !== nodeId));
      setEdges((previous) =>
        previous.filter(
          (edge) => edge.source_node !== nodeId && edge.target_node !== nodeId
        )
      );
      setSelected(null);
      setDirty(true);
      pushLog(
        "warn",
        `Removed ${node?.label ?? nodeId} and its connected wires.`
      );
    },
    [canModify, nodes, pushLog]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      if (!canModify) return;
      setEdges((previous) => previous.filter((edge) => edge.id !== edgeId));
      setSelected(null);
      setDirty(true);
      pushLog("warn", `Removed wire ${edgeId}.`);
    },
    [canModify, pushLog]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
      ) {
        return;
      }
      if (!selected) return;
      event.preventDefault();
      if (selected.kind === "node") removeNode(selected.id);
      else removeEdge(selected.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeEdge, removeNode, selected]);

  const beginConnection = useCallback(
    (
      event: React.MouseEvent,
      node: BlueprintNode,
      port: PortSpec
    ) => {
      event.stopPropagation();
      if (!canModify || panMode) return;
      if (pending?.nodeId === node.id && pending.port === port.name) {
        setPending(null);
        setCursor(null);
        return;
      }
      const spec = getNodeSpec(catalogByType, node.type);
      setPending({
        nodeId: node.id,
        port: port.name,
        socketType: port.socket_type,
      });
      setCursor(portCenter(node, port.name, "out", spec));
      pushLog(
        "info",
        `Wiring ${node.id}.${port.name} (${port.socket_type}) — select an input socket.`
      );
    },
    [canModify, catalogByType, panMode, pending, pushLog]
  );

  const completeConnection = useCallback(
    (
      event: React.MouseEvent,
      node: BlueprintNode,
      port: PortSpec
    ) => {
      event.stopPropagation();
      if (!canModify || panMode || !pending) return;
      if (pending.nodeId === node.id) {
        pushLog("warn", "Self-loops are not allowed.");
        return;
      }
      const compatible = (
        SOCKET_COMPATIBILITY[pending.socketType] ?? [pending.socketType]
      ).includes(port.socket_type);
      if (!compatible) {
        pushLog(
          "error",
          `Incompatible wire: ${pending.socketType} → ${port.socket_type}.`
        );
        return;
      }
      const duplicate = edges.some(
        (edge) =>
          edge.source_node === pending.nodeId &&
          edge.source_port === pending.port &&
          edge.target_node === node.id &&
          edge.target_port === port.name
      );
      if (duplicate) {
        pushLog("warn", "That wire already exists.");
        setPending(null);
        setCursor(null);
        return;
      }
      const wire: BlueprintEdge = {
        id: uid("wire"),
        source_node: pending.nodeId,
        source_port: pending.port,
        target_node: node.id,
        target_port: port.name,
      };
      setEdges((previous) => [...previous, wire]);
      setPending(null);
      setCursor(null);
      setDirty(true);
      pushLog(
        "ok",
        `Wired ${pending.nodeId}.${pending.port} → ${node.id}.${port.name}`
      );
    },
    [canModify, edges, panMode, pending, pushLog]
  );

  const applyNodeConfig = useCallback(
    (nodeId: string, label: string, config: Record<string, unknown>) => {
      setNodes((previous) =>
        previous.map((node) =>
          node.id === nodeId ? { ...node, label, config } : node
        )
      );
      setDirty(true);
      setNotice("Node configuration applied to the canvas.");
      pushLog("ok", `Configuration applied · ${nodeId}`);
    },
    [pushLog]
  );

  const autoLayout = useCallback(() => {
    if (!canModify) return;
    const groups = new Map<number, BlueprintNode[]>();
    for (const node of nodes) {
      const stage = getNodeSpec(catalogByType, node.type).stage || 1;
      const group = groups.get(stage) ?? [];
      group.push(node);
      groups.set(stage, group);
    }
    setNodes((previous) =>
      previous.map((node) => {
        const stage = getNodeSpec(catalogByType, node.type).stage || 1;
        const group = groups.get(stage) ?? [];
        const index = Math.max(
          group.findIndex((item) => item.id === node.id),
          0
        );
        const tallest = Math.max(
          ...Array.from(groups.values()).map((items) => items.length),
          1
        );
        return {
          ...node,
          position: {
            ...node.position,
            x: 70 + (stage - 1) * 310,
            y: 120 + index * 170 + (tallest - group.length) * 24,
          },
        };
      })
    );
    setDirty(true);
    pushLog("ok", "Auto-layout applied across the five pipeline stages.");
  }, [canModify, catalogByType, nodes, pushLog]);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (nodes.length === 0) {
      setZoom(0.85);
      viewport.scrollTo({ left: 0, top: 0 });
      return;
    }
    const maxX =
      Math.max(...nodes.map((node) => node.position.x + NODE_W), 400) + 90;
    const maxY =
      Math.max(
        ...nodes.map((node) =>
          node.position.y + nodeHeight(getNodeSpec(catalogByType, node.type))
        ),
        260
      ) + 90;
    const nextZoom = clampZoom(
      Math.min(
        (viewport.clientWidth - 28) / maxX,
        (viewport.clientHeight - 28) / maxY,
        1.15
      )
    );
    setZoom(nextZoom);
    viewport.scrollTo({ left: 0, top: 0 });
  }, [catalogByType, nodes]);

  const copyYaml = useCallback(async () => {
    if (!yamlText) return;
    try {
      await navigator.clipboard.writeText(yamlText);
      setNotice("model_routes.yaml copied to clipboard.");
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }, [yamlText]);

  const downloadYaml = useCallback(() => {
    if (!yamlText) return;
    const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draftId || "model_routes"}.yaml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [draftId, yamlText]);

  const exportBlueprintPackage = useCallback(() => {
    const targetSites = sitesInput
      .split(",")
      .map((site) => site.trim())
      .filter(Boolean);
    const bundle = {
      format: "aryorithm.blueprint/v1",
      exported_at: new Date().toISOString(),
      signature_algorithm: "Ed25519",
      blueprint: {
        id: draftId ?? "unsaved",
        name: name.trim() || "Untitled Threat Blueprint",
        description,
        target_sites: targetSites,
        status,
        nodes,
        edges,
        compiled_yaml: yamlText || null,
        compiled_at: compiledAt,
        estimated_latency_ns: compileResult?.estimated_latency_ns ?? null,
        validation: {
          errors: compileErrors,
          warnings: compileWarnings,
          local_checks: checks,
        },
      },
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/vnd.aryorithm.blueprint+json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draftId || name.trim().replace(/\s+/g, "_") || "threat_blueprint"}.blueprint`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Standalone .blueprint bundle exported for offline deployment.");
  }, [
    checks,
    compiledAt,
    compileErrors,
    compileResult?.estimated_latency_ns,
    compileWarnings,
    description,
    draftId,
    edges,
    name,
    nodes,
    sitesInput,
    status,
    yamlText,
  ]);

  /* ------------------------------ derived ---------------------------- */
  const filteredBlueprints = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return libraryQuery.data;
    return libraryQuery.data.filter((blueprint) =>
      [
        blueprint.name,
        blueprint.description,
        blueprint.blueprint_id,
        ...(blueprint.target_sites ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [libraryQuery.data, query]);

  const libraryStats = useMemo(
    () => ({
      total: libraryQuery.data.length,
      deployed: libraryQuery.data.filter(
        (blueprint) => blueprint.status === "DEPLOYED"
      ).length,
      validated: libraryQuery.data.filter(
        (blueprint) => blueprint.status === "VALIDATED"
      ).length,
      drafts: libraryQuery.data.filter(
        (blueprint) => blueprint.status === "DRAFT"
      ).length,
    }),
    [libraryQuery.data]
  );

  const pendingSource = pending
    ? nodes.find((node) => node.id === pending.nodeId) ?? null
    : null;
  const pendingStart =
    pending && pendingSource
      ? portCenter(
          pendingSource,
          pending.port,
          "out",
          getNodeSpec(catalogByType, pendingSource.type)
        )
      : null;

  const catalogStages = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!catalog) return [];
    if (!term) return catalog.stages;
    return catalog.stages
      .map((stage) => ({
        ...stage,
        nodes: stage.nodes.filter((node) =>
          `${node.label} ${node.type} ${node.category}`
            .toLowerCase()
            .includes(term)
        ),
      }))
      .filter((stage) => stage.nodes.length > 0);
  }, [catalog, query]);

  /* ------------------------------ library ---------------------------- */
  if (view === "library") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visual Threat Blueprint Editor"
          description="Compose multi-stage detection pipelines, validate socket topology, compile model_routes.yaml, and broadcast the route table to sentinel-nexus."
          breadcrumbs={[
            { label: "AI & Sentinel-Hub", href: "/model-hub" },
            { label: "Visual Threat Blueprints" },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Badge variant={libraryQuery.live ? "kernel" : "telemetry"}>
                {libraryQuery.live ? "LIVE API" : "CACHED"}
              </Badge>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => newBlueprint(true)}
                disabled={!canEdit}
              >
                Load Example
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => newBlueprint(false)}
                disabled={!canEdit}
              >
                + New Blueprint
              </button>
            </div>
          }
        />

        {!canEdit && (
          <Banner kind="warn">
            Your role has read-only access. Blueprint edits and deployment
            require an administrator role.
          </Banner>
        )}
        {libraryQuery.error && !libraryQuery.live && (
          <Banner kind="error">
            Live blueprint library unavailable: {libraryQuery.error}. The
            editor still works when the backend is reachable.
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <LibraryStat
            label="Saved Blueprints"
            value={libraryStats.total}
            detail="Tenant-scoped route graphs"
            tone="text-ink"
          />
          <LibraryStat
            label="Deployed"
            value={libraryStats.deployed}
            detail="Broadcast to fleet"
            tone="text-kernel"
          />
          <LibraryStat
            label="Validated"
            value={libraryStats.validated}
            detail="Compiled, awaiting deploy"
            tone="text-cyan"
          />
          <LibraryStat
            label="Drafts"
            value={libraryStats.drafts}
            detail="Canvas changes in progress"
            tone="text-telemetry"
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Blueprint Library
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Open a graph to edit, compile, and deploy. {libraryStats.total}{" "}
              blueprint{libraryStats.total === 1 ? "" : "s"} in this tenant.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="admin-input py-1.5 pl-8 text-[12px]"
              placeholder="Filter by name, site, or ID..."
              aria-label="Filter blueprints"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
              ⌕
            </span>
          </div>
        </div>

        {libraryQuery.loading && !libraryQuery.live ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="admin-card h-[226px] animate-pulse p-4"
              >
                <div className="h-3 w-24 rounded bg-hairline" />
                <div className="mt-4 h-5 w-2/3 rounded bg-hairline" />
                <div className="mt-3 h-3 w-full rounded bg-hairline/70" />
                <div className="mt-2 h-3 w-4/5 rounded bg-hairline/70" />
                <div className="mt-8 h-9 w-full rounded bg-hairline/50" />
              </div>
            ))}
          </div>
        ) : filteredBlueprints.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredBlueprints.map((blueprint) => (
              <article
                key={blueprint.blueprint_id}
                className="admin-card flex min-h-[232px] flex-col p-4 transition-colors hover:border-cyan/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-semibold text-ink">
                      {blueprint.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      {blueprint.blueprint_id}
                    </p>
                  </div>
                  <Badge variant={statusVariant(blueprint.status)}>
                    {blueprint.status}
                  </Badge>
                </div>

                <p className="mt-2 line-clamp-2 min-h-[32px] text-[12px] leading-relaxed text-muted">
                  {blueprint.description || "No description provided."}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniMetric label="Nodes" value={blueprint.node_count} />
                  <MiniMetric label="Wires" value={blueprint.edge_count} />
                  <MiniMetric
                    label="Sites"
                    value={blueprint.target_sites.length}
                  />
                </div>

                {blueprint.target_sites.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {blueprint.target_sites.slice(0, 3).map((site) => (
                      <span
                        key={site}
                        className="rounded border border-hairline bg-void/60 px-1.5 py-0.5 font-mono text-[9px] text-muted"
                      >
                        {site}
                      </span>
                    ))}
                    {blueprint.target_sites.length > 3 && (
                      <span className="px-1 py-0.5 font-mono text-[9px] text-muted">
                        +{blueprint.target_sites.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div className="font-mono text-[9px] leading-relaxed text-muted">
                    <p>UPDATED {formatDate(blueprint.updated_at)}</p>
                    <p>
                      {blueprint.last_deployed_at
                        ? `DEPLOYED ${formatDate(blueprint.last_deployed_at)}`
                        : "NEVER DEPLOYED"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        className="admin-btn-ghost px-2 text-muted hover:text-threat"
                        title="Delete blueprint"
                        aria-label={`Delete ${blueprint.name}`}
                        onClick={() =>
                          handleDeleteBlueprint(blueprint.blueprint_id)
                        }
                        disabled={busy !== null}
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn-secondary px-3 py-1.5 text-[10px]"
                      onClick={() => openBlueprint(blueprint.blueprint_id)}
                      disabled={busy !== null}
                    >
                      {busy === "load" ? "OPENING…" : "OPEN"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-card flex min-h-[330px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-cyan/25 bg-cyan/[0.06] font-mono text-2xl text-cyan">
              ⌗
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              {query ? "No matching blueprints" : "No blueprints yet"}
            </h3>
            <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">
              {query
                ? "Try a different name, site, or blueprint identifier."
                : "Build a pipeline from ingress sensors through reflex guards, silicon models, cross-modal fusion, and in-kernel mitigation."}
            </p>
            {!query && (
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={() => newBlueprint(true)}
                  disabled={!canEdit}
                >
                  Load Example Graph
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => newBlueprint(false)}
                  disabled={!canEdit}
                >
                  Start Blank
                </button>
              </div>
            )}
          </div>
        )}

        <div className="admin-card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
          <span className="text-cyan">PIPELINE</span>
          <span>◉ Ingress</span>
          <span>⌘ Reflex</span>
          <span>⬡ Silicon</span>
          <span>⇄ Fusion</span>
          <span>⊘ Mitigation</span>
          <span className="ml-auto text-muted/70">
            model_routes.yaml · sentinel-nexus gRPC
          </span>
        </div>
      </div>
    );
  }

  /* ------------------------------- editor ---------------------------- */
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <li>
              <Link href="/model-hub" className="hover:text-cyan">
                AI &amp; Sentinel-Hub
              </Link>
            </li>
            <li className="text-muted/40">/</li>
            <li>
              <button
                type="button"
                className="hover:text-cyan"
                onClick={() => leaveEditor()}
              >
                Blueprints
              </button>
            </li>
            <li className="text-muted/40">/</li>
            <li className="max-w-[230px] truncate text-ink">
              {name || "Untitled"}
            </li>
          </ol>
        </nav>
        <div className="flex items-center gap-2">
          <Badge variant={catalogQuery.live ? "kernel" : "telemetry"}>
            {catalogQuery.live ? "CATALOG LIVE" : "CATALOG CACHED"}
          </Badge>
          {dirty && (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-telemetry">
              ● Unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="admin-btn-ghost px-2 text-[16px] leading-none"
            title="Back to blueprint library"
            aria-label="Back to blueprint library"
            onClick={() => leaveEditor()}
          >
            ←
          </button>
          <div className="min-w-[200px] flex-1">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setDirty(true);
              }}
              className="w-full border-0 bg-transparent p-0 font-display text-[18px] font-bold text-ink outline-none placeholder:text-muted/50 focus:ring-0 disabled:opacity-70"
              placeholder="Blueprint name"
              disabled={!canModify}
              aria-label="Blueprint name"
            />
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              <span>{draftId ?? "unsaved draft"}</span>
              <span className="text-muted/30">·</span>
              <span>{nodes.length} nodes</span>
              <span className="text-muted/30">·</span>
              <span>{edges.length} wires</span>
              {compiledAt && (
                <>
                  <span className="text-muted/30">·</span>
                  <span className="text-cyan">
                    compiled {formatDate(compiledAt)}
                  </span>
                </>
              )}
              {lastDeployedAt && (
                <>
                  <span className="text-muted/30">·</span>
                  <span className="text-kernel">
                    deployed {formatDate(lastDeployedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
          <Badge variant={statusVariant(status)}>{status}</Badge>
          {canEdit && (
            <button
              type="button"
              className="admin-btn-ghost px-2 text-muted hover:text-threat"
              title="Delete this blueprint"
              aria-label="Delete this blueprint"
              onClick={() => draftId && handleDeleteBlueprint(draftId)}
              disabled={!draftId || busy !== null}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleSave}
            disabled={!canModify || busy !== null || !name.trim()}
          >
            {busy === "save" ? "SAVING…" : "SAVE DRAFT"}
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={exportBlueprintPackage}
            title="Export a standalone .blueprint bundle for air-gapped deployment"
          >
            EXPORT .BLUEPRINT
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-2">
          <div className="flex rounded-md border border-hairline p-0.5">
            <button
              type="button"
              className={`rounded px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                mode === "edit"
                  ? "bg-cyan/15 text-cyan"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setMode("edit")}
              disabled={!canEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className={`rounded px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                mode === "view"
                  ? "bg-cyan/15 text-cyan"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => {
                setMode("view");
                setPending(null);
                setPanMode(false);
              }}
            >
              View
            </button>
          </div>

          <span className="h-5 w-px bg-hairline" />

          <div className="flex items-center rounded-md border border-hairline">
            <button
              type="button"
              className="px-2 py-1 font-mono text-[12px] text-muted hover:text-cyan"
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-[42px] px-1 text-center font-mono text-[9px] text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="px-2 py-1 font-mono text-[12px] text-muted hover:text-cyan"
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          <ToolbarButton
            active={snap}
            onClick={() => setSnap((value) => !value)}
            label={snap ? "SNAP ON" : "SNAP OFF"}
          />
          <ToolbarButton
            active={panMode}
            onClick={() => setPanMode((value) => !value)}
            label="PAN"
          />
          <ToolbarButton
            onClick={autoLayout}
            label="AUTO-LAYOUT"
            disabled={!canModify || nodes.length === 0}
          />
          <ToolbarButton onClick={fitToView} label="FIT" />
          <ToolbarButton
            onClick={() => {
              setPending(null);
              setCursor(null);
              setSelected(null);
            }}
            label="CLEAR SELECT"
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-btn-secondary px-3 py-1.5 text-[10px]"
              onClick={() => compileCurrent("validate")}
              disabled={!canModify || busy !== null}
            >
              {busy === "validate" ? "VALIDATING…" : "VALIDATE"}
            </button>
            <button
              type="button"
              className="admin-btn-secondary px-3 py-1.5 text-[10px]"
              onClick={() => compileCurrent("compile")}
              disabled={!canModify || busy !== null}
            >
              {busy === "compile" ? "COMPILING…" : "COMPILE YAML"}
            </button>
            <button
              type="button"
              className="admin-btn-primary px-3 py-1.5 text-[10px]"
              onClick={handleDeploy}
              disabled={!canModify || busy !== null}
            >
              {busy === "deploy" ? "DEPLOYING…" : "DEPLOY TO FLEET"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner kind="success" onClose={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      <div className="grid gap-3 xl:grid-cols-[210px_minmax(0,1fr)_306px]">
        {/* ----------------------------- palette ----------------------------- */}
        <aside className="admin-card flex max-h-[720px] flex-col overflow-hidden xl:max-h-[calc(100vh-235px)]">
          <div className="border-b border-hairline p-3">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                Node Palette
              </h2>
              <span className="font-mono text-[8px] text-muted/70">
                v{catalog?.version ?? "1.0"}
              </span>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="admin-input mt-2 py-1 text-[11px]"
              placeholder="Filter palette..."
              aria-label="Filter node palette"
            />
          </div>

          <div className="blueprint-scroll flex-1 overflow-y-auto p-2">
            {catalogQuery.loading && !catalog ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded border border-hairline/60 bg-void/40"
                  />
                ))}
              </div>
            ) : catalogQuery.error && !catalog ? (
              <p className="p-2 text-[11px] leading-relaxed text-threat">
                Node catalog unavailable. {catalogQuery.error}
              </p>
            ) : catalogStages.length === 0 ? (
              <p className="p-2 text-[10.5px] leading-relaxed text-muted">
                No palette nodes match “{query}”.
              </p>
            ) : (
              catalogStages.map((stage) => {
                const collapsed = collapsedStages[stage.stage] ?? false;
                return (
                  <div key={stage.stage} className="mb-1">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left hover:bg-cyan/[0.04]"
                      onClick={() =>
                        setCollapsedStages((previous) => ({
                          ...previous,
                          [stage.stage]: !collapsed,
                        }))
                      }
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                        {stage.name}
                      </span>
                      <span className="font-mono text-[8px] text-muted/60">
                        {stage.nodes.length}
                      </span>
                      <span className="font-mono text-[9px] text-muted/60">
                        {collapsed ? "▸" : "▾"}
                      </span>
                    </button>

                    {!collapsed && (
                      <div className="space-y-1.5 pb-2">
                        {stage.nodes.map((item) => (
                          <button
                            key={item.catalog_id}
                            type="button"
                            draggable={canModify}
                            onDragStart={(event) => {
                              if (!canModify) {
                                event.preventDefault();
                                return;
                              }
                              event.dataTransfer.setData(
                                "application/x-threat-blueprint-node",
                                item.catalog_id
                              );
                              event.dataTransfer.effectAllowed = "copy";
                            }}
                            onClick={() => addFromPalette(item)}
                            disabled={!canModify}
                            className="group w-full rounded-md border border-hairline/80 bg-void/50 p-2 text-left transition-colors hover:border-cyan/40 hover:bg-cyan/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                            title={item.description}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[12px]"
                                style={{ color: stage.color }}
                              >
                                {TYPE_ICONS[item.type] ?? "◈"}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-ink">
                                {item.label}
                              </span>
                              <span className="font-mono text-[7.5px] text-muted">
                                {formatLatency(item.latency_sla_ns)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted/70">
                              <span className="truncate">{item.type}</span>
                              <span>S{item.stage}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-hairline p-3">
            <p className="text-[9.5px] leading-relaxed text-muted">
              Drag onto canvas or click to append. Connect an{" "}
              <span className="text-muted/80">output</span> socket to a
              compatible <span className="text-muted/80">input</span>.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(socketColors).map(([type, color]) => (
                <span
                  key={type}
                  className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.06em] text-muted"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {type.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* ---------------------------- canvas ------------------------------ */}
        <section className="min-w-0 space-y-3">
          <div className="admin-card overflow-hidden">
            <div className="flex h-9 items-center gap-3 border-b border-hairline px-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                Canvas
              </span>
              <span className="font-mono text-[8.5px] text-muted/70">
                {nodes.length} nodes · {edges.length} wires ·{" "}
                {catalog?.stages.length ?? 5} stages
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    mode === "view" ? "bg-telemetry" : "bg-kernel"
                  }`}
                />
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                  {mode === "view" ? "read only" : "editable"}
                </span>
                {panMode && (
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cyan">
                    pan mode
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <div
                ref={viewportRef}
                className={`blueprint-canvas blueprint-scroll relative h-[clamp(430px,52vh,650px)] overflow-auto ${
                  panMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                }`}
                onPointerDown={(event) => {
                  if (panMode) {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    panRef.current = {
                      x: event.clientX,
                      y: event.clientY,
                      left: viewport.scrollLeft,
                      top: viewport.scrollTop,
                    };
                    viewport.setPointerCapture(event.pointerId);
                    event.preventDefault();
                  }
                }}
                onPointerMove={(event) => {
                  const pan = panRef.current;
                  const viewport = viewportRef.current;
                  if (!pan || !viewport) return;
                  viewport.scrollLeft = pan.left - (event.clientX - pan.x);
                  viewport.scrollTop = pan.top - (event.clientY - pan.y);
                }}
                onPointerUp={(event) => {
                  if (!panRef.current) return;
                  panRef.current = null;
                  viewportRef.current?.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  panRef.current = null;
                }}
              >
                <div
                  style={{
                    width: STAGE_W * zoom,
                    height: STAGE_H * zoom,
                  }}
                >
                  <div
                    ref={stageRef}
                    className="blueprint-stage relative"
                    style={{
                      width: STAGE_W,
                      height: STAGE_H,
                      transform: `scale(${zoom})`,
                      transformOrigin: "0 0",
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                      if (!dragOver) setDragOver(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) {
                        setDragOver(false);
                      }
                    }}
                    onDrop={handleDrop}
                    onPointerDown={(event) => {
                      if (panMode) return;
                      if (event.target === event.currentTarget) {
                        setSelected(null);
                        setPending(null);
                        setCursor(null);
                      }
                    }}
                    onPointerMove={(event) => {
                      if (!pending) return;
                      const stage = stageRef.current;
                      if (!stage) return;
                      const rect = stage.getBoundingClientRect();
                      setCursor({
                        x: (event.clientX - rect.left) / zoom,
                        y: (event.clientY - rect.top) / zoom,
                      });
                    }}
                  >
                    <svg
                      width={STAGE_W}
                      height={STAGE_H}
                      className="absolute inset-0"
                      style={{ pointerEvents: "none" }}
                      aria-hidden="true"
                    >
                      <defs>
                        {Object.entries(socketColors).map(([type, color]) => (
                          <marker
                            key={type}
                            id={`bp-arrow-${type}`}
                            markerWidth="8"
                            markerHeight="8"
                            refX="7"
                            refY="4"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
                          </marker>
                        ))}
                      </defs>

                      {edges.map((edge) => {
                        const source = nodes.find(
                          (node) => node.id === edge.source_node
                        );
                        const target = nodes.find(
                          (node) => node.id === edge.target_node
                        );
                        if (!source || !target) return null;
                        const sourceSpec = getNodeSpec(
                          catalogByType,
                          source.type
                        );
                        const targetSpec = getNodeSpec(
                          catalogByType,
                          target.type
                        );
                        const sourcePort = sourceSpec.outputs.find(
                          (port) => port.name === edge.source_port
                        );
                        const targetPort = targetSpec.inputs.find(
                          (port) => port.name === edge.target_port
                        );
                        if (!sourcePort || !targetPort) return null;
                        const start = portCenter(
                          source,
                          edge.source_port,
                          "out",
                          sourceSpec
                        );
                        const end = portCenter(
                          target,
                          edge.target_port,
                          "in",
                          targetSpec
                        );
                        const path = wirePath(start, end);
                        const color =
                          socketColors[sourcePort.socket_type] ??
                          "#00E5FF";
                        const isSelected =
                          selected?.kind === "edge" &&
                          selected.id === edge.id;
                        return (
                          <g key={edge.id}>
                            <path
                              d={path}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={16}
                              style={{
                                pointerEvents: "stroke",
                                cursor: "pointer",
                              }}
                              onPointerDown={(event) => {
                                if (panMode) return;
                                event.stopPropagation();
                                setSelected({
                                  kind: "edge",
                                  id: edge.id,
                                });
                                setPending(null);
                                setCursor(null);
                              }}
                            />
                            <path
                              d={path}
                              fill="none"
                              stroke={color}
                              strokeWidth={isSelected ? 3 : 2}
                              strokeLinecap="round"
                              markerEnd={`url(#bp-arrow-${sourcePort.socket_type})`}
                              className={isSelected ? "" : "blueprint-wire"}
                              opacity={isSelected ? 1 : 0.82}
                              style={{ pointerEvents: "none" }}
                            />
                          </g>
                        );
                      })}

                      {pendingStart && cursor && (
                        <path
                          d={wirePath(pendingStart, cursor)}
                          fill="none"
                          stroke={
                            socketColors[pending?.socketType ?? ""] ??
                            "#00E5FF"
                          }
                          strokeWidth={1.6}
                          strokeDasharray="6 6"
                          opacity={0.75}
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                    </svg>

                    {nodes.map((node) => {
                      const spec = getNodeSpec(catalogByType, node.type);
                      const accent =
                        STAGE_COLORS[spec.stage] ??
                        socketColors.PACKET_STREAM;
                      const height = nodeHeight(spec);
                      const isSelected =
                        selected?.kind === "node" &&
                        selected.id === node.id;
                      const definition = catalogByType[node.type];
                      return (
                        <div
                          key={node.id}
                          className={`absolute z-10 rounded-md border bg-panel/95 backdrop-blur transition-shadow ${
                            isSelected
                              ? "blueprint-node-active border-cyan/70"
                              : "border-hairline hover:border-cyan/35"
                          } ${
                            canModify && !panMode
                              ? "cursor-move"
                              : "cursor-pointer"
                          }`}
                          style={{
                            left: node.position.x,
                            top: node.position.y,
                            width: NODE_W,
                            height,
                          }}
                          onPointerDown={(event) =>
                            handleNodePointerDown(event, node)
                          }
                        >
                          <div
                            className="flex items-center gap-2 px-2.5"
                            style={{
                              height: NODE_HEADER_H,
                              borderLeft: `3px solid ${accent}`,
                            }}
                          >
                            <span
                              className="text-[12px]"
                              style={{ color: accent }}
                            >
                              {TYPE_ICONS[node.type] ?? "◈"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10.5px] font-semibold leading-tight text-ink">
                                {node.label || definition?.label || node.type}
                              </p>
                              <p className="truncate font-mono text-[7px] uppercase tracking-[0.08em] text-muted">
                                {node.type} · S{spec.stage || "?"}
                              </p>
                            </div>
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: accent }}
                            />
                          </div>

                          {spec.inputs.map((port, index) => {
                            const color =
                              port.color ??
                              socketColors[port.socket_type] ??
                              "#00E5FF";
                            const compatible =
                              pending !== null &&
                              pending.nodeId !== node.id &&
                              (
                                SOCKET_COMPATIBILITY[pending.socketType] ?? [
                                  pending.socketType,
                                ]
                              ).includes(port.socket_type);
                            return (
                              <div key={`in-${port.name}`}>
                                <button
                                  type="button"
                                  className="absolute z-20 h-[11px] w-[11px] -translate-y-1/2 rounded-full border-2 transition-transform hover:scale-125"
                                  style={{
                                    left: -6,
                                    top:
                                      PORT_START_Y + index * PORT_GAP,
                                    borderColor: color,
                                    backgroundColor: compatible
                                      ? color
                                      : "#0D111A",
                                    boxShadow: compatible
                                      ? `0 0 10px ${color}`
                                      : undefined,
                                  }}
                                  onPointerDown={(event) => {
                                    if (!panMode) event.stopPropagation();
                                  }}
                                  onClick={(event) =>
                                    completeConnection(event, node, port)
                                  }
                                  title={`${port.name} · ${port.socket_type}${
                                    port.required === false
                                      ? " · optional"
                                      : " · required"
                                  }`}
                                  aria-label={`Input ${port.name} on ${node.label}`}
                                />
                                <span
                                  className="pointer-events-none absolute font-mono text-[7.5px] uppercase tracking-[0.06em] text-muted"
                                  style={{
                                    left: 11,
                                    top:
                                      PORT_START_Y +
                                      index * PORT_GAP -
                                      4,
                                  }}
                                >
                                  {port.name}
                                </span>
                              </div>
                            );
                          })}

                          {spec.outputs.map((port, index) => {
                            const color =
                              port.color ??
                              socketColors[port.socket_type] ??
                              "#00E5FF";
                            const isSource =
                              pending?.nodeId === node.id &&
                              pending.port === port.name;
                            return (
                              <div key={`out-${port.name}`}>
                                <span
                                  className="pointer-events-none absolute font-mono text-[7.5px] uppercase tracking-[0.06em] text-muted"
                                  style={{
                                    right: 11,
                                    top:
                                      PORT_START_Y +
                                      index * PORT_GAP -
                                      4,
                                  }}
                                >
                                  {port.name}
                                </span>
                                <button
                                  type="button"
                                  className="absolute z-20 h-[11px] w-[11px] -translate-y-1/2 rounded-full border-2 transition-transform hover:scale-125"
                                  style={{
                                    right: -6,
                                    top:
                                      PORT_START_Y + index * PORT_GAP,
                                    borderColor: color,
                                    backgroundColor: isSource
                                      ? color
                                      : "#0D111A",
                                    boxShadow: isSource
                                      ? `0 0 10px ${color}`
                                      : undefined,
                                  }}
                                  onPointerDown={(event) => {
                                    if (!panMode) event.stopPropagation();
                                  }}
                                  onClick={(event) =>
                                    beginConnection(event, node, port)
                                  }
                                  title={`${port.name} · ${port.socket_type}`}
                                  aria-label={`Output ${port.name} on ${node.label}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-cyan/20 bg-cyan/[0.05] font-mono text-2xl text-cyan/80">
                      ⌗
                    </div>
                    <p className="mt-3 font-display text-[14px] font-semibold text-ink">
                      Empty canvas
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Drag a palette node here, click a palette entry, or load
                      the example graph from the library.
                    </p>
                  </div>
                </div>
              )}

              {dragOver && (
                <div className="pointer-events-none absolute inset-2 z-30 rounded-md border-2 border-dashed border-cyan/50 bg-cyan/[0.03]" />
              )}
            </div>
          </div>

          <BottomPanel
            tab={bottomTab}
            onTab={setBottomTab}
            yamlText={yamlText}
            compiledAt={compiledAt}
            compileResult={compileResult}
            compileErrors={compileErrors}
            compileWarnings={compileWarnings}
            deployResult={deployResult}
            checks={checks}
            logs={logs}
            busy={busy}
            canModify={canModify}
            onCompile={() => compileCurrent("compile")}
            onCopy={copyYaml}
            onDownload={downloadYaml}
          />
        </section>

        {/* ---------------------------- inspector --------------------------- */}
        <aside className="admin-card flex max-h-[720px] flex-col overflow-hidden xl:max-h-[calc(100vh-235px)]">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
            <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
              Inspector
            </h2>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted/70">
              {selectedNode
                ? "Node"
                : selectedEdge
                  ? "Wire"
                  : "Blueprint"}
            </span>
          </div>
          <div className="blueprint-scroll flex-1 overflow-y-auto p-3">
            {selectedNode ? (
              <NodeInspector
                key={selectedNode.id}
                node={selectedNode}
                spec={getNodeSpec(catalogByType, selectedNode.type)}
                canModify={canModify}
                onApply={applyNodeConfig}
                onDelete={removeNode}
              />
            ) : selectedEdge ? (
              <EdgeInspector
                edge={selectedEdge}
                nodes={nodes}
                catalogByType={catalogByType}
                canModify={canModify}
                onDelete={removeEdge}
              />
            ) : (
              <BlueprintSettings
                draftId={draftId}
                status={status}
                description={description}
                sitesInput={sitesInput}
                nodes={nodes}
                edges={edges}
                catalogByType={catalogByType}
                compiledAt={compiledAt}
                lastDeployedAt={lastDeployedAt}
                canModify={canModify}
                canEdit={canEdit}
                onDescriptionChange={(value) => {
                  setDescription(value);
                  setDirty(true);
                }}
                onSitesChange={(value) => {
                  setSitesInput(value);
                  setDirty(true);
                }}
                onDelete={
                  draftId ? () => handleDeleteBlueprint(draftId) : undefined
                }
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Page subcomponents
 * ------------------------------------------------------------------------ */
function Banner({
  kind,
  children,
  onClose,
}: {
  kind: "error" | "warn" | "success";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    error: "border-threat/30 bg-threat/[0.06] text-threat",
    warn: "border-telemetry/30 bg-telemetry/[0.06] text-telemetry",
    success: "border-kernel/30 bg-kernel/[0.06] text-kernel",
  } as const;
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-2 text-[11.5px] leading-relaxed ${styles[kind]}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="mt-0.5 font-mono text-[10px]">
        {kind === "error" ? "ERR" : kind === "warn" ? "WARN" : "OK"}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          className="shrink-0 font-mono text-[11px] opacity-60 hover:opacity-100"
          onClick={onClose}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function LibraryStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <div className="admin-card px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-[24px] font-bold tabular ${tone}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-hairline/70 bg-void/50 px-2 py-1.5">
      <p className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12px] text-ink tabular">{value}</p>
    </div>
  );
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-cyan/40 bg-cyan/10 text-cyan"
          : "border-hairline text-muted hover:border-cyan/40 hover:text-cyan"
      }`}
    >
      {label}
    </button>
  );
}

function NodeInspector({
  node,
  spec,
  canModify,
  onApply,
  onDelete,
}: {
  node: BlueprintNode;
  spec: NodeSpec;
  canModify: boolean;
  onApply: (
    nodeId: string,
    label: string,
    config: Record<string, unknown>
  ) => void;
  onDelete: (nodeId: string) => void;
}) {
  const fields = CONFIG_FIELDS[node.type] ?? [];
  const [label, setLabel] = useState(node.label);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      const value = node.config?.[field.key];
      initial[field.key] =
        value === null || value === undefined ? "" : String(value);
    }
    return initial;
  });

  const apply = () => {
    const next: Record<string, unknown> = { ...node.config };
    for (const field of fields) {
      const raw = (values[field.key] ?? "").trim();
      if (field.type === "number") {
        if (!raw) {
          delete next[field.key];
        } else {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) next[field.key] = parsed;
        }
      } else if (!raw) {
        delete next[field.key];
      } else {
        next[field.key] = raw;
      }
    }
    onApply(node.id, label.trim() || node.label, next);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-hairline bg-void/45 p-2.5">
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 text-[14px]"
            style={{ color: STAGE_COLORS[spec.stage] ?? "#00E5FF" }}
          >
            {TYPE_ICONS[node.type] ?? "◈"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-ink">
              {node.label}
            </p>
            <p className="mt-0.5 break-all font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
              {node.type} · stage {spec.stage || "?"} · {node.id}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Display label
        </label>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="admin-input py-1.5 text-[11.5px]"
          disabled={!canModify}
        />
      </div>

      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-muted">
                <span>{field.label}</span>
                {field.type === "number" && (
                  <span className="text-[7px] text-muted/50">NUM</span>
                )}
              </label>
              {field.type === "select" ? (
                <select
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="admin-input py-1.5 text-[11.5px]"
                  disabled={!canModify}
                >
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  step={field.step}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="admin-input py-1.5 font-mono text-[11px]"
                  placeholder={field.placeholder}
                  disabled={!canModify}
                />
              )}
              {field.hint && (
                <p className="mt-1 text-[9px] leading-relaxed text-muted/70">
                  {field.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded border border-hairline/60 bg-void/40 px-2 py-2 text-[10px] text-muted">
          This node type has no configurable keys.
        </p>
      )}

      <p className="text-[9px] leading-relaxed text-muted/70">
        Changes are staged until you apply them to the canvas.
      </p>
      <button
        type="button"
        className="admin-btn-primary w-full justify-center py-1.5 text-[9px]"
        onClick={apply}
        disabled={!canModify}
      >
        APPLY CHANGES
      </button>

      <SocketList title="Inputs" ports={spec.inputs} side="in" />
      <SocketList title="Outputs" ports={spec.outputs} side="out" />

      <button
        type="button"
        className="admin-btn-ghost w-full justify-center border border-threat/20 py-1.5 text-[9px] uppercase tracking-[0.1em] text-threat hover:bg-threat/[0.06]"
        onClick={() => onDelete(node.id)}
        disabled={!canModify}
      >
        Delete node + wires
      </button>
    </div>
  );
}

function SocketList({
  title,
  ports,
  side,
}: {
  title: string;
  ports: NodeSpec["inputs"];
  side: "in" | "out";
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
        {title}
      </p>
      {ports.length === 0 ? (
        <p className="text-[9.5px] text-muted/60">None</p>
      ) : (
        <div className="space-y-1">
          {ports.map((port) => {
            const color =
              port.color ?? SOCKET_COLORS[port.socket_type] ?? "#00E5FF";
            return (
              <div
                key={port.name}
                className="flex items-center gap-2 rounded border border-hairline/60 bg-void/40 px-2 py-1"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[8.5px] text-ink">
                  {port.name}
                </span>
                <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                  {port.socket_type.replaceAll("_", " ")}
                </span>
                {side === "in" && port.required === false && (
                  <span className="font-mono text-[7px] text-muted/50">OPT</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EdgeInspector({
  edge,
  nodes,
  catalogByType,
  canModify,
  onDelete,
}: {
  edge: BlueprintEdge;
  nodes: BlueprintNode[];
  catalogByType: Record<string, CatalogNode>;
  canModify: boolean;
  onDelete: (edgeId: string) => void;
}) {
  const source = nodes.find((node) => node.id === edge.source_node);
  const target = nodes.find((node) => node.id === edge.target_node);
  const sourceSpec = source
    ? getNodeSpec(catalogByType, source.type)
    : null;
  const targetSpec = target
    ? getNodeSpec(catalogByType, target.type)
    : null;
  const sourcePort = sourceSpec?.outputs.find(
    (port) => port.name === edge.source_port
  );
  const targetPort = targetSpec?.inputs.find(
    (port) => port.name === edge.target_port
  );
  const color =
    (sourcePort &&
      (sourcePort.color ??
        SOCKET_COLORS[sourcePort.socket_type] ??
        "#00E5FF")) ||
    "#00E5FF";

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-hairline bg-void/45 p-2.5">
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Wire
        </p>
        <p className="mt-1 break-all font-mono text-[10px] text-ink">
          {edge.id}
        </p>
      </div>

      <div className="rounded-md border border-hairline bg-void/35 p-2.5">
        <div className="flex items-start gap-2">
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium text-ink">
              {source?.label ?? edge.source_node}
            </p>
            <p className="mt-0.5 font-mono text-[8px] text-muted">
              {edge.source_node}.{edge.source_port}
            </p>
          </div>
        </div>
        <div className="my-2 ml-1 h-4 border-l border-dashed border-hairline" />
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-hairline bg-panel" />
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium text-ink">
              {target?.label ?? edge.target_node}
            </p>
            <p className="mt-0.5 font-mono text-[8px] text-muted">
              {edge.target_node}.{edge.target_port}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-hairline/70 bg-void/40 px-2 py-1.5">
          <p className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted">
            Source
          </p>
          <p className="mt-0.5 font-mono text-[8.5px] text-ink">
            {sourcePort?.socket_type ?? "unknown"}
          </p>
        </div>
        <div className="rounded border border-hairline/70 bg-void/40 px-2 py-1.5">
          <p className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted">
            Target
          </p>
          <p className="mt-0.5 font-mono text-[8.5px] text-ink">
            {targetPort?.socket_type ?? "unknown"}
          </p>
        </div>
      </div>

      <p className="text-[9.5px] leading-relaxed text-muted">
        Wires are directional. Delete this wire to disconnect the route; the
        nodes and their configurations remain on the canvas.
      </p>

      <button
        type="button"
        className="admin-btn-ghost w-full justify-center border border-threat/20 py-1.5 text-[9px] uppercase tracking-[0.1em] text-threat hover:bg-threat/[0.06]"
        onClick={() => onDelete(edge.id)}
        disabled={!canModify}
      >
        Delete wire
      </button>
    </div>
  );
}

function BlueprintSettings({
  draftId,
  status,
  description,
  sitesInput,
  nodes,
  edges,
  catalogByType,
  compiledAt,
  lastDeployedAt,
  canModify,
  canEdit,
  onDescriptionChange,
  onSitesChange,
  onDelete,
}: {
  draftId: string | null;
  status: string;
  description: string;
  sitesInput: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  catalogByType: Record<string, CatalogNode>;
  compiledAt: string | null;
  lastDeployedAt: string | null;
  canModify: boolean;
  canEdit: boolean;
  onDescriptionChange: (value: string) => void;
  onSitesChange: (value: string) => void;
  onDelete?: () => void;
}) {
  const stageCounts = [1, 2, 3, 4, 5].map((stage) => ({
    stage,
    color: STAGE_COLORS[stage],
    count: nodes.filter(
      (node) => getNodeSpec(catalogByType, node.type).stage === stage
    ).length,
  }));
  const maxStageCount = Math.max(...stageCounts.map((item) => item.count), 1);
  const sites = uniqueSites(sitesInput);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-hairline bg-void/45 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            Blueprint
          </p>
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>
        <p className="mt-1 break-all font-mono text-[9px] text-ink">
          {draftId ?? "Unsaved draft"}
        </p>
        <p className="mt-1 font-mono text-[8px] text-muted">
          Last compile {formatDate(compiledAt)} · Last deploy{" "}
          {formatDate(lastDeployedAt)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="Nodes" value={nodes.length} />
        <MiniMetric label="Wires" value={edges.length} />
        <MiniMetric
          label="Sites"
          value={sites.length}
        />
      </div>

      <div>
        <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Stage distribution
        </p>
        <div className="space-y-1.5">
          {stageCounts.map((item) => (
            <div key={item.stage} className="flex items-center gap-2">
              <span className="w-3 font-mono text-[8px] text-muted">
                S{item.stage}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline/60">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.count / maxStageCount) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="w-4 text-right font-mono text-[8px] text-muted">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Description
        </label>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="admin-input min-h-[72px] resize-none py-1.5 text-[11px] leading-relaxed"
          placeholder="What does this pipeline detect or prevent?"
          disabled={!canModify}
        />
      </div>

      <div>
        <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Target sites
        </label>
        <input
          value={sitesInput}
          onChange={(event) => onSitesChange(event.target.value)}
          className="admin-input py-1.5 text-[11px]"
          placeholder="Substation-A, Plant-7"
          disabled={!canModify}
        />
        <p className="mt-1 text-[9px] text-muted/70">
          Comma-separated. Empty deploys to the global fleet.
        </p>
        {sites.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sites.map((site) => (
              <span
                key={site}
                className="rounded border border-hairline bg-void/50 px-1.5 py-0.5 font-mono text-[8px] text-muted"
              >
                {site}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-hairline/70 bg-void/30 p-2.5">
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
          Socket legend
        </p>
        <div className="mt-1.5 space-y-1">
          {Object.entries(SOCKET_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-[8px] text-muted">
                {type.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {canEdit && onDelete && (
        <button
          type="button"
          className="admin-btn-ghost w-full justify-center border border-threat/20 py-1.5 text-[9px] uppercase tracking-[0.1em] text-threat hover:bg-threat/[0.06]"
          onClick={onDelete}
        >
          Delete blueprint
        </button>
      )}
    </div>
  );
}

function BottomPanel({
  tab,
  onTab,
  yamlText,
  compiledAt,
  compileResult,
  compileErrors,
  compileWarnings,
  deployResult,
  checks,
  logs,
  busy,
  canModify,
  onCompile,
  onCopy,
  onDownload,
}: {
  tab: BottomTab;
  onTab: (tab: BottomTab) => void;
  yamlText: string;
  compiledAt: string | null;
  compileResult: BlueprintCompileResult | null;
  compileErrors: string[];
  compileWarnings: string[];
  deployResult: BlueprintDeployResult | null;
  checks: { ok: boolean; label: string; detail: string }[];
  logs: LogLine[];
  busy: BusyAction;
  canModify: boolean;
  onCompile: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const failures = checks.filter((check) => !check.ok).length;

  return (
    <div className="admin-card flex h-[240px] flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-hairline px-2">
        <button
          type="button"
          onClick={() => onTab("yaml")}
          className={`rounded px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors ${
            tab === "yaml"
              ? "bg-cyan/10 text-cyan"
              : "text-muted hover:text-ink"
          }`}
        >
          model_routes.yaml
        </button>
        <button
          type="button"
          onClick={() => onTab("console")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors ${
            tab === "console"
              ? "bg-cyan/10 text-cyan"
              : "text-muted hover:text-ink"
          }`}
        >
          Validation &amp; Telemetry
          {failures > 0 && (
            <span className="rounded-full bg-threat/15 px-1.5 text-[7.5px] text-threat">
              {failures}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {compiledAt && (
            <span className="hidden font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted sm:inline">
              compiled {formatDate(compiledAt)}
            </span>
          )}
          {compileResult && (
            <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-cyan">
              {formatLatency(compileResult.estimated_latency_ns)}
            </span>
          )}
          {deployResult && (
            <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-kernel">
              {deployResult.broadcast_latency_ms} ms ·{" "}
              {deployResult.fleet_health}
            </span>
          )}
          {tab === "yaml" && yamlText && (
            <>
              <button
                type="button"
                className="admin-btn-ghost px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em]"
                onClick={onCopy}
              >
                Copy
              </button>
              <button
                type="button"
                className="admin-btn-ghost px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em]"
                onClick={onDownload}
              >
                Download
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-void">
        {tab === "yaml" ? (
          yamlText ? (
            <pre className="blueprint-scroll h-full overflow-auto whitespace-pre p-3 font-mono text-[10px] leading-relaxed text-ink/90">
              {yamlText}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                No compiled route table
              </p>
              <p className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-muted/70">
                Save and compile the graph to generate deterministic{" "}
                <span className="font-mono text-muted">model_routes.yaml</span>{" "}
                for sentinel-nexus.
              </p>
              <button
                type="button"
                className="admin-btn-secondary mt-3 px-3 py-1.5 text-[9px]"
                onClick={onCompile}
                disabled={!canModify || busy !== null}
              >
                {busy === "compile" ? "COMPILING…" : "COMPILE GRAPH"}
              </button>
            </div>
          )
        ) : (
          <div className="blueprint-scroll h-full overflow-y-auto p-3">
            {deployResult && (
              <div className="mb-3 rounded border border-kernel/25 bg-kernel/[0.04] px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.08em]">
                  <span className="text-kernel">
                    {deployResult.status} · {deployResult.grpc_status}
                  </span>
                  <span className="text-muted">
                    {deployResult.nodes_targeted} target(s)
                  </span>
                  <span className="text-muted">
                    broadcast {deployResult.broadcast_latency_ms} ms
                  </span>
                  <span className="text-muted">
                    fleet {deployResult.fleet_health}
                  </span>
                  <span className="truncate text-muted/60">
                    sha256 {deployResult.config_sha256.slice(0, 16)}…
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center gap-2 rounded border border-hairline/70 bg-panel/50 px-2.5 py-1.5"
                >
                  <span
                    className={`font-mono text-[8px] font-bold ${
                      check.ok ? "text-kernel" : "text-threat"
                    }`}
                  >
                    {check.ok ? "PASS" : "FAIL"}
                  </span>
                  <span className="text-[10.5px] text-ink">{check.label}</span>
                  <span className="ml-auto truncate font-mono text-[8px] text-muted">
                    {check.detail}
                  </span>
                </div>
              ))}
            </div>

            {compileErrors.length > 0 && (
              <div className="mt-3 rounded border border-threat/30 bg-threat/[0.05] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-threat">
                  Compile errors
                </p>
                <ul className="mt-1 space-y-1">
                  {compileErrors.map((message, index) => (
                    <li
                      key={`${message}-${index}`}
                      className="font-mono text-[9px] leading-relaxed text-threat/90"
                    >
                      · {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {compileWarnings.length > 0 && (
              <div className="mt-3 rounded border border-telemetry/25 bg-telemetry/[0.04] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-telemetry">
                  Compile warnings
                </p>
                <ul className="mt-1 space-y-1">
                  {compileWarnings.map((message, index) => (
                    <li
                      key={`${message}-${index}`}
                      className="font-mono text-[9px] leading-relaxed text-telemetry/90"
                    >
                      · {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                Event log
              </p>
              <div className="space-y-0.5 font-mono text-[9px] leading-relaxed">
                {logs.length === 0 ? (
                  <p className="text-muted/60">
                    No events yet. Drag a node and compile the graph.
                  </p>
                ) : (
                  logs.slice(-40).map((line) => (
                    <div key={line.id} className="flex gap-2">
                      <span className="shrink-0 text-muted/50">
                        {line.time}
                      </span>
                      <span
                        className={`w-9 shrink-0 uppercase ${LOG_COLORS[line.level]}`}
                      >
                        {line.level}
                      </span>
                      <span className="min-w-0 text-muted">{line.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
