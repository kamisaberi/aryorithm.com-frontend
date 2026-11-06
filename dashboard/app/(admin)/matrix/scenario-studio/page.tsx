"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { useBackend } from "@/hooks/useBackend";
import { ApiError } from "@/lib/api";
import { isAdminRole, useAuth } from "@/lib/auth";
import {
  backend,
  type ScenarioCompileIssue,
  type ScenarioGraphDetail,
  type ScenarioGraphSaveResult,
  type ScenarioGraphSummary,
  type ScenarioLink,
  type ScenarioNode,
  type ScenarioPalette,
  type ScenarioPaletteItem,
  type ScenarioSubnet,
} from "@/lib/backend";

import ScenarioStudioCanvas from "./ScenarioStudioCanvas";
import {
  CATEGORY_META,
  FALLBACK_PALETTE,
  NETWORK_TYPES,
  PURDUE_LEVELS,
  SECTOR_OPTIONS,
  STATUS_VARIANTS,
  buildBlankGraph,
  buildTemplateGraph,
  categoryForType,
  configText,
  defaultImage,
  defaultPorts,
  draftFromDetail,
  formatBytes,
  formatDate,
  listText,
  makeLink,
  makeNode,
  makeSubnet,
  nextAvailableIp,
  nodeTypeLabel,
  nodeX,
  nodeY,
  paletteIndex,
  parseConfigText,
  parseListText,
  parsePortsText,
  payloadFromDraft,
  portsText,
  type ScenarioDraft,
  type ScenarioSelection,
} from "./scenario-studio-config";

type View = "library" | "studio";
type BottomTab = "issues" | "yaml" | "bundle";
type BusyAction = "save" | "compile" | "bundle" | "publish" | "launch" | "open" | "delete" | null;

interface BundleInfo {
  name: string;
  size: number | null;
  sha: string | null;
  hubUrl: string | null;
  hubSlug: string | null;
}

interface LaunchInfo {
  status: string;
  launchId: string;
  agentId: string | null;
  message: string;
  dispatchedAt: string | null;
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function extractIssues(error: unknown): ScenarioCompileIssue[] {
  if (!(error instanceof ApiError)) return [];
  const raw = error.details.issues;
  if (!Array.isArray(raw)) return [];
  const issues: ScenarioCompileIssue[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.code !== "string" || typeof row.message !== "string") continue;
    issues.push({
      severity: row.severity === "warning" ? "warning" : "error",
      code: row.code,
      message: row.message,
      subnet_id: typeof row.subnet_id === "string" ? row.subnet_id : null,
      node_id: typeof row.node_id === "string" ? row.node_id : null,
      link_id: typeof row.link_id === "string" ? row.link_id : null,
    });
  }
  return issues;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function artifactStem(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function artifactFilename(scenarioId: string, name: string): string {
  const base =
    (artifactStem(name).slice(0, 96).replace(/_+$/, "") ||
      artifactStem(scenarioId).slice(0, 96).replace(/_+$/, "") ||
      "scenario");
  return `scenario_${base}.tar.gz`;
}

function bundleInfoFromDetail(detail: ScenarioGraphDetail): BundleInfo | null {
  if (!detail.bundle_name) return null;
  return {
    name: detail.bundle_name,
    size: detail.bundle_size_bytes,
    sha: detail.bundle_sha256,
    hubUrl: detail.hub_url,
    hubSlug: detail.hub_slug,
  };
}

function launchInfoFromDetail(detail: ScenarioGraphDetail): LaunchInfo | null {
  if (!detail.last_launch_id) return null;
  return {
    status: detail.last_launch_status ?? "QUEUED",
    launchId: detail.last_launch_id,
    agentId: detail.last_launch_agent_id,
    message: detail.last_launch_message ?? "",
    dispatchedAt: detail.last_launched_at,
  };
}

function statusVariant(
  status: string
): "muted" | "cyan" | "kernel" | "telemetry" | "threat" {
  return STATUS_VARIANTS[status] ?? "muted";
}

export default function ScenarioGraphStudioPage() {
  const { token, user } = useAuth();
  const canEdit = isAdminRole(user?.role);

  const libraryQuery = useBackend<ScenarioGraphSummary[]>(
    [],
    (t) => backend.matrixScenarios(t),
    token
  );
  const paletteQuery = useBackend<ScenarioPalette>(
    FALLBACK_PALETTE,
    (t) => backend.matrixScenarioPalette(t),
    token
  );
  const palette =
    paletteQuery.data.categories.length > 0 ? paletteQuery.data : FALLBACK_PALETTE;
  const refreshLibrary = libraryQuery.refresh;

  const [view, setView] = useState<View>("library");
  const [draft, setDraft] = useState<ScenarioDraft | null>(null);
  const [selection, setSelection] = useState<ScenarioSelection>(null);
  const [issues, setIssues] = useState<ScenarioCompileIssue[]>([]);
  const [compiledYaml, setCompiledYaml] = useState("");
  const [compiledAt, setCompiledAt] = useState<string | null>(null);
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
  const [launchInfo, setLaunchInfo] = useState<LaunchInfo | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("issues");
  const [query, setQuery] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState("{}");
  const [configError, setConfigError] = useState<string | null>(null);
  const [portsDraft, setPortsDraft] = useState("");
  const [protocolsDraft, setProtocolsDraft] = useState("");
  const [linkConfigDraft, setLinkConfigDraft] = useState("{}");
  const [linkConfigError, setLinkConfigError] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState("");

  const paletteMap = useMemo(() => paletteIndex(palette), [palette]);
  const paletteItems = useMemo(
    () => palette.categories.flatMap((category) => category.items),
    [palette]
  );
  const nodeTypeItems = useMemo(
    () => paletteItems.filter((item) => !NETWORK_TYPES.has(item.type)),
    [paletteItems]
  );

  const selectedNode = useMemo(
    () =>
      draft && selection?.kind === "node"
        ? draft.nodes.find((node) => node.id === selection.id) ?? null
        : null,
    [draft, selection]
  );
  const selectedSubnet = useMemo(
    () =>
      draft && selection?.kind === "subnet"
        ? draft.subnets.find((subnet) => subnet.id === selection.id) ?? null
        : null,
    [draft, selection]
  );
  const selectedLink = useMemo(
    () =>
      draft && selection?.kind === "link"
        ? draft.links.find((link) => link.id === selection.id) ?? null
        : null,
    [draft, selection]
  );

  const filteredLibrary = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return libraryQuery.data;
    return libraryQuery.data.filter((item) =>
      `${item.name} ${item.scenario_id} ${item.target_sector}`
        .toLowerCase()
        .includes(needle)
    );
  }, [libraryQuery.data, query]);

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const totalNodes = libraryQuery.data.reduce(
    (sum, item) => sum + item.node_count,
    0
  );
  const bundledCount = libraryQuery.data.filter(
    (item) =>
      item.status === "BUNDLED" ||
      item.status === "LAUNCHED" ||
      Boolean(item.bundled_at)
  ).length;

