import { useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { ImageLightbox } from "./ImageLightbox";

interface PreviewableImageFrameProps {
  src: string | null;
  alt: string;
  children: ReactNode;
  /** 按钮额外文案（如「完整查看」）；仅图标时可不传 */
  label?: string;
  buttonClassName?: string;
}

export function PreviewableImageFrame({
  src,
  alt,
  children,
  label,
  buttonClassName,
}: PreviewableImageFrameProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="group relative">
        {children}
        {src ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            aria-label={label ? `${label}：${alt}` : `${alt} 全屏预览`}
            className={
              "absolute right-1.5 top-1.5 z-10 inline-flex h-7 items-center justify-center gap-1 rounded-full border border-white/14 bg-slate-950/55 text-white/90 shadow-[0_8px_22px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/28 hover:bg-slate-950/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/28 " +
              (label ? "px-2.5 " : "w-7 ") +
              "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100 " +
              (buttonClassName ?? "")
            }
          >
            <Maximize2 className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            {label ? <span className="text-[11px] font-medium tracking-wide">{label}</span> : null}
          </button>
        ) : null}
      </div>

      {open && src ? (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
