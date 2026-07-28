import { Check } from "lucide-react";
import {
  WORKSPACE_V2_EPISODE_WORKFLOW_LABELS,
  WORKSPACE_V2_EPISODE_WORKFLOW_ORDER,
  type WorkspaceV2EpisodeWorkflowStep,
} from "@/types/workspace-v2";

const NODE_SIZE = 32;
const NODE_RADIUS = NODE_SIZE / 2;

const COMPLETED_COLOR = "#34D399";
const ACTIVE_COLOR = "#38BDF8";
const PENDING_RING = "rgba(100, 116, 139, 0.42)";
const PENDING_TEXT = "rgba(148, 163, 184, 0.72)";
const LINE_PENDING = "rgba(71, 85, 105, 0.55)";

interface EpisodeWorkflowStepsProps {
  currentStep: WorkspaceV2EpisodeWorkflowStep;
  onStepClick?: (step: WorkspaceV2EpisodeWorkflowStep) => void;
  activeStep?: WorkspaceV2EpisodeWorkflowStep;
}

type StepState = "completed" | "active" | "pending";

function stepIndex(step: WorkspaceV2EpisodeWorkflowStep): number {
  return WORKSPACE_V2_EPISODE_WORKFLOW_ORDER.indexOf(step);
}

function getStepState(idx: number, currentIdx: number): StepState {
  if (idx < currentIdx) return "completed";
  if (idx === currentIdx) return "active";
  return "pending";
}

function StepNode({ idx, state }: { idx: number; state: StepState }) {
  if (state === "completed") {
    return (
      <span
        className="relative z-10 flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          background: COMPLETED_COLOR,
        }}
      >
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span
        className="relative z-10 flex shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          background: ACTIVE_COLOR,
        }}
      >
        {idx + 1}
      </span>
    );
  }

  return (
    <span
      className="relative z-10 flex shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold"
      style={{
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderColor: PENDING_RING,
        color: PENDING_TEXT,
        background: "rgba(6, 10, 24, 0.85)",
      }}
    >
      {idx + 1}
    </span>
  );
}

export function EpisodeWorkflowSteps({
  currentStep,
  onStepClick,
  activeStep,
}: EpisodeWorkflowStepsProps) {
  const currentIdx = stepIndex(currentStep);
  const lastIdx = WORKSPACE_V2_EPISODE_WORKFLOW_ORDER.length - 1;
  const highlightStep = activeStep ?? currentStep;

  return (
    <div role="list" aria-label="剧集工作流" className="w-full">
      <div className="relative flex w-full items-start justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute flex"
          style={{
            top: NODE_RADIUS - 0.5,
            left: NODE_RADIUS,
            width: `calc(100% - ${NODE_SIZE}px)`,
            height: 2,
          }}
        >
          {WORKSPACE_V2_EPISODE_WORKFLOW_ORDER.slice(0, -1).map((step, idx) => {
            const lineCompleted = getStepState(idx, currentIdx) === "completed";
            return (
              <span
                key={step}
                className="h-0.5 flex-1"
                style={{
                  background: lineCompleted ? COMPLETED_COLOR : LINE_PENDING,
                }}
              />
            );
          })}
        </div>

        {WORKSPACE_V2_EPISODE_WORKFLOW_ORDER.map((step, idx) => {
          const state = getStepState(idx, currentIdx);
          const label = WORKSPACE_V2_EPISODE_WORKFLOW_LABELS[step];
          const isViewing = step === highlightStep;
          const align =
            idx === 0 ? "items-start" : idx === lastIdx ? "items-end" : "items-center";
          const labelAlign =
            idx === 0 ? "text-left" : idx === lastIdx ? "text-right" : "text-center";

          return (
            <button
              key={step}
              type="button"
              role="listitem"
              onClick={() => onStepClick?.(step)}
              className={`relative z-10 flex shrink-0 flex-col ${align} cursor-pointer transition-opacity hover:opacity-90`}
            >
              <StepNode idx={idx} state={state} />
              <span
                className={`mt-2 max-w-[5rem] text-[10px] leading-[1.3] ${labelAlign}`}
                style={{
                  color: isViewing
                    ? "oklch(0.92 0.01 265)"
                    : state === "completed"
                      ? COMPLETED_COLOR
                      : state === "active"
                        ? ACTIVE_COLOR
                        : PENDING_TEXT,
                  fontWeight: isViewing ? 600 : 400,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
