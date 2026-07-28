import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { UI_LAYERS } from "@/utils/ui-layers";

export interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Capture + stopImmediatePropagation：避免上层 GlassModal 同步吃掉 Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className={`fixed inset-0 ${UI_LAYERS.blocking}`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* 背景虚化：轻遮罩 + 强 blur，避免实黑挡死虚化效果 */}
      <button
        type="button"
        aria-label="关闭全屏预览"
        className="absolute inset-0 cursor-default appearance-none border-0 bg-black/30 p-0 backdrop-blur-md"
        style={{ WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭图片预览"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-black/40 text-white shadow-lg shadow-black/30 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/28 hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-center p-5 sm:p-8 lg:p-12">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} 全屏预览`}
          className="relative max-h-full max-w-full"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[calc(100vh-3rem)] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/12 bg-black/25 object-contain shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100vh-5rem)] sm:max-w-[calc(100vw-4rem)]"
          />
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}
