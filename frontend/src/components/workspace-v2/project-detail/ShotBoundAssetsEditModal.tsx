import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Landmark, Loader2, Package, Search, Users } from "lucide-react";
import {
  fetchWorkspaceV2ProjectAssets,
  resolveWorkspaceV2ShotMediaUrl,
  updateWorkspaceV2ScriptScene,
  type WorkspaceV2AssetCharacterItem,
  type WorkspaceV2AssetPropItem,
  type WorkspaceV2AssetSceneItem,
  type WorkspaceV2ProjectAssetsResponse,
} from "@/api/workspace-v2";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { errMsg, voidCall } from "@/utils/async";

type BoundAssetKind = "characters" | "scenes" | "props";

interface BoundAssetRow {
  kind: BoundAssetKind;
  name: string;
  description?: string;
  thumbUrl?: string;
}

const KIND_META: Record<
  BoundAssetKind,
  { label: string; icon: typeof Users }
> = {
  characters: { label: "角色", icon: Users },
  scenes: { label: "场景", icon: Landmark },
  props: { label: "道具", icon: Package },
};

const KIND_ORDER: BoundAssetKind[] = ["characters", "scenes", "props"];

function sheetPathOf(
  kind: BoundAssetKind,
  item: WorkspaceV2AssetCharacterItem | WorkspaceV2AssetSceneItem | WorkspaceV2AssetPropItem,
): string | undefined {
  if (kind === "characters") {
    const c = item as WorkspaceV2AssetCharacterItem;
    return c.character_sheet?.trim() || c.reference_image?.trim() || undefined;
  }
  if (kind === "scenes") {
    return (item as WorkspaceV2AssetSceneItem).scene_sheet?.trim() || undefined;
  }
  return (item as WorkspaceV2AssetPropItem).prop_sheet?.trim() || undefined;
}

function mapAssetsToRows(
  projectId: string,
  data: WorkspaceV2ProjectAssetsResponse,
): BoundAssetRow[] {
  const rows: BoundAssetRow[] = [];
  for (const kind of KIND_ORDER) {
    const list = data[kind];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const name = item.name?.trim();
      if (!name) continue;
      rows.push({
        kind,
        name,
        description: item.description?.trim() || undefined,
        thumbUrl: resolveWorkspaceV2ShotMediaUrl(projectId, sheetPathOf(kind, item)),
      });
    }
  }
  return rows;
}

function sameNameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/** 仅进入视口后再请求缩略图，避免弹框打开瞬间打爆图片请求 */
function LazyBoundAssetThumb({
  src,
  fallback,
}: {
  src?: string;
  fallback: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: el.closest("[data-bound-assets-scroll]") ?? null, rootMargin: "120px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    <div ref={ref} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#12151c]">
      {!src || failed || !visible ? (
        <div className="flex h-full w-full items-center justify-center text-cyan-300/70">{fallback}</div>
      ) : (
        <>
          {!loaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#12151c]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/80" strokeWidth={2.4} />
            </div>
          ) : null}
          <img
            src={src}
            alt=""
            className={cn("h-full w-full object-cover", !loaded && "opacity-0")}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      )}
    </div>
  );
}

export interface ShotBoundAssetsEditModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sceneId: string;
  initialCharacters: string[];
  initialScenes: string[];
  initialProps: string[];
  onSaved: () => void | Promise<void>;
}

