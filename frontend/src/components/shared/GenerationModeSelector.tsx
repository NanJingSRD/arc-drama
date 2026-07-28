import { useTranslation } from "react-i18next";
import { radioCardClass, radioChipClass } from "@/components/ui/darkroom-tokens";
import type { GenerationMode } from "@/utils/generation-mode";

export interface GenerationModeSelectorProps {
  value: GenerationMode;
  onChange: (next: GenerationMode) => void;
  /** Modes to disable (e.g. if a provider cannot support reference_video). */
  disabledModes?: GenerationMode[];
  /** "lg" for wizard/settings (with description), "sm" for toolbars. */
  size?: "lg" | "sm";
  /** Optional name to differentiate multiple selectors on the same page. */
  name?: string;
}

const EMPTY_DISABLED: readonly GenerationMode[] = Object.freeze([]);

const MODES = ["storyboard", "reference_video", "grid"] as const satisfies readonly GenerationMode[];

export function GenerationModeSelector({
  value,
  onChange,
  disabledModes = EMPTY_DISABLED as GenerationMode[],
  size = "lg",
  name = "generationMode",
}: GenerationModeSelectorProps) {
  const { t } = useTranslation("dashboard");

  const labelFor = (m: GenerationMode): string =>
    m === "storyboard"
      ? t("mode_storyboard")
      : m === "grid"
        ? t("mode_grid")
        : t("mode_reference_video");

  const descFor = (m: GenerationMode): string =>
    m === "storyboard"
      ? t("mode_storyboard_desc")
      : m === "grid"
        ? t("mode_grid_desc")
        : t("mode_reference_video_desc");

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label={t("generation_mode")}
        className={size === "sm" ? "inline-flex gap-1" : "flex gap-2.5"}
      >
        {MODES.map((m) => {
          const disabled = disabledModes.includes(m);
          const selected = value === m;
          const stateClass = disabled
            ? "relative cursor-not-allowed rounded-[8px] border border-hairline-soft bg-bg-grad-a/35 px-3.5 py-2.5 text-center text-[12.5px] text-text-4"
            : size === "sm"
              ? radioChipClass(selected)
              : radioCardClass(selected);
          return (
            <label
              key={m}
              className={size === "sm" ? stateClass : `${stateClass} text-[13px]`}
            >
              <input
                type="radio"
                name={name}
                value={m}
                checked={selected}
                disabled={disabled}
                onChange={() => { if (!disabled) onChange(m); }}
                className="sr-only"
              />
              {labelFor(m)}
            </label>
          );
        })}
      </div>
      {size === "lg" && (
        <p className="text-[12px] leading-[1.55] text-text-3">{descFor(value)}</p>
      )}
    </div>
  );
}
