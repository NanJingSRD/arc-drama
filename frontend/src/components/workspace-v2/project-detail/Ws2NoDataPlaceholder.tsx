import { useTranslation } from "react-i18next";
import { WS2_DETAIL_TEXT_MUTED } from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

interface Ws2NoDataPlaceholderProps {
  className?: string;
}

export function Ws2NoDataPlaceholder({ className }: Ws2NoDataPlaceholderProps) {
  const { t } = useTranslation("dashboard");

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="h-16 w-16 rounded-2xl border border-dashed border-white/12 bg-[#0a0e14]"
        />
        <p className={cn("text-sm", WS2_DETAIL_TEXT_MUTED)}>{t("no_data")}</p>
      </div>
    </div>
  );
}
