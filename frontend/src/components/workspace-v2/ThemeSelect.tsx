import { useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WS2_HOME_SELECT_PANEL_CLASS } from "./workspace-v2-home-theme";
import type { UI_LAYERS } from "@/utils/ui-layers";

export interface ThemeSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface ThemeSelectProps<T extends string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: ThemeSelectOption<T>[];
  placeholder?: string;
  "aria-label"?: string;
  /** Popover 层级；模态框内应传 "modal"，避免被 z-50 弹窗遮挡 */
  popoverLayer?: keyof typeof UI_LAYERS;
  /** 触发按钮额外样式（首页筛选条等场景） */
  triggerClassName?: string;
  /** 下拉面板额外样式 */
  panelClassName?: string;
}

export function ThemeSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder = "请选择",
  "aria-label": ariaLabel,
  popoverLayer = "workspacePopover",
  triggerClassName,
  panelClassName,
}: ThemeSelectProps<T>) {
  const reactId = useId();
  const listboxId = `theme-select-${reactId}`;
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState<number | undefined>();

  useLayoutEffect(() => {
    if (open && anchorRef.current) {
      setMenuWidth(anchorRef.current.offsetWidth);
    }
  }, [open]);

  const selected = options.find((opt) => opt.value === value);
  const displayLabel = selected?.label ?? placeholder;

  const handleSelect = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        ref={anchorRef}
        id={id}
        type="button"
        variant="outline"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 w-full justify-between px-3 font-normal",
          open && "border-cyan-400/40 ring-2 ring-cyan-400/15",
          triggerClassName,
        )}
      >
        <span className={selected ? "text-white/90" : "text-white/45"}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/35 transition-transform duration-200",
            open && "rotate-180 text-cyan-300/80",
          )}
        />
      </Button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="start"
        sideOffset={6}
        layer={popoverLayer}
        width="min-w-0"
        className={cn(WS2_HOME_SELECT_PANEL_CLASS, panelClassName)}
        style={{ width: menuWidth }}
      >
        <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="max-h-56 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value || "__empty__"} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-200",
                    isSelected
                      ? "bg-cyan-400/12 text-cyan-300"
                      : "text-white/70 hover:bg-white/5",
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
