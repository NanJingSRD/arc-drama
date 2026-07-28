import { Fragment } from "react";
import { Check } from "lucide-react";
import {
  WORKSPACE_V2_PROGRESS_LABELS,
  WORKSPACE_V2_PROGRESS_ORDER,
  type WorkspaceV2Progress,
} from "@/types/workspace-v2";
import { cn } from "@/lib/utils";

const NODE_SIZE = 18;
const NODE_RADIUS = NODE_SIZE / 2;

interface ProgressStepsProps {
  progress: WorkspaceV2Progress;
}

type StepState = "completed" | "active" | "pending";

function stepIndex(progress: WorkspaceV2Progress): number {
  return WORKSPACE_V2_PROGRESS_ORDER.indexOf(progress);
}

function getStepState(
  idx: number,
  currentIdx: number,
  progress: WorkspaceV2Progress,
): StepState {
  // 终态「已完成」：当前进度落在此节点时整条流程显示完成态
  if (progress === "completed") return "completed";
  if (idx < currentIdx) return "completed";
  if (idx === currentIdx) return "active";
  return "pending";
}

function StepNode({ idx, state }: { idx: number; state: StepState }) {
  if (state === "completed") {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full",
          "h-[18px] w-[18px] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]",
        )}
      >
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border border-sky-400/65"
        />
        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-sky-400 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.45)]">
          {idx + 1}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
        "border border-white/12 bg-[#0a0e14] text-[10px] font-semibold text-white/35",
      )}
    >
      {idx + 1}
    </span>
  );
}

export function ProgressSteps({ progress }: ProgressStepsProps) {
  const currentIdx = stepIndex(progress);
  const lastIdx = WORKSPACE_V2_PROGRESS_ORDER.length - 1;

  return (
    <div role="list" aria-label="制作进度" className="w-full">
      <div className="flex w-full items-start">
        {WORKSPACE_V2_PROGRESS_ORDER.map((step, idx) => {
          const state = getStepState(idx, currentIdx, progress);
          const label = WORKSPACE_V2_PROGRESS_LABELS[step];
          const align =
            idx === 0 ? "items-start" : idx === lastIdx ? "items-end" : "items-center";
          const labelAlign =
            idx === 0 ? "text-left" : idx === lastIdx ? "text-right" : "text-center";
          const connectorCompleted = getStepState(idx, currentIdx, progress) === "completed";

          return (
            <Fragment key={step}>
              <div role="listitem" className={cn("flex shrink-0 flex-col", align)}>
                <StepNode idx={idx} state={state} />
                <span
                  className={cn(
                    "mt-1.5 max-w-[3.4rem] text-[8.5px] leading-[1.2]",
                    labelAlign,
                    state === "completed" && "text-emerald-400/90",
                    state === "active" && "font-medium text-cyan-300",
                    state === "pending" && "text-white/35",
                  )}
                >
                  {label}
                </span>
              </div>

              {idx < lastIdx ? (
                <div
                  aria-hidden
                  className="flex min-w-1 flex-1 items-start px-0.5"
                  style={{ paddingTop: NODE_RADIUS - 0.5 }}
                >
                  <span
                    className={cn(
                      "h-px w-full",
                      connectorCompleted ? "bg-emerald-400/80" : "bg-white/10",
                    )}
                  />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