export function ShotBoundAssetsEditModal({
  open,
  onClose,
  projectId,
  sceneId,
  initialCharacters,
  initialScenes,
  initialProps,
  onSaved,
}: ShotBoundAssetsEditModalProps) {
  const titleId = useId();
  const searchId = useId();
  const pushToast = useAppStore((s) => s.pushToast);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<BoundAssetRow[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(initialCharacters);
  const [selectedScenes, setSelectedScenes] = useState<string[]>(initialScenes);
  const [selectedProps, setSelectedProps] = useState<string[]>(initialProps);
  const [activeKind, setActiveKind] = useState<BoundAssetKind | "all">("all");
  const loadSeq = useRef(0);
  const openedOnce = useRef(false);

  useEffect(() => {
    if (!open) {
      openedOnce.current = false;
      return;
    }
    const isFirstOpen = !openedOnce.current;
    openedOnce.current = true;
    if (isFirstOpen) {
      setSearchInput("");
      setDebouncedSearch("");
      setRows([]);
      setLoading(true);
      setSelectedCharacters(initialCharacters);
      setSelectedScenes(initialScenes);
      setSelectedProps(initialProps);
      setActiveKind("all");
    }
  }, [open, initialCharacters, initialScenes, initialProps]);

  useEffect(() => {
    if (!open || !openedOnce.current) return;
    // 首屏用 debouncedSearch 初始 "" 直接加载；仅后续输入走防抖
    const timer = window.setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = searchInput.trim();
        return prev === next ? prev : next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, searchInput]);

  const loadAssets = useCallback(
    async (search: string) => {
      const seq = ++loadSeq.current;
      setLoading(true);
      try {
        const data = await fetchWorkspaceV2ProjectAssets(projectId, {
          search: search || undefined,
        });
        if (seq !== loadSeq.current) return;
        setRows(mapAssetsToRows(projectId, data));
      } catch (err) {
        if (seq !== loadSeq.current) return;
        pushToast(`加载资产失败：${errMsg(err)}`, "error");
        setRows([]);
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [projectId, pushToast],
  );

  useEffect(() => {
    if (!open) return;
    voidCall(loadAssets(debouncedSearch));
  }, [open, debouncedSearch, loadAssets]);

  const dirty = useMemo(
    () =>
      !sameNameSet(selectedCharacters, initialCharacters) ||
      !sameNameSet(selectedScenes, initialScenes) ||
      !sameNameSet(selectedProps, initialProps),
    [
      selectedCharacters,
      selectedScenes,
      selectedProps,
      initialCharacters,
      initialScenes,
      initialProps,
    ],
  );

  const selectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const name of selectedCharacters) set.add(`characters:${name}`);
    for (const name of selectedScenes) set.add(`scenes:${name}`);
    for (const name of selectedProps) set.add(`props:${name}`);
    return set;
  }, [selectedCharacters, selectedScenes, selectedProps]);

  const visibleRows = useMemo(
    () => (activeKind === "all" ? rows : rows.filter((row) => row.kind === activeKind)),
    [rows, activeKind],
  );

  const toggle = (kind: BoundAssetKind, name: string) => {
    const updater = (prev: string[]) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
    if (kind === "characters") setSelectedCharacters(updater);
    else if (kind === "scenes") setSelectedScenes(updater);
    else setSelectedProps(updater);
  };

  const handleConfirm = async () => {
    if (saving || !dirty) {
      if (!dirty) onClose();
      return;
    }
    setSaving(true);
    try {
      await updateWorkspaceV2ScriptScene(projectId, sceneId, {
        characters_in_scene: selectedCharacters,
        scenes: selectedScenes,
        props: selectedProps,
      });
      await onSaved();
      pushToast("绑定资产已更新", "success");
      onClose();
    } catch (err) {
      pushToast(`更新绑定失败：${errMsg(err)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount =
    selectedCharacters.length + selectedScenes.length + selectedProps.length;

  return (
    <GlassModal
      open={open}
      onClose={saving ? () => undefined : onClose}
      labelledBy={titleId}
      widthClassName="w-full max-w-2xl"
      panelClassName="flex max-h-[min(82vh,720px)] flex-col overflow-hidden"
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[15px] font-semibold text-foreground">
            编辑绑定资产
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {sceneId} · 已选 {selectedCount} 项
          </p>
        </div>
        <ModalCloseButton onClick={onClose} disabled={saving} />
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-b border-white/8 px-5 py-3">
        <label htmlFor={searchId} className="sr-only">
          搜索资产
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.2}
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索角色 / 场景 / 道具"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/4 pl-8 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25"
            disabled={saving}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <KindFilterChip
            active={activeKind === "all"}
            label="全部"
            onClick={() => setActiveKind("all")}
            disabled={saving}
          />
          {KIND_ORDER.map((kind) => {
            const Meta = KIND_META[kind];
            return (
              <KindFilterChip
                key={kind}
                active={activeKind === kind}
                label={Meta.label}
                icon={<Meta.icon className="h-3 w-3" strokeWidth={2.2} />}
                onClick={() => setActiveKind(kind)}
                disabled={saving}
              />
            );
          })}
        </div>
      </div>

      <div
        data-bound-assets-scroll
        className="relative min-h-0 flex-1 overflow-y-auto px-5 py-3"
      >
        {loading ? (
          <div
            className="flex min-h-[240px] flex-col items-center justify-center gap-2.5 text-[13px] text-muted-foreground"
            aria-busy="true"
            aria-label="加载资产中"
          >
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300/85" strokeWidth={2.4} />
            <span>加载资产中…</span>
            <span className="text-[11px] text-muted-foreground/70">请稍候，资产列表较大时可能需要几秒</span>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center text-[13px] text-muted-foreground">
            {debouncedSearch ? "未找到匹配资产" : "暂无项目资产"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleRows.map((row) => {
              const key = `${row.kind}:${row.name}`;
              const selected = selectedSet.has(key);
              const Meta = KIND_META[row.kind];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={saving}
                  onClick={() => toggle(row.kind, row.name)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "border-cyan-400/45 bg-cyan-500/12"
                      : "border-white/10 bg-white/3 hover:border-white/18 hover:bg-white/5",
                    saving && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="relative shrink-0">
                    <LazyBoundAssetThumb
                      src={row.thumbUrl}
                      fallback={<Meta.icon className="h-4 w-4" strokeWidth={2.2} />}
                    />
                    {selected ? (
                      <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[#041018]">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {row.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {Meta.label}
                      </span>
                    </div>
                    {row.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {row.description}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/8 px-5 py-3">
        <SecondaryButton type="button" onClick={onClose} disabled={saving}>
          取消
        </SecondaryButton>
        <PrimaryButton
          type="button"
          onClick={() => void handleConfirm()}
          disabled={saving || !dirty}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
              提交中…
            </>
          ) : (
            "确认"
          )}
        </PrimaryButton>
      </div>
    </GlassModal>
  );
}

function KindFilterChip({
  active,
  label,
  icon,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
          : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/18 hover:text-foreground/90",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