  useEffect(() => {
    setConfigError(null);
    setPortsDraft(selectedNode ? portsText(selectedNode.ports) : "");
    setProtocolsDraft(selectedNode ? listText(selectedNode.protocols) : "");
    setConfigDraft(
      selectedNode
        ? configText(selectedNode.config)
        : selectedLink
          ? "{}"
          : "{}"
    );
    setLinkConfigDraft(selectedLink ? configText(selectedLink.config) : "{}");
    setLinkConfigError(null);
  }, [selectedNode?.id, selectedLink?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleApiFailure = useCallback((caught: unknown, fallback: string) => {
    setError(errorText(caught) || fallback);
    const found = extractIssues(caught);
    if (found.length > 0) {
      setIssues(found);
      setBottomTab("issues");
    }
  }, []);

  const markDirty = useCallback(() => {
    setDraft((prev) => (prev ? { ...prev, status: "DRAFT" } : prev));
    setDirty(true);
    setCompiledYaml("");
    setCompiledAt(null);
    setBundleInfo(null);
    setLaunchInfo(null);
    setIssues([]);
  }, []);

  const updateDraft = useCallback(
    (updater: (previous: ScenarioDraft) => ScenarioDraft, mark = true) => {
      if (!canEdit) return;
      setDraft((previous) => (previous ? updater(previous) : previous));
      if (mark) markDirty();
    },
    [canEdit, markDirty]
  );

  const applyDetail = useCallback((detail: ScenarioGraphDetail) => {
    const next = draftFromDetail(detail);
    setDraft(next);
    setDirty(false);
    setIssues([]);
    setCompiledYaml(detail.compiled_yaml ?? "");
    setCompiledAt(detail.compiled_at);
    setBundleInfo(bundleInfoFromDetail(detail));
    setLaunchInfo(launchInfoFromDetail(detail));
    setBottomTab(detail.compiled_yaml ? "yaml" : "issues");
    const firstNode = next.nodes[0];
    const firstSubnet = next.subnets[0];
    setSelection(
      firstNode
        ? { kind: "node", id: firstNode.id }
        : firstSubnet
          ? { kind: "subnet", id: firstSubnet.id }
          : null
    );
  }, []);

  const resetStudio = useCallback(() => {
    setDraft(null);
    setSelection(null);
    setIssues([]);
    setCompiledYaml("");
    setCompiledAt(null);
    setBundleInfo(null);
    setLaunchInfo(null);
    setDirty(false);
    setError(null);
    setNotice(null);
    setBottomTab("issues");
    setPublishOpen(false);
    setView("library");
  }, []);

  const openScenario = useCallback(
    async (scenarioId: string) => {
      if (!token) return;
      setBusy("open");
      setError(null);
      setNotice(null);
      try {
        const detail = await backend.matrixScenario(scenarioId, token);
        applyDetail(detail);
        setView("studio");
      } catch (caught) {
        handleApiFailure(caught, "Unable to open scenario.");
      } finally {
        setBusy(null);
      }
    },
    [applyDetail, handleApiFailure, token]
  );

  const beginDraft = useCallback((next: ScenarioDraft, message: string) => {
    setDraft(next);
    setSelection(
      next.nodes[0]
        ? { kind: "node", id: next.nodes[0].id }
        : next.subnets[0]
          ? { kind: "subnet", id: next.subnets[0].id }
          : null
    );
    setCompiledYaml("");
    setCompiledAt(null);
    setBundleInfo(null);
    setLaunchInfo(null);
    setIssues([]);
    setDirty(true);
    setError(null);
    setNotice(message);
    setBottomTab("issues");
    setView("studio");
  }, []);

  const startTemplate = useCallback(() => {
    beginDraft(
      buildTemplateGraph(),
      "Water-treatment template loaded. Compile to validate the five rules."
    );
  }, [beginDraft]);

  const startBlank = useCallback(() => {
    beginDraft(
      buildBlankGraph(),
      "Blank canvas ready. Start by dragging a subnet from the palette."
    );
  }, [beginDraft]);

  const backToLibrary = useCallback(() => {
    if (dirty && !window.confirm("Discard unsaved graph changes?")) return;
    resetStudio();
  }, [dirty, resetStudio]);

  const persist = useCallback(async (): Promise<ScenarioGraphSaveResult> => {
    if (!draft) throw new Error("No scenario is open.");
    if (!canEdit) throw new Error("Admin access is required.");
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const saved = await backend.saveMatrixScenario(
        payloadFromDraft(draft),
        token
      );
      setDraft((previous) =>
        previous
          ? {
              ...previous,
              scenario_id: saved.scenario_id,
              status: saved.status,
            }
          : previous
      );
      setDirty(false);
      setCompiledYaml("");
      setCompiledAt(null);
      setBundleInfo(null);
      setLaunchInfo(null);
      setIssues([]);
      refreshLibrary();
      return saved;
    } catch (caught) {
      handleApiFailure(caught, "Unable to save scenario.");
      throw caught;
    } finally {
      setBusy(null);
    }
  }, [canEdit, draft, handleApiFailure, refreshLibrary, token]);

  const handleSave = useCallback(async () => {
    if (!canEdit || !draft || busy) return;
    try {
      await persist();
      setNotice("Draft saved to the scenario library.");
    } catch {
      // handleApiFailure already surfaced the error.
    }
  }, [busy, canEdit, draft, persist]);

  const handleCompile = useCallback(async () => {
    if (!canEdit || !draft || busy) return;
    setError(null);
    setNotice(null);
    try {
      let scenarioId = draft.scenario_id;
      if (dirty || !scenarioId) {
        const saved = await persist();
        scenarioId = saved.scenario_id;
      }
      if (!scenarioId) throw new Error("Scenario has no id yet.");
      setBusy("compile");
      const result = await backend.compileMatrixScenario(scenarioId, token);
      setDraft((previous) =>
        previous ? { ...previous, status: result.status } : previous
      );
      setCompiledYaml(result.compiled_yaml ?? "");
      setCompiledAt(result.compiled_at);
      setIssues(result.issues ?? []);
      setBottomTab(result.errors.length > 0 ? "issues" : "yaml");
      setDirty(false);
      refreshLibrary();
      if (result.valid) {
        setNotice(
          result.warnings.length > 0
            ? `Compiled with ${result.warnings.length} warning${
                result.warnings.length === 1 ? "" : "s"
              }. scenario.yaml is ready.`
            : "Compiled clean. scenario.yaml is ready to export."
        );
      }
    } catch (caught) {
      handleApiFailure(caught, "Compile failed.");
      setDraft((previous) =>
        previous ? { ...previous, status: "DRAFT" } : previous
      );
      setCompiledYaml("");
      setCompiledAt(null);
      setBottomTab("issues");
    } finally {
      setBusy(null);
    }
  }, [
    busy,
    canEdit,
    dirty,
    draft,
    handleApiFailure,
    persist,
    refreshLibrary,
    token,
  ]);

  const handleBundle = useCallback(
    async (publish: boolean) => {
      if (!canEdit || !draft || busy) return;
      setError(null);
      setNotice(null);
      try {
        let scenarioId = draft.scenario_id;
        if (dirty || !scenarioId) {
          const saved = await persist();
          scenarioId = saved.scenario_id;
        }
        if (!scenarioId) throw new Error("Scenario has no id yet.");
        setBusy(publish ? "publish" : "bundle");
        const compiled = await backend.compileMatrixScenario(scenarioId, token);
        setCompiledYaml(compiled.compiled_yaml ?? "");
        setCompiledAt(compiled.compiled_at);
        setIssues(compiled.issues ?? []);
        if (!compiled.valid) {
          setBottomTab("issues");
          setError("Compile failed. Fix the red topology issues first.");
          setPublishOpen(false);
          return;
        }
        const blob = await backend.bundleMatrixScenario(
          scenarioId,
          token,
          publish
        );
        downloadBlob(blob, artifactFilename(scenarioId, draft.name));
        const detail = await backend.matrixScenario(scenarioId, token);
        applyDetail(detail);
        const info = bundleInfoFromDetail(detail);
        setBundleInfo(info);
        setLaunchInfo(launchInfoFromDetail(detail));
        setBottomTab("bundle");
        setPublishOpen(false);
        refreshLibrary();
        setNotice(
          publish
            ? `Bundle published to the Hub${
                info?.hubSlug ? ` as ${info.hubSlug}` : ""
              } and downloaded.`
            : "Bundle exported as scenario_<name>.tar.gz."
        );
      } catch (caught) {
        setPublishOpen(false);
        handleApiFailure(
          caught,
          publish ? "Publish failed." : "Bundle export failed."
        );
      } finally {
        setBusy(null);
      }
    },
    [
      applyDetail,
      busy,
      canEdit,
      dirty,
      draft,
      handleApiFailure,
      persist,
      refreshLibrary,
      token,
    ]
  );

  const handleLaunch = useCallback(async () => {
    if (!canEdit || !draft || busy) return;
    setError(null);
    setNotice(null);
    try {
      let scenarioId = draft.scenario_id;
      if (dirty || !scenarioId) {
        const saved = await persist();
        scenarioId = saved.scenario_id;
      }
      if (!scenarioId) throw new Error("Scenario has no id yet.");
      setBusy("launch");
      const launched = await backend.launchMatrixScenario(scenarioId, token);
      const detail = await backend.matrixScenario(scenarioId, token);
      applyDetail(detail);
      setLaunchInfo(
        launchInfoFromDetail(detail) ?? {
          status: launched.status,
          launchId: launched.launch_id,
          agentId: launched.agent_id,
          message: launched.message,
          dispatchedAt: launched.dispatched_at,
        }
      );
      setBundleInfo(bundleInfoFromDetail(detail));
      setBottomTab("bundle");
      refreshLibrary();
      setNotice(launched.message);
    } catch (caught) {
      handleApiFailure(caught, "Launch failed.");
    } finally {
      setBusy(null);
    }
  }, [
    applyDetail,
    busy,
    canEdit,
    dirty,
    draft,
    handleApiFailure,
    persist,
    refreshLibrary,
    token,
  ]);

  const deleteScenario = useCallback(
    async (scenarioId: string, name: string) => {
      if (!canEdit) return;
      if (
        !window.confirm(
          `Delete scenario "${name}"? This removes the graph and all subnets.`
        )
      ) {
        return;
      }
      setBusy("delete");
      setError(null);
      try {
        await backend.deleteMatrixScenario(scenarioId, token);
        if (draft?.scenario_id === scenarioId) resetStudio();
        refreshLibrary();
        setNotice(`Scenario "${name}" deleted.`);
      } catch (caught) {
        handleApiFailure(caught, "Delete failed.");
      } finally {
        setBusy(null);
      }
    },
    [
      canEdit,
      draft?.scenario_id,
      handleApiFailure,
      refreshLibrary,
      resetStudio,
      token,
    ]
  );

  const addSubnetFromPalette = useCallback(
    (item: ScenarioPaletteItem) => {
      if (!canEdit || !draft) return;
      const subnet = makeSubnet(item, draft.subnets);
      setDraft((previous) =>
        previous
          ? { ...previous, subnets: [...previous.subnets, subnet] }
          : previous
      );
      setSelection({ kind: "subnet", id: subnet.id });
      markDirty();
      setNotice(`${item.label} added at ${subnet.cidr}.`);
    },
    [canEdit, draft, markDirty]
  );

  const addNodeFromPalette = useCallback(
    (
      item: ScenarioPaletteItem,
      position?: { x?: number; y?: number; subnetId?: string | null }
    ) => {
      if (!canEdit || !draft) return;
      let subnets = draft.subnets;
      let target =
        (position?.subnetId
          ? subnets.find((subnet) => subnet.id === position.subnetId)
          : undefined) ?? subnets[0];
      if (!target) {
        const bridge =
          paletteItems.find((entry) => entry.type === "SUBNET_BRIDGE") ??
          paletteItems.find((entry) => NETWORK_TYPES.has(entry.type));
        if (!bridge) {
          setError("Add a subnet before placing a container.");
          return;
        }
        target = makeSubnet(bridge, subnets);
        subnets = [...subnets, target];
      }
      const targetIndex = subnets.findIndex((subnet) => subnet.id === target.id);
      const count = draft.nodes.filter(
        (node) => node.subnet_id === target?.id
      ).length;
      const node = makeNode(item, subnets, draft.nodes, {
        x: position?.x ?? nodeX(Math.max(0, targetIndex)),
        y: position?.y ?? nodeY(count),
        subnetId: target.id,
      });
      if (!node) return;
      setDraft((previous) =>
        previous
          ? { ...previous, subnets, nodes: [...previous.nodes, node] }
          : previous
      );
      setSelection({ kind: "node", id: node.id });
      markDirty();
      setNotice(`${item.label} placed on ${target.name}.`);
    },
    [canEdit, draft, markDirty, paletteItems]
  );

  const handlePaletteClick = useCallback(
    (item: ScenarioPaletteItem) => {
      if (!canEdit) return;
      if (NETWORK_TYPES.has(item.type)) {
        addSubnetFromPalette(item);
        return;
      }
      const selectedSubnetId =
        selection?.kind === "subnet" ? selection.id : undefined;
      addNodeFromPalette(item, { subnetId: selectedSubnetId });
    },
    [addNodeFromPalette, addSubnetFromPalette, canEdit, selection]
  );

  const handleDropPalette = useCallback(
    (
      item: ScenarioPaletteItem,
      subnetId: string | null,
      x: number,
      y: number
    ) => {
      if (!canEdit) return;
      if (NETWORK_TYPES.has(item.type)) {
        addSubnetFromPalette(item);
        return;
      }
      addNodeFromPalette(item, { subnetId, x, y });
    },
    [addNodeFromPalette, addSubnetFromPalette, canEdit]
  );

  const handleAddSubnet = useCallback(() => {
    if (!canEdit) return;
    const bridge =
      paletteItems.find((entry) => entry.type === "SUBNET_BRIDGE") ??
      paletteItems.find((entry) => NETWORK_TYPES.has(entry.type));
    if (bridge) addSubnetFromPalette(bridge);
  }, [addSubnetFromPalette, canEdit, paletteItems]);

  const handleMoveNode = useCallback(
    (id: string, x: number, y: number) => {
      if (!canEdit) return;
      updateDraft((previous) => ({
        ...previous,
        nodes: previous.nodes.map((node) =>
          node.id === id ? { ...node, x, y } : node
        ),
      }));
    },
    [canEdit, updateDraft]
  );

  const handleCommitNode = useCallback(
    (id: string, x: number, y: number, subnetId: string | null) => {
      if (!canEdit) return;
      updateDraft((previous) => {
        const target = previous.subnets.find((subnet) => subnet.id === subnetId);
        const node = previous.nodes.find((entry) => entry.id === id);
        const others = previous.nodes.filter((entry) => entry.id !== id);
        const sameSubnet = node?.subnet_id === (target?.id ?? null);
        const ip = target
          ? sameSubnet && node?.ip
            ? node.ip
            : nextAvailableIp(target, others)
          : "";
        return {
          ...previous,
          nodes: previous.nodes.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  x,
                  y,
                  subnet_id: target?.id ?? null,
                  ip,
                }
              : entry
          ),
        };
      });
    },
    [canEdit, updateDraft]
  );

  const handleNodeSubnetChange = useCallback(
    (nodeId: string, subnetId: string | null) => {
      updateDraft((previous) => {
        const target = previous.subnets.find((subnet) => subnet.id === subnetId);
        const others = previous.nodes.filter((entry) => entry.id !== nodeId);
        return {
          ...previous,
          nodes: previous.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  subnet_id: target?.id ?? null,
                  ip: target ? nextAvailableIp(target, others) : "",
                }
              : node
          ),
        };
      });
    },
    [updateDraft]
  );

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<ScenarioNode>) => {
      updateDraft((previous) => ({
        ...previous,
        nodes: previous.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node
        ),
      }));
    },
    [updateDraft]
  );

  const updateSubnet = useCallback(
    (subnetId: string, patch: Partial<ScenarioSubnet>) => {
      updateDraft((previous) => ({
        ...previous,
        subnets: previous.subnets.map((subnet) =>
          subnet.id === subnetId ? { ...subnet, ...patch } : subnet
        ),
      }));
    },
    [updateDraft]
  );

  const updateLink = useCallback(
    (linkId: string, patch: Partial<ScenarioLink>) => {
      updateDraft((previous) => ({
        ...previous,
        links: previous.links.map((link) =>
          link.id === linkId ? { ...link, ...patch } : link
        ),
      }));
    },
    [updateDraft]
  );

  const handleAddLink = useCallback(() => {
    if (!canEdit || !draft || !selectedNode || !linkTarget) return;
    if (linkTarget === selectedNode.id) {
      setError("A link needs two different nodes.");
      return;
    }
    const link = makeLink(selectedNode.id, linkTarget, draft.links);
    setDraft((previous) =>
      previous ? { ...previous, links: [...previous.links, link] } : previous
    );
    setSelection({ kind: "link", id: link.id });
    setLinkTarget("");
    markDirty();
    setNotice("Link added. Set its kind and protocol in the inspector.");
  }, [canEdit, draft, linkTarget, markDirty, selectedNode]);

  const removeSelection = useCallback(() => {
    if (!canEdit || !selection) return;
    updateDraft((previous) => {
      if (selection.kind === "node") {
        return {
          ...previous,
          nodes: previous.nodes.filter((node) => node.id !== selection.id),
          links: previous.links.filter(
            (link) =>
              link.source_node_id !== selection.id &&
              link.target_node_id !== selection.id
          ),
        };
      }
      if (selection.kind === "subnet") {
        return {
          ...previous,
          subnets: previous.subnets.filter(
            (subnet) => subnet.id !== selection.id
          ),
          nodes: previous.nodes.map((node) =>
            node.subnet_id === selection.id
              ? { ...node, subnet_id: null, ip: "" }
              : node
          ),
        };
      }
      return {
        ...previous,
        links: previous.links.filter((link) => link.id !== selection.id),
      };
    });
    setSelection(null);
  }, [canEdit, selection, updateDraft]);

  const handleAutoLayout = useCallback(() => {
    if (!canEdit || !draft) return;
    updateDraft((previous) => {
      const counters: Record<number, number> = {};
      return {
        ...previous,
        nodes: previous.nodes.map((node) => {
          const index = previous.subnets.findIndex(
            (subnet) => subnet.id === node.subnet_id
          );
          const lane = index >= 0 ? index : previous.subnets.length;
          const row = counters[lane] ?? 0;
          counters[lane] = row + 1;
          return { ...node, x: nodeX(lane), y: nodeY(row) };
        }),
      };
    });
    setNotice("Nodes aligned into their subnet lanes.");
  }, [canEdit, draft, updateDraft]);

  const applyNodeConfig = useCallback(() => {
    if (!canEdit || !selectedNode) return;
    try {
      const config = parseConfigText(configDraft);
      updateNode(selectedNode.id, { config });
      setConfigError(null);
      setNotice("Node config applied.");
    } catch (caught) {
      setConfigError(errorText(caught));
    }
  }, [canEdit, configDraft, selectedNode, updateNode]);

  const applyLinkConfig = useCallback(() => {
    if (!canEdit || !selectedLink) return;
    try {
      const config = parseConfigText(linkConfigDraft);
      updateLink(selectedLink.id, { config });
      setLinkConfigError(null);
      setNotice("Link config applied.");
    } catch (caught) {
      setLinkConfigError(errorText(caught));
    }
  }, [canEdit, linkConfigDraft, selectedLink, updateLink]);

  const toggleNodeFlag = useCallback(
    (key: string, value: boolean) => {
      if (!canEdit || !selectedNode) return;
      const config = { ...selectedNode.config };
      if (value) config[key] = true;
      else delete config[key];
      updateNode(selectedNode.id, { config });
      setConfigDraft(configText(config));
    },
    [canEdit, selectedNode, updateNode]
  );

  const changeNodeType = useCallback(
    (item: ScenarioPaletteItem) => {
      if (!canEdit || !selectedNode) return;
      updateNode(selectedNode.id, {
        type: item.type,
        image: defaultImage(item),
        protocols:
          selectedNode.protocols.length > 0
            ? selectedNode.protocols
            : Array.isArray(item.protocols)
              ? [...item.protocols]
              : [],
        ports:
          selectedNode.ports.length > 0
            ? selectedNode.ports
            : defaultPorts(
                item,
                draft?.nodes.filter((node) => node.id !== selectedNode.id) ??
                  []
              ),
      });
    },
    [canEdit, draft, selectedNode, updateNode]
  );

  const stale = dirty;
  const actionsDisabled = !canEdit || Boolean(busy) || !draft;
  const currentStatus = draft?.status ?? "DRAFT";

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-threat/35 bg-threat/[0.06] px-4 py-3">
          <p className="text-[12.5px] text-threat">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-mono text-[11px] text-threat/70 hover:text-threat"
          >
            dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-cyan/25 bg-cyan/[0.05] px-4 py-3">
          <p className="text-[12.5px] text-cyan">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-mono text-[11px] text-cyan/70 hover:text-cyan"
          >
            dismiss
          </button>
        </div>
      )}

      {view === "library" || !draft ? (
        <div className="space-y-5">
          <PageHeader
            title="Scenario Graph Studio"
            description="Draw cyber-range scenarios as visual subnets, containers and attack links. Compile real scenario.yaml, export a Hub-ready bundle and launch it on a Matrix agent."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={startBlank}
                  className="admin-btn-secondary"
                  disabled={!canEdit}
                >
                  Blank canvas
                </button>
                <button
                  type="button"
                  onClick={startTemplate}
                  className="admin-btn-primary"
                  disabled={!canEdit}
                >
                  New from template
                </button>
              </div>
            }
          />

          {!canEdit && (
            <div className="rounded-md border border-hairline bg-panel/70 px-4 py-3 text-[12px] text-muted">
              You have read-only access. Ask a tenant admin to save, compile,
              export or launch scenarios.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Designs", libraryQuery.data.length.toString(), "tenant graphs"],
              ["Containers", totalNodes.toString(), "PLC / sensor / actor"],
              ["Validated", bundledCount.toString(), "compiled or bundled"],
              [
                "Runtime",
                canEdit ? "admin" : "read-only",
                "RBAC enforced server-side",
              ],
            ].map(([label, value, detail]) => (
              <div key={label} className="admin-card px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  {label}
                </p>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {value}
                </p>
                <p className="mt-1 text-[10.5px] text-muted">{detail}</p>
              </div>
            ))}
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search scenarios, ids or sectors"
                  className="admin-input max-w-sm text-[12px]"
                />
                <Badge variant={libraryQuery.live ? "telemetry" : "muted"}>
                  {libraryQuery.live ? "live" : "cached"}
                </Badge>
                {libraryQuery.loading && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    syncing…
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={refreshLibrary}
                className="admin-btn-ghost"
              >
                refresh
              </button>
            </div>

            {filteredLibrary.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
                  {"// no scenario graphs"}
                </p>
                <p className="max-w-md text-[12.5px] leading-relaxed text-muted">
                  Start from the water-treatment template to see subnet
                  validation, Modbus host-port checks and the red error
                  highlighting, or begin with a blank Purdue canvas.
                </p>
                <button
                  type="button"
                  onClick={startTemplate}
                  className="admin-btn-primary"
                  disabled={!canEdit}
                >
                  Create first scenario
                </button>
              </div>
            ) : (
              <div className="grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredLibrary.map((item) => (
                  <article
                    key={item.scenario_id}
                    className="group flex flex-col rounded-md border border-hairline bg-void/50 p-4 transition-colors hover:border-cyan/35"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {item.name}
                        </p>
                        <p className="mt-1 truncate font-mono text-[9.5px] text-cyan/75">
                          {item.scenario_id}
                        </p>
                      </div>
                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-[34px] text-[11.5px] leading-relaxed text-muted">
                      {item.description || "No description yet."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
                      <span className="rounded border border-hairline px-1.5 py-1">
                        {item.target_sector.replaceAll("_", " ")}
                      </span>
                      <span className="rounded border border-hairline px-1.5 py-1">
                        {item.subnet_count} net
                      </span>
                      <span className="rounded border border-hairline px-1.5 py-1">
                        {item.node_count} nodes
                      </span>
                      <span className="rounded border border-hairline px-1.5 py-1">
                        {item.link_count} links
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[8.5px] text-muted/70">
                          updated {formatDate(item.updated_at)}
                        </p>
                        {item.hub_slug && (
                          <p className="mt-1 truncate font-mono text-[8.5px] text-kernel/80">
                            hub:{item.hub_slug}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              void deleteScenario(item.scenario_id, item.name)
                            }
                            className="admin-btn-ghost text-threat/70 hover:text-threat"
                            aria-label={`Delete ${item.name}`}
                          >
                            ×
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void openScenario(item.scenario_id)}
                          disabled={busy === "open"}
                          className="admin-btn-secondary px-3 py-1.5 text-[10px]"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-panel/60 px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={backToLibrary}
                className="admin-btn-ghost px-2 py-1 font-mono text-[10px]"
              >
                ← library
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-lg font-bold text-ink">
                    {draft.name || "Untitled scenario"}
                  </h1>
                  <Badge variant={statusVariant(currentStatus)}>
                    {currentStatus}
                  </Badge>
                  {stale && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-telemetry">
                      unsaved changes
                    </span>
                  )}
                  {!canEdit && <Badge variant="muted">read-only</Badge>}
                </div>
                <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted">
                  {draft.scenario_id || "new draft"} · {draft.subnets.length}{" "}
                  subnets · {draft.nodes.length} containers ·{" "}
                  {draft.links.length} links
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={actionsDisabled}
                className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "save" ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void handleCompile()}
                disabled={actionsDisabled}
                className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "compile" ? "Compiling…" : "Compile"}
              </button>
              <button
                type="button"
                onClick={() => void handleBundle(false)}
                disabled={actionsDisabled}
                className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "bundle" ? "Bundling…" : "Export .tar.gz"}
              </button>
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                disabled={actionsDisabled}
                className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "publish" ? "Publishing…" : "Publish to Hub"}
              </button>
              <button
                type="button"
                onClick={() => void handleLaunch()}
                disabled={actionsDisabled}
                className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "launch" ? "Launching…" : "Launch"}
              </button>
              <button
                type="button"
                onClick={handleAutoLayout}
                disabled={actionsDisabled}
                className="admin-btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
              >
                auto layout
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[232px_minmax(0,1fr)_344px]">
            <aside className="admin-card max-h-[calc(100vh-190px)] overflow-y-auto">
              <div className="border-b border-hairline px-3 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan">
                  {"// component palette"}
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Drag onto lanes, or click to append.
                </p>
              </div>
              <div className="space-y-4 p-3">
                {palette.categories.map((category) => {
                  const meta = CATEGORY_META[category.category];
                  return (
                    <div key={category.category}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`font-mono text-[12px] ${meta?.accent ?? "text-cyan"}`}>
                          {meta?.icon ?? "▦"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink">
                            {meta?.label ?? category.category}
                          </p>
                          <p className="truncate text-[9px] text-muted/70">
                            {meta?.description}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {category.items.map((item) => {
                          const tint = meta?.accent ?? "text-cyan";
                          return (
                            <button
                              key={item.type}
                              type="button"
                              draggable={canEdit}
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  "application/x-aryo-scenario",
                                  JSON.stringify({ type: item.type })
                                );
                                event.dataTransfer.effectAllowed = "copy";
                              }}
                              onClick={() => handlePaletteClick(item)}
                              disabled={!canEdit}
                              className="w-full rounded border border-hairline bg-void/50 px-2.5 py-2 text-left transition-colors hover:border-cyan/35 hover:bg-cyan/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <p className="text-[10.5px] font-medium text-ink">
                                {item.label}
                              </p>
                              <p className={`mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${tint}`}>
                                {item.type}
                              </p>
                              {item.default_subnet && (
                                <p className="mt-0.5 font-mono text-[8px] text-muted">
                                  {item.default_subnet}
                                </p>
                              )}
                              {item.description && (
                                <p className="mt-0.5 text-[8.5px] text-muted/80">
                                  {item.description}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            <main className="min-w-0 space-y-3">
              <div className="admin-card overflow-hidden">
                <ScenarioStudioCanvas
                  draft={draft}
                  palette={palette}
                  selection={selection}
                  issues={issues}
                  canEdit={canEdit}
                  onSelect={setSelection}
                  onMoveNode={handleMoveNode}
                  onCommitNode={handleCommitNode}
                  onDropPalette={handleDropPalette}
                  onAddSubnet={handleAddSubnet}
                />
              </div>

              <div className="admin-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-panel/50 px-3 py-2">
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ["issues", `Issues ${errorCount + warningCount}`],
                        ["yaml", "scenario.yaml"],
                        ["bundle", "Bundle & Launch"],
                      ] as Array<[BottomTab, string]>
                    ).map(([tab, label]) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setBottomTab(tab)}
                        className={`rounded px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                          bottomTab === tab
                            ? "bg-cyan/10 text-cyan"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                    {errorCount > 0 && (
                      <span className="text-threat">{errorCount} errors</span>
                    )}
                    {warningCount > 0 && (
                      <span className="text-telemetry">{warningCount} warnings</span>
                    )}
                    {compiledAt && <span>compiled {formatDate(compiledAt)}</span>}
                  </div>
                </div>

                <div className="max-h-[300px] overflow-auto">
                  {bottomTab === "issues" && (
                    <div className="divide-y divide-hairline/60">
                      {issues.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[11.5px] text-muted">
                          {compiledYaml
                            ? "No compile issues. The last compile is valid."
                            : "Click Compile to validate CIDR overlap, IP allocation, host-port uniqueness and air-gap invariants."}
                        </p>
                      ) : (
                        issues.map((issue, index) => (
                          <button
                            key={`${issue.code}-${index}`}
                            type="button"
                            onClick={() => {
                              if (issue.node_id) {
                                setSelection({ kind: "node", id: issue.node_id });
                              } else if (issue.subnet_id) {
                                setSelection({ kind: "subnet", id: issue.subnet_id });
                              } else if (issue.link_id) {
                                setSelection({ kind: "link", id: issue.link_id });
                              }
                            }}
                            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-panel/60"
                          >
                            <span
                              className={`mt-0.5 rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase ${
                                issue.severity === "error"
                                  ? "border-threat/40 bg-threat/10 text-threat"
                                  : "border-telemetry/40 bg-telemetry/10 text-telemetry"
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-mono text-[9px] text-muted">
                                {issue.code}
                                {issue.node_id ? ` · node:${issue.node_id}` : ""}
                                {issue.subnet_id
                                  ? ` · subnet:${issue.subnet_id}`
                                  : ""}
                                {issue.link_id ? ` · link:${issue.link_id}` : ""}
                              </span>
                              <span className="mt-0.5 block text-[11.5px] text-ink">
                                {issue.message}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {bottomTab === "yaml" && (
                    <div className="relative">
                      <div className="flex items-center justify-between border-b border-hairline/60 px-4 py-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                          scenario.yaml
                        </span>
                        {compiledYaml && (
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(compiledYaml);
                              setNotice("scenario.yaml copied to clipboard.");
                            }}
                            className="admin-btn-ghost px-2 py-1 text-[9px]"
                          >
                            copy
                          </button>
                        )}
                      </div>
                      {compiledYaml ? (
                        <pre className="blueprint-scroll max-h-[245px] overflow-auto px-4 py-3 font-mono text-[10.5px] leading-relaxed text-telemetry/90">
                          {compiledYaml}
                        </pre>
                      ) : (
                        <p className="px-4 py-8 text-center text-[11.5px] text-muted">
                          No compiled YAML yet. Click Compile to synthesize the
                          artifact.
                        </p>
                      )}
                    </div>
                  )}

                  {bottomTab === "bundle" && (
                    <div className="space-y-3 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-hairline bg-void/40 px-3 py-2.5">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                            latest bundle
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] text-ink">
                            {bundleInfo?.name ?? "not exported yet"}
                          </p>
                          {bundleInfo?.sha && (
                            <p className="mt-0.5 truncate font-mono text-[8.5px] text-muted">
                              sha256:{bundleInfo.sha}
                            </p>
                          )}
                        </div>
                        <div className="text-right font-mono text-[9px] text-muted">
                          <p>{formatBytes(bundleInfo?.size)}</p>
                          {bundleInfo?.hubUrl && (
                            <a
                              href={bundleInfo.hubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block text-kernel hover:underline"
                            >
                              open hub scenario ↗
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleBundle(false)}
                          disabled={actionsDisabled}
                          className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Export .tar.gz
                        </button>
                        <button
                          type="button"
                          onClick={() => setPublishOpen(true)}
                          disabled={actionsDisabled}
                          className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Publish to Hub
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleLaunch()}
                          disabled={actionsDisabled}
                          className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Launch on Matrix agent
                        </button>
                      </div>

                      {launchInfo && (
                        <div className="rounded border border-hairline bg-void/40 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                launchInfo.status === "DISPATCHED"
                                  ? "telemetry"
                                  : "muted"
                              }
                            >
                              {launchInfo.status}
                            </Badge>
                            {launchInfo.agentId && (
                              <span className="font-mono text-[9px] text-cyan">
                                agent:{launchInfo.agentId}
                              </span>
                            )}
                            <span className="font-mono text-[8.5px] text-muted">
                              {formatDate(launchInfo.dispatchedAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-[11.5px] text-muted">
                            {launchInfo.message || "Launch recorded."}
                          </p>
                        </div>
                      )}
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted/60">
                        load from CLI: aryo matrix scenario load{" "}
                        {draft.scenario_id || "<id>"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </main>

            <aside className="admin-card max-h-[calc(100vh-190px)] overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan">
                  {"// inspector"}
                </p>
                {selection && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelection(null)}
                      className="font-mono text-[9px] text-cyan/70 hover:text-cyan"
                    >
                      scenario
                    </button>
                    <button
                      type="button"
                      onClick={removeSelection}
                      disabled={!canEdit}
                      className="font-mono text-[9px] text-threat/70 hover:text-threat disabled:opacity-40"
                    >
                      delete selected
                    </button>
                  </div>
                )}
              </div>

              <fieldset
                disabled={!canEdit}
                className="m-0 min-w-0 border-0 p-0"
              >
              {!selection && (
                <div className="space-y-3">
                  <div className="rounded border border-hairline bg-void/40 px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      scenario settings
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Select a subnet, node or link on the canvas to edit it
                      here.
                    </p>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      name
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      className="admin-input mt-1 text-[12px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      sector
                    </span>
                    <select
                      value={draft.target_sector}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          target_sector: event.target.value,
                        }))
                      }
                      className="admin-input mt-1 text-[12px]"
                    >
                      {SECTOR_OPTIONS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      description
                    </span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                      className="admin-input mt-1 resize-y text-[11.5px] leading-relaxed"
                    />
                  </label>
                  <div className="rounded border border-hairline bg-void/40 px-3 py-2.5 font-mono text-[9px] text-muted">
                    <p>id: {draft.scenario_id || "assigned on save"}</p>
                    <p className="mt-1">
                      {draft.subnets.length} subnets · {draft.nodes.length} nodes
                      · {draft.links.length} links
                    </p>
                    <p className="mt-1">
                      last compile: {compiledAt ? formatDate(compiledAt) : "—"}
                    </p>
                  </div>
                </div>
              )}

              {selectedNode && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[8px] uppercase text-cyan">
                      node
                    </span>
                    <span className="truncate font-mono text-[9px] text-muted">
                      {selectedNode.id}
                    </span>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      name
                    </span>
                    <input
                      value={selectedNode.name}
                      onChange={(event) =>
                        updateNode(selectedNode.id, {
                          name: event.target.value,
                        })
                      }
                      className="admin-input mt-1 text-[12px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      palette type
                    </span>
                    <select
                      value={selectedNode.type}
                      onChange={(event) => {
                        const item = paletteMap[event.target.value];
                        if (item) changeNodeType(item);
                      }}
                      className="admin-input mt-1 font-mono text-[10.5px]"
                    >
                      {nodeTypeItems.map((item) => (
                        <option key={item.type} value={item.type}>
                          {item.label} · {item.type}
                        </option>
                      ))}
                      {!nodeTypeItems.some(
                        (item) => item.type === selectedNode.type
                      ) && (
                        <option value={selectedNode.type}>
                          {selectedNode.type} · unknown
                        </option>
                      )}
                    </select>
                    <p className="mt-1 font-mono text-[8.5px] text-muted">
                      {categoryForType(palette, selectedNode.type)} ·{" "}
                      {nodeTypeLabel(palette, selectedNode.type)}
                    </p>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      subnet
                    </span>
                    <select
                      value={selectedNode.subnet_id ?? ""}
                      onChange={(event) =>
                        handleNodeSubnetChange(
                          selectedNode.id,
                          event.target.value || null
                        )
                      }
                      className="admin-input mt-1 text-[11.5px]"
                    >
                      <option value="">— unassigned —</option>
                      {draft.subnets.map((subnet) => (
                        <option key={subnet.id} value={subnet.id}>
                          {subnet.name} · {subnet.cidr}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      ip address
                    </span>
                    <input
                      value={selectedNode.ip}
                      onChange={(event) =>
                        updateNode(selectedNode.id, {
                          ip: event.target.value,
                        })
                      }
                      className="admin-input mt-1 font-mono text-[11px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      image
                    </span>
                    <input
                      value={selectedNode.image}
                      onChange={(event) =>
                        updateNode(selectedNode.id, {
                          image: event.target.value,
                        })
                      }
                      className="admin-input mt-1 font-mono text-[10px]"
                    />
                  </label>
                  <div className="space-y-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      host ports
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        value={portsDraft}
                        onChange={(event) => setPortsDraft(event.target.value)}
                        placeholder="502:502, 102:102"
                        className="admin-input font-mono text-[10.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateNode(selectedNode.id, {
                            ports: parsePortsText(portsDraft),
                          });
                          setNotice("Host ports updated.");
                        }}
                        className="admin-btn-secondary px-2.5 py-1.5 text-[9px]"
                      >
                        set
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      protocols
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        value={protocolsDraft}
                        onChange={(event) =>
                          setProtocolsDraft(event.target.value)
                        }
                        placeholder="MODBUS_TCP, S7COMM"
                        className="admin-input font-mono text-[10.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateNode(selectedNode.id, {
                            protocols: parseListText(protocolsDraft),
                          });
                          setNotice("Protocols updated.");
                        }}
                        className="admin-btn-secondary px-2.5 py-1.5 text-[9px]"
                      >
                        set
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        config json
                      </span>
                      <button
                        type="button"
                        onClick={applyNodeConfig}
                        className="admin-btn-ghost px-2 py-1 text-[9px]"
                      >
                        apply
                      </button>
                    </div>
                    <textarea
                      value={configDraft}
                      onChange={(event) => setConfigDraft(event.target.value)}
                      rows={6}
                      className="admin-input resize-y font-mono text-[10px] leading-relaxed"
                    />
                    {configError && (
                      <p className="text-[10px] text-threat">{configError}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 rounded border border-hairline bg-void/40 p-2.5">
                    <label className="flex items-center gap-2 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={selectedNode.config.wan_egress === true}
                        onChange={(event) =>
                          toggleNodeFlag("wan_egress", event.target.checked)
                        }
                        className="accent-cyan"
                      />
                      WAN egress (air-gap violation)
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={selectedNode.config.firewall === true}
                        onChange={(event) =>
                          toggleNodeFlag("firewall", event.target.checked)
                        }
                        className="accent-cyan"
                      />
                      Firewall mediator (allows routed edge)
                    </label>
                  </div>
                  <div className="rounded border border-hairline bg-void/40 p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      outgoing / incoming links
                    </p>
                    <div className="mt-2 space-y-1">
                      {draft.links
                        .filter(
                          (link) =>
                            link.source_node_id === selectedNode.id ||
                            link.target_node_id === selectedNode.id
                        )
                        .map((link) => {
                          const otherId =
                            link.source_node_id === selectedNode.id
                              ? link.target_node_id
                              : link.source_node_id;
                          const other = draft.nodes.find(
                            (node) => node.id === otherId
                          );
                          return (
                            <button
                              key={link.id}
                              type="button"
                              onClick={() =>
                                setSelection({ kind: "link", id: link.id })
                              }
                              className="flex w-full items-center justify-between gap-2 rounded border border-hairline/70 px-2 py-1.5 text-left text-[10px] text-muted hover:text-ink"
                            >
                              <span className="truncate">
                                {link.kind} → {other?.name ?? otherId}
                              </span>
                              <span className="font-mono text-[8px]">
                                {link.protocol || "—"}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <select
                        value={linkTarget}
                        onChange={(event) => setLinkTarget(event.target.value)}
                        className="admin-input py-1.5 text-[10.5px]"
                      >
                        <option value="">connect to…</option>
                        {draft.nodes
                          .filter((node) => node.id !== selectedNode.id)
                          .map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="admin-btn-secondary px-2.5 py-1.5 text-[9px]"
                      >
                        link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubnet && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[8px] uppercase text-cyan">
                      subnet
                    </span>
                    <span className="truncate font-mono text-[9px] text-muted">
                      {selectedSubnet.id}
                    </span>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      name
                    </span>
                    <input
                      value={selectedSubnet.name}
                      onChange={(event) =>
                        updateSubnet(selectedSubnet.id, {
                          name: event.target.value,
                        })
                      }
                      className="admin-input mt-1 text-[12px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      cidr block
                    </span>
                    <input
                      value={selectedSubnet.cidr}
                      onChange={(event) =>
                        updateSubnet(selectedSubnet.id, {
                          cidr: event.target.value,
                        })
                      }
                      className="admin-input mt-1 font-mono text-[11px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      gateway
                    </span>
                    <input
                      value={selectedSubnet.gateway}
                      onChange={(event) =>
                        updateSubnet(selectedSubnet.id, {
                          gateway: event.target.value,
                        })
                      }
                      className="admin-input mt-1 font-mono text-[11px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      purdue level
                    </span>
                    <select
                      value={selectedSubnet.purdue_level}
                      onChange={(event) =>
                        updateSubnet(selectedSubnet.id, {
                          purdue_level: Number(
                            event.target.value
                          ) as ScenarioSubnet["purdue_level"],
                        })
                      }
                      className="admin-input mt-1 text-[11.5px]"
                    >
                      {PURDUE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2.5 text-[11.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={selectedSubnet.internal}
                      onChange={(event) =>
                        updateSubnet(selectedSubnet.id, {
                          internal: event.target.checked,
                        })
                      }
                      className="accent-cyan"
                    />
                    Air-gapped subnet (no unmediated WAN route)
                  </label>
                  <div className="rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[9px] text-muted">
                    <p>
                      nodes:{" "}
                      {
                        draft.nodes.filter(
                          (node) => node.subnet_id === selectedSubnet.id
                        ).length
                      }
                    </p>
                    <p className="mt-1">
                      address: {selectedSubnet.cidr} · gw{" "}
                      {selectedSubnet.gateway || "—"}
                    </p>
                  </div>
                </div>
              )}

              {selectedLink && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-telemetry/30 bg-telemetry/10 px-2 py-0.5 font-mono text-[8px] uppercase text-telemetry">
                      link
                    </span>
                    <span className="truncate font-mono text-[9px] text-muted">
                      {selectedLink.id}
                    </span>
                  </div>
                  <div className="rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[10px] text-muted">
                    <p className="truncate">
                      {selectedLink.source_node_id} →{" "}
                      {selectedLink.target_node_id}
                    </p>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      kind
                    </span>
                    <select
                      value={selectedLink.kind}
                      onChange={(event) =>
                        updateLink(selectedLink.id, {
                          kind: event.target.value,
                        })
                      }
                      className="admin-input mt-1 text-[11.5px]"
                    >
                      {["ETHERNET", "TELEMETRY", "ATTACK", "ROUTE", "WAN", "UPLINK"].map(
                        (kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      label
                    </span>
                    <input
                      value={selectedLink.label}
                      onChange={(event) =>
                        updateLink(selectedLink.id, {
                          label: event.target.value,
                        })
                      }
                      className="admin-input mt-1 text-[11.5px]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      protocol
                    </span>
                    <input
                      value={selectedLink.protocol}
                      onChange={(event) =>
                        updateLink(selectedLink.id, {
                          protocol: event.target.value,
                        })
                      }
                      placeholder="MODBUS_TCP"
                      className="admin-input mt-1 font-mono text-[10.5px]"
                    />
                  </label>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        config json
                      </span>
                      <button
                        type="button"
                        onClick={applyLinkConfig}
                        className="admin-btn-ghost px-2 py-1 text-[9px]"
                      >
                        apply
                      </button>
                    </div>
                    <textarea
                      value={linkConfigDraft}
                      onChange={(event) =>
                        setLinkConfigDraft(event.target.value)
                      }
                      rows={6}
                      className="admin-input resize-y font-mono text-[10px] leading-relaxed"
                    />
                    {linkConfigError && (
                      <p className="text-[10px] text-threat">{linkConfigError}</p>
                    )}
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-muted">
                    ATTACK links become execution.attack_waves. ROUTE, WAN and
                    UPLINK links are checked against air-gapped subnets unless a
                    node is marked as a firewall mediator.
                  </p>
                </div>
              )}
              </fieldset>
            </aside>
          </div>
        </div>
      )}

      {publishOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-title"
          onClick={() => setPublishOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-md border border-hairline bg-panel p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-kernel">
              {"// hub publication"}
            </p>
            <h2 id="publish-title" className="mt-2 text-lg font-semibold text-ink">
              Publish this scenario bundle?
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              The compiled <span className="font-mono">scenario.yaml</span>,
              manifest and README will be packed into
              <span className="font-mono">
                {" "}
                scenario_&lt;name&gt;.tar.gz
              </span>
              ,
              copied into the Hub scenario vault and linked as a public catalog
              scenario. The same archive will download to this browser.
            </p>
            <div className="mt-3 rounded border border-hairline bg-void/50 px-3 py-2 font-mono text-[10px] text-muted">
              <p>{draft?.name}</p>
              <p className="mt-1 text-cyan/75">
                {draft?.scenario_id || "new scenario · saved before publish"}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBundle(true)}
                disabled={actionsDisabled}
                className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "publish" ? "Publishing…" : "Publish & download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
