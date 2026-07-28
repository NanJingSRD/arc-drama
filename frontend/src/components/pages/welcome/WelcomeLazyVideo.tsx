import { useEffect, useRef, useState, type ReactNode } from "react";

interface WelcomeLazyVideoProps {
  src: string;
  playing?: boolean;
  /** 默认 true；轮播当前项可设为 false 以播放声音 */
  muted?: boolean;
  className?: string;
  /** 为 true 时立即加载（轮播当前项） */
  eager?: boolean;
  /** 进入视口时加载（下方区块） */
  observe?: boolean;
  preload?: "auto" | "metadata" | "none";
}

export function WelcomeLazyVideo({
  src,
  playing = false,
  muted = true,
  className = "h-full w-full object-cover",
  eager = false,
  observe = false,
  preload,
}: WelcomeLazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(eager);
  /** 浏览器拦截有声自动播放时，等用户首次交互后再开声 */
  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    if (playing && !loaded) setLoaded(true);
  }, [playing, loaded]);

  useEffect(() => {
    if (muted) setSoundBlocked(false);
  }, [muted, src]);

  useEffect(() => {
    if (eager || loaded) return;
    if (!observe) return;

    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoaded(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, observe, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const video = videoRef.current;
    if (!video) return;

    const effectiveMuted = muted || soundBlocked;
    video.muted = effectiveMuted;

    if (playing) {
      void video.play().catch(() => {
        if (!effectiveMuted) {
          setSoundBlocked(true);
          video.muted = true;
          void video.play().catch(() => undefined);
        }
      });
    } else {
      video.pause();
    }
  }, [playing, loaded, src, muted, soundBlocked]);

  useEffect(() => {
    if (!playing || muted || !soundBlocked) return;

    const unlock = () => setSoundBlocked(false);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [playing, muted, soundBlocked]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-black">
      {loaded ? (
        <video
          ref={videoRef}
          src={src}
          muted={muted || soundBlocked}
          loop
          playsInline
          preload={preload ?? (eager ? "auto" : "metadata")}
          className={className}
        />
      ) : null}
    </div>
  );
}

/** 首屏渲染后再挂载重组件，避免阻塞轮播 */
export function WelcomeDeferred({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setReady(true);
    };
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(run, { timeout: 800 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return ready ? children : null;
}

/** 背景动效延迟挂载，优先保证内容区 */
export function WelcomeDeferredBackground({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#020617]" />;
  }

  return children;
}
