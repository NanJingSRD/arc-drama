import { Check } from "lucide-react";
import { Fragment } from "react";
import { Link, useLocation } from "wouter";
import {
  WORKSPACE_V2_PROGRESS_LABELS,
  WORKSPACE_V2_PROGRESS_ORDER,
  type WorkspaceV2Progress,
} from "@/types/workspace-v2";
import {
  parseWorkspaceV2ProjectDetailNav,
  workspaceV2NavToWorkflowStep,
  workspaceV2WorkflowStepHref,
  WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS,
} from "@/utils/workspace-v2-project-paths";
import { WS2_DETAIL_NODE_BACKDROP_CLASS } from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

const SIZE = {
  default: {
    slotWidth: "6.75rem",
    nodePx: 32,
    nodeBox: "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
    nodeWrap: "relative flex h-8 w-8 shrink-0 items-center justify-center",
    check: "h-4 w-4",
    nodeText: "text-xs",
    labelMt: "mt-2",
    labelText: "text-[12px]",
    ringInset: "-inset-1",
    ringBorder: "border-2",
    connectorMin: "min-w-12",
  },
  compact: {
    // 槽位/连线由 --wf-slot / --wf-gap 控制（见 nav 上的 @container 断点）
    slotWidth: "var(--wf-slot)",
    nodePx: 20,
    nodeBox: "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
    nodeWrap: "relative flex h-5 w-5 shrink-0 items-center justify-center",
    check: "h-2.5 w-2.5",
    nodeText: "text-[10px]",
    labelMt: "mt-1",
    labelText: "text-[10px]",
    ringInset: "-inset-0.5",
    ringBorder: "border",
    connectorMin: "min-w-[var(--wf-gap)]",
  },
} as const;

interface ProjectDetailWorkflowNavProps {
  projectId: string;
  /** 项目当前制作进度，用于节点完成态展示 */
  projectProgress?: WorkspaceV2Progress;
  /** 节点遮罩底色，需与外层容器背景一致 */
  nodeBackdropClass?: string;
  /** 收纳进 header 时的紧凑尺寸 */
  compact?: boolean;
}

type StepVisualState = "completed" | "active" | "pending";
type SizeToken = (typeof SIZE)[keyof typeof SIZE];

function progressIndex(progress: WorkspaceV2Progress): number {
  return WORKSPACE_V2_PROGRESS_ORDER.indexOf(progress);
}

function getStepVisualState(
  stepIdx: number,
  projectProgressIdx: number,
  projectProgress: WorkspaceV2Progress,
): StepVisualState {
  // 制作分镜完成后进度落在「已完成」：整条流程（含终态节点）一律显示完成态对勾
  if (projectProgress === "completed") return "completed";
  if (stepIdx < projectProgressIdx) return "completed";
  if (stepIdx === projectProgressIdx) return "active";
  return "pending";
}

/** 节点 idx 与 idx+1 之间的线段是否已完成（仅跟项目进度，不跟点击选中） */
function isSegmentCompleted(
  segmentIdx: number,
  projectProgressIdx: number,
  projectProgress: WorkspaceV2Progress,
): boolean {
  return getStepVisualState(segmentIdx, projectProgressIdx, projectProgress) === "completed";
}

function WorkflowNode({
  index,
  visualState,
  selected,
  nodeBackdropClass,
  size,
}: {
  index: number;
  visualState: StepVisualState;
  selected: boolean;
  nodeBackdropClass: string;
  size: SizeToken;
}) {
  // 已完成态优先于选中：回看历史节点仍显示对勾，选中用外侧同色圆弧区分
  if (visualState === "completed") {
    return (
      <span className={size.nodeWrap}>
        {selected ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full border-emerald-400 motion-safe:animate-breathe",
              size.ringInset,
              size.ringBorder,
            )}
          />
        ) : null}
        <span
          className={cn(
            size.nodeBox,
            "z-10 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
          )}
        >
          <Check className={cn(size.check, "text-white")} strokeWidth={3} />
        </span>
      </span>
    );
  }

  // 当前进度：蓝实心；外侧圆弧仅在处于该节点页面（selected）时显示，与已完成态一致
  if (selected || visualState === "active") {
    const fillTone = selected ? "bg-sky-400" : "bg-sky-500";
    return (
      <span className={size.nodeWrap}>
        {selected ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full border-sky-400 motion-safe:animate-breathe",
              size.ringInset,
              size.ringBorder,
            )}
          />
        ) : null}
        <span className={cn(size.nodeBox, "z-10 font-bold text-white", size.nodeText, fillTone)}>
          {index + 1}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        size.nodeBox,
        "z-10 border border-white/12 bg-[#0a0e14] font-semibold text-white/35",
        size.nodeText,
        nodeBackdropClass,
      )}
    >
      {index + 1}
    </span>
  );
}

