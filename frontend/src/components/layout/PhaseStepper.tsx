import { useTranslation } from "react-i18next";
import { PHASE_ORDER } from "@/types";

interface PhaseStepperProps {
  currentPhase: string | undefined;
}

/**
 * 顶栏阶段步进器：胶囊样式（圆形号 + 标签 + 短分隔线）。
 * 当前阶段高亮 Web3 cyan-indigo 渐变。
 */
export function PhaseStepper({ currentPhase }: PhaseStepperProps) {
  const { t } = useTranslation("dashboard");
  const currentIdx = PHASE_ORDER.findIndex((p) => p === currentPhase);

  return (
    <nav aria-label={t("workflow_phases")}>
      <div
        className="inline-flex items-center gap-px rounded-full p-[3px]"
        style={{
          background: "oklch(0.17 0.010 265 / 0.6)",
          border: "1px solid var(--color-hairline)",
          boxShadow: "inset 0 1px 2px oklch(0 0 0 / 0.25)",
        }}
      >
        {PHASE_ORDER.map((phase, idx) => {
          const isActive = currentIdx === idx;
          const isPastOrActive = currentIdx >= 0 && currentIdx >= idx;
          const nextIsActive = currentIdx === idx + 1;
          return (
            <div key={phase} className="flex items-center">
              <div
                aria-current={isActive ? "step" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  isActive
                    ? {
                        color: "#F8FAFC",
                        background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(99,102,241,0.22))",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(34,211,238,0.25), 0 0 20px -8px rgba(99,102,241,0.45)",
                      }
                    : { color: "var(--color-text-3)", background: "transparent" }
                }
              >
                <span
                  className="num inline-grid h-[15px] w-[15px] place-items-center rounded-full text-[10px] font-bold"
                  style={
                    isActive
                      ? {
                          color: "#F8FAFC",
                          background: "linear-gradient(135deg, #06B6D4, #6366F1)",
                          boxShadow: "0 0 10px rgba(34,211,238,0.55)",
                        }
                      : {
                          background: "oklch(0.32 0.012 265)",
                          color: "var(--color-text-3)",
                        }
                  }
                >
                  {idx + 1}
                </span>
                <span className="whitespace-nowrap">{t(`phase_${phase}`)}</span>
              </div>
              {idx < PHASE_ORDER.length - 1 && (
                <div
                  aria-hidden="true"
                  className="mx-0.5 h-px w-1.5"
                  style={{
                    background:
                      isPastOrActive || nextIsActive
                        ? "var(--color-accent-soft)"
                        : "var(--color-hairline-soft)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
