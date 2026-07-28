import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Search } from "lucide-react";
import type { FeaturedWork } from "./welcome-data";
import { APP_MODULE_FEATURED_GRID, APP_MODULE_SECTION, APP_MODULE_SHELL } from "@/utils/site-layout";

interface VideoStreamProps {
  works: FeaturedWork[];
  loading?: boolean;
  error?: string | null;
  search?: string;
  onSearchChange?: (value: string) => void;
}

function WorkCardSkeleton() {
  return (
    <div
      aria-hidden
      className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14]"
    >
      <div className="absolute inset-0 bg-[#12151c]" />
      <div className="absolute inset-0 animate-shimmer" />
      <span className="absolute left-3 top-3 h-4 w-10 rounded-md bg-white/10" />
      <span className="absolute right-3 top-3 h-4 w-9 rounded-md bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/6" />
          </div>
          <div className="h-7 w-[4.5rem] shrink-0 rounded-full bg-white/8" />
        </div>
      </div>
    </div>
  );
}

function VideoStreamLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <div className="flex items-center justify-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 motion-safe:animate-spin text-cyan-400" />
        加载精选作品中…
      </div>
      <div className={APP_MODULE_FEATURED_GRID}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <WorkCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function WorkCard({ work }: { work: FeaturedWork }) {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
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
  }, []);

  const handleEnter = () => {
    if (!loaded) setLoaded(true);
    void videoRef.current?.play().catch(() => undefined);
  };

  const handleLeave = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <article
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group w-full"
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14] shadow-[0_16px_48px_oklch(0_0_0/0.45)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-cyan-300/90 hover:shadow-[0_0_0_1px_oklch(0.78_0.14_195/0.55),0_0_32px_oklch(0.62_0.16_195/0.45),0_24px_64px_oklch(0_0_0/0.55)]">
        {loaded ? (
          <video
            ref={videoRef}
            src={work.video}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[#12151c]" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/35 to-black/10" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/0 via-transparent to-emerald-500/0 opacity-0 transition-opacity duration-500 group-hover:from-cyan-500/10 group-hover:to-emerald-500/5 group-hover:opacity-100" />

        {work.featured ? (
          <span className="absolute right-3 top-3 rounded-md bg-emerald-500/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-lg">
            精选
          </span>
        ) : null}

        {work.duration ? (
          <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/90 backdrop-blur-sm">
            {work.duration}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 text-left">
              <h3 className="line-clamp-2 text-left text-sm font-semibold leading-snug text-white sm:text-[15px]">
                {work.title}
              </h3>
              <span className="mt-0.5 block truncate text-left text-[11px] text-white/45 sm:text-xs">
                {work.author}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 backdrop-blur-sm transition hover:border-cyan-400/60 hover:bg-cyan-400/20"
            >
              <Copy className="h-3 w-3" />
              克隆作品
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** 精选作品列表 — 大卡片网格 */
export function VideoStream({
  works,
  loading = false,
  error = null,
  search: controlledSearch,
  onSearchChange,
}: VideoStreamProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const search = controlledSearch ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;

  return (
    <section className={`relative ${APP_MODULE_SECTION}`}>
      <div className={APP_MODULE_SHELL}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              精选作品
            </h2>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索视频作品"
              className="w-56 rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/30 outline-none transition focus:border-cyan-400/40 focus:bg-white/8 sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <VideoStreamLoading />
        ) : works.length === 0 ? (
          <p className="py-20 text-center text-sm text-white/40">
            {error ?? "未找到匹配的作品"}
          </p>
        ) : (
          <div className={APP_MODULE_FEATURED_GRID}>
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
