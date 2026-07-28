import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// ImageFlipReveal — 图片载入 / 切换：shimmer → 柔和淡入
// ---------------------------------------------------------------------------

interface ImageFlipRevealProps {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  onError?: () => void;
  loading?: "eager" | "lazy";
}

export function ImageFlipReveal({
  src,
  alt,
  className,
  fallback,
  onError,
  loading,
}: ImageFlipRevealProps) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const markLoaded = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setLoaded(false);
    onError?.();
  }, [onError]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

  const showSkeleton = Boolean(src) && !loaded;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      aria-busy={showSkeleton || undefined}
    >
      <AnimatePresence>
        {showSkeleton ? (
          <motion.div
            key="skeleton"
            className="absolute inset-0 z-1 bg-[#12151c]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            aria-hidden
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,oklch(0.62_0.16_195/0.08),transparent)]" />
            <div className="absolute inset-0 animate-shimmer motion-reduce:animate-none" />
            <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="h-1.5 w-1.5 rounded-full bg-white/20 motion-safe:animate-pulse"
                  style={{ animationDelay: `${index * 0.14}s` }}
                />
              ))}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {src ? (
          <motion.img
            key={src}
            src={src}
            alt={alt}
            loading={loading}
            className={className ?? "h-full w-full object-cover"}
            initial={false}
            animate={
              loaded
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: reduceMotion ? 1 : 1.02 }
            }
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
            transition={transition}
            onLoad={markLoaded}
            onError={handleError}
            ref={(node) => {
              if (!node || loaded) return;
              if (node.complete && node.naturalWidth > 0) {
                queueMicrotask(() => setLoaded(true));
              }
            }}
          />
        ) : (
          <motion.div
            key="fallback"
            className="h-full w-full"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
            transition={transition}
          >
            {fallback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
