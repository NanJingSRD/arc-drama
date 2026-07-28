import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FieldLabelProps {
  htmlFor?: string;
  required?: boolean;
  trailing?: ReactNode;
  className?: string;
  size?: "default" | "sm";
  children: ReactNode;
}

const LABEL_CLS =
  "font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-2";

const LABEL_CLS_SM =
  "font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-text-2";

export function FieldLabel({
  htmlFor,
  required,
  trailing,
  className,
  size = "default",
  children,
}: FieldLabelProps) {
  const { t } = useTranslation("common");
  const labelCls = size === "sm" ? LABEL_CLS_SM : LABEL_CLS;
  const wrapperClass = className ?? (size === "sm" ? "mb-1" : "mb-1.5");
  const inner = (
    <>
      {children}
      {required ? (
        <span aria-label={t("required")} className="ml-1 text-warm-bright">
          *
        </span>
      ) : null}
    </>
  );
  if (trailing) {
    return (
      <div className={`flex items-center justify-between ${wrapperClass}`}>
        <label htmlFor={htmlFor} className={labelCls}>
          {inner}
        </label>
        {trailing}
      </div>
    );
  }
  return (
    <label htmlFor={htmlFor} className={`block ${labelCls} ${wrapperClass}`}>
      {inner}
    </label>
  );
}