export function ProjectDetailWorkflowNav({
  projectId,
  projectProgress = "script_import",
  nodeBackdropClass = WS2_DETAIL_NODE_BACKDROP_CLASS,
  compact = false,
}: ProjectDetailWorkflowNavProps) {
  const [location] = useLocation();
  const { activeNav } = parseWorkspaceV2ProjectDetailNav(location, projectId);
  const selectedStep = workspaceV2NavToWorkflowStep(activeNav);
  const projectProgressIdx = progressIndex(projectProgress);
  const size = compact ? SIZE.compact : SIZE.default;
  // 线段向两侧伸出到圆外缘；用绝对定位，避免负 margin 把节点间距挤短
  const connectorOverhang = `calc((${size.slotWidth} - ${size.nodePx}px) / 2)`;

  const steps = WORKSPACE_V2_PROGRESS_ORDER.map((step, idx) => {
    const label = WORKSPACE_V2_PROGRESS_LABELS[step];
    const inNavigableList = (
      WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS as readonly WorkspaceV2Progress[]
    ).includes(step);
    const selected = step === selectedStep;
    const visualState = getStepVisualState(idx, projectProgressIdx, projectProgress);
    // 未放开（进度未到）的节点不可点击；已完成 / 当前进度节点可跳转
    const clickable = inNavigableList && visualState !== "pending";

    const labelClassName = cn(
      "w-full whitespace-nowrap text-center leading-tight tracking-wide",
      size.labelMt,
      size.labelText,
      selected && visualState === "completed" && "font-semibold text-emerald-300",
      selected && visualState !== "completed" && "font-semibold text-white",
      !selected && visualState === "completed" && "text-emerald-400/90",
      !selected && visualState === "active" && "text-cyan-300/90",
      !selected && visualState === "pending" && "text-white/40",
    );

    const node = (
      <WorkflowNode
        index={idx}
        visualState={visualState}
        selected={selected}
        nodeBackdropClass={nodeBackdropClass}
        size={size}
      />
    );

    const segmentCompleted =
      idx > 0 ? isSegmentCompleted(idx - 1, projectProgressIdx, projectProgress) : false;

    return {
      step,
      idx,
      label,
      clickable,
      selected,
      labelClassName,
      node,
      segmentCompleted,
    };
  });

  return (
    <nav
      aria-label="制作流程"
      className={cn(
        compact
          ? cn(
              // 按内容宽度收缩；间距随父级 @container（header 算得的 maxWidth）变窄而减小，大屏再拉开
              "mx-auto w-max max-w-full",
              "[--wf-slot:3.75rem] [--wf-gap:0.5rem]",
              "@[400px]:[--wf-slot:4.25rem] @[400px]:[--wf-gap:1rem]",
              "@[520px]:[--wf-slot:4.75rem] @[520px]:[--wf-gap:1.5rem]",
              "@[640px]:[--wf-slot:5.25rem] @[640px]:[--wf-gap:2rem]",
              "@[800px]:[--wf-slot:5.75rem] @[800px]:[--wf-gap:3rem]",
              "@[960px]:[--wf-slot:6.25rem] @[960px]:[--wf-gap:4rem]",
            )
          : "w-full",
      )}
    >
      <ol
        className={cn(
          "flex list-none items-start p-0",
          compact ? "w-max max-w-full justify-center" : "w-full",
        )}
      >
        {steps.map(({ step, idx, label, clickable, selected, labelClassName, node, segmentCompleted }) => (
          <Fragment key={step}>
            {idx > 0 ? (
              <li
                aria-hidden
                className={cn(
                  "relative z-0 list-none",
                  // compact：固定连线宽，避免被 flex-1 撑满可用宽度
                  compact ? "w-[var(--wf-gap)] shrink" : cn("flex-1", size.connectorMin),
                )}
                style={{ height: size.nodePx }}
              >
                <span
                  className={cn(
                    "absolute top-1/2 h-0.5 -translate-y-1/2",
                    segmentCompleted ? "bg-emerald-400/80" : "bg-white/10",
                  )}
                  style={{
                    left: `calc(-1 * ${connectorOverhang})`,
                    right: `calc(-1 * ${connectorOverhang})`,
                  }}
                />
              </li>
            ) : null}

            <li
              className={cn(
                "relative z-10 flex shrink-0 list-none flex-col items-center",
                !clickable && "cursor-not-allowed opacity-45",
              )}
              style={{ width: size.slotWidth }}
            >
              {clickable ? (
                <Link
                  href={workspaceV2WorkflowStepHref(projectId, step)}
                  className={cn(
                    "inline-flex outline-none transition-transform duration-200 ease-in-out",
                    "focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring",
                    !compact && "motion-safe:hover:-translate-y-0.5",
                  )}
                  aria-current={selected ? "step" : undefined}
                  aria-label={WORKSPACE_V2_PROGRESS_LABELS[step]}
                >
                  {node}
                </Link>
              ) : (
                <div aria-disabled="true" title="尚未解锁">
                  {node}
                </div>
              )}

              {clickable ? (
                <Link
                  href={workspaceV2WorkflowStepHref(projectId, step)}
                  className={cn("block w-full no-underline", labelClassName)}
                  aria-current={selected ? "step" : undefined}
                >
                  {label}
                </Link>
              ) : (
                <span className={labelClassName}>{label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
