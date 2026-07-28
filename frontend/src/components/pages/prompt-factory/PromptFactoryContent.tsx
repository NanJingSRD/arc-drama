import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Copy, Heart, Loader2, Search } from "lucide-react";
import type { TemplateType, VideoTemplate } from "@/api/video-templates";
import { resolveMediaUrl } from "@/utils/app-base";
import { useAppStore } from "@/stores/app-store";
import {
  APP_MODULE_PROMPT_IMAGE_GRID,
  APP_MODULE_PROMPT_VIDEO_GRID,
  APP_MODULE_SECTION,
  APP_MODULE_SHELL,
} from "@/utils/site-layout";
import { Typewriter, type TypewriterSegment } from "@/components/ui/Typewriter";
import { usePromptTemplates } from "./usePromptTemplates";
import { PromptFactoryPagination } from "./PromptFactoryPagination";

const MOTION_SPRING = { type: "spring" as const, stiffness: 420, damping: 36 };
const MOTION_FADE = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

function templateMediaAspectClass(type: TemplateType): string {
  return type === "video" ? "aspect-video" : "aspect-9/16";
}

function promptFactoryGridClass(type: TemplateType): string {
  return type === "video" ? APP_MODULE_PROMPT_VIDEO_GRID : APP_MODULE_PROMPT_IMAGE_GRID;
}

const PROMPT_FACTORY_SLOGAN_SEGMENTS = [
  { text: "海量风格", className: "text-white/88" },
  {
    text: "一键复制",
    className: "font-semibold text-cyan-300",
    style: { textShadow: "0 0 20px rgba(34,211,238,0.55)" },
  },
  { text: "，让创意无缝转化为", className: "text-white/75" },
  {
    text: "爆款AI漫剧",
    className: "font-semibold",
    style: {
      background: "linear-gradient(90deg, #6EE7B7 0%, #22D3EE 45%, #818CF8 100%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    },
  },
] satisfies TypewriterSegment[];

function PromptFactoryHero() {
  return (
    <div className="relative mx-auto max-w-3xl px-2">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <h1 className="relative text-lg font-medium leading-relaxed tracking-[0.02em] sm:text-xl lg:text-[1.65rem]">
        <Typewriter
          once="prompt-factory-slogan"
          speed={62}
          startDelay={180}
          punctuationDelay={280}
          segments={PROMPT_FACTORY_SLOGAN_SEGMENTS}
        />
      </h1>
    </div>
  );
}

function TemplateCardSkeleton({ type }: { type: TemplateType }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14]"
    >
      <div className={`relative ${templateMediaAspectClass(type)} bg-[#12151c]`}>
        <div className="absolute inset-0 animate-shimmer" />
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3">
          <div className="h-3.5 w-3/4 rounded bg-white/10" />
          <div className="h-2.5 w-full rounded bg-white/6" />
          <div className="h-2.5 w-4/5 rounded bg-white/6" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/6 px-3 py-2.5">
        <div className="h-3 w-16 rounded bg-white/8" />
        <div className="h-3 w-8 rounded bg-white/8" />
      </div>
    </div>
  );
}

function TemplateMedia({ template }: { template: VideoTemplate }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const mediaUrl = resolveMediaUrl(template.url) ?? template.url;
  const isVideo = template.type === "video";

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !isVideo) return;
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
  }, [isVideo]);

  const handleEnter = () => {
    if (isVideo && !loaded) setLoaded(true);
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
    <div
      ref={cardRef}
      className={`relative ${templateMediaAspectClass(template.type)} overflow-hidden bg-[#12151c]`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {isVideo ? (
        loaded ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[#12151c]" />
        )
      ) : (
        <img
          src={mediaUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-black/10" />
    </div>
  );
}

function TemplateCard({
  template,
  onCopy,
  onLike,
}: {
  template: VideoTemplate;
  onCopy: (template: VideoTemplate) => Promise<void>;
  onLike: (templateId: number) => Promise<void>;
}) {
  const [copying, setCopying] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      await onCopy(template);
    } finally {
      setCopying(false);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      await onLike(template.id);
    } finally {
      setLiking(false);
    }
  };

  return (
    <article className="group w-full">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14] shadow-[0_12px_40px_oklch(0_0_0/0.4)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_0_0_1px_oklch(0.78_0.14_195/0.45),0_0_28px_oklch(0.62_0.16_195/0.35),0_20px_56px_oklch(0_0_0/0.5)]">
        <div className="relative">
          <TemplateMedia template={template} />

          <span className="absolute left-3 top-3 rounded-md bg-cyan-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
            {template.type === "video" ? "视频" : "图片"}
          </span>

          <span className="absolute right-3 top-3 max-w-[45%] truncate rounded-md bg-black/55 px-2 py-0.5 text-[10px] text-white/85 backdrop-blur-sm">
            {template.category}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pr-12 text-left">
            <h3 className="line-clamp-1 text-sm font-semibold text-white sm:text-[15px]">
              {template.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">
              {template.prompt?.trim() || "暂无提示词"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleLike()}
            disabled={liking}
            className="absolute right-3 top-11 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/45 text-white/80 opacity-0 backdrop-blur-sm transition-[opacity,border-color,color] duration-200 group-hover:opacity-100 hover:border-pink-400/50 hover:text-pink-400 focus-visible:opacity-100 disabled:opacity-60"
            aria-label="点赞"
          >
            <Heart className={`h-3.5 w-3.5 ${liking ? "animate-pulse fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/6 px-3 py-2.5">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={copying || !template.prompt?.trim()}
            className="inline-flex items-center gap-1.5 text-xs text-white/50 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{template.copys} 次复制</span>
          </button>
          <span className="inline-flex items-center gap-1 text-xs text-pink-400/80">
            <Heart className="h-3.5 w-3.5 fill-current" />
            {template.likes}
          </span>
        </div>
      </div>
    </article>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: TemplateType;
  onChange: (type: TemplateType) => void;
}) {
  const reduceMotion = useReducedMotion();
  const options: { id: TemplateType; label: string }[] = [
    { id: "video", label: "视频模板" },
    { id: "image", label: "图片模板" },
  ];

  return (
    <LayoutGroup id="prompt-type-toggle">
      <div className="relative inline-flex rounded-xl border border-white/10 bg-white/4 p-1">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`relative rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                active ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="prompt-type-pill"
                  className="absolute inset-0 rounded-lg bg-linear-to-r from-[#2563eb] via-[#0891b2] to-[#059669] shadow-[0_0_20px_oklch(0.62_0.14_210/0.4)]"
                  transition={reduceMotion ? { duration: 0 } : MOTION_SPRING}
                />
              ) : null}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
        active
          ? "text-cyan-300"
          : "bg-white/5 text-white/55 hover:bg-white/8 hover:text-white/80"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="prompt-category-pill"
          className="absolute inset-0 rounded-full bg-cyan-400/15 ring-1 ring-cyan-400/40"
          transition={reduceMotion ? { duration: 0 } : MOTION_SPRING}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function PromptFactoryContent() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const prevPageRef = useRef(1);
  const pushToast = useAppStore((s) => s.pushToast);
  const {
    templateType,
    setTemplateType,
    category,
    setCategory,
    search,
    setSearch,
    debouncedSearch,
    categories,
    templates,
    loading,
    error,
    page,
    total,
    totalPages,
    pageSize,
    setPage,
    handleLike,
    handleCopy,
  } = usePromptTemplates();

  const onCopy = async (template: VideoTemplate) => {
    try {
      await handleCopy(template);
      pushToast("提示词已复制到剪贴板", "success");
    } catch {
      pushToast("复制失败，请重试", "error");
    }
  };

  const onLike = async (templateId: number) => {
    try {
      await handleLike(templateId);
    } catch {
      pushToast("点赞失败，请重试", "error");
    }
  };

  const listKey = `${templateType}-${category ?? "all"}-${debouncedSearch}-${page}`;

  useEffect(() => {
    if (prevPageRef.current === page || loading) {
      prevPageRef.current = page;
      return;
    }
    prevPageRef.current = page;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, loading]);

  return (
    <section
      ref={sectionRef}
      className={`relative ${APP_MODULE_SECTION} pb-10 sm:pb-12`}
      data-testid="prompt-factory-content"
    >
      <div className={APP_MODULE_SHELL}>
        <div className="mb-8 text-center sm:mb-10">
          <PromptFactoryHero />
          <div className="mt-6 flex justify-center">
            <TypeToggle value={templateType} onChange={setTemplateType} />
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/8 bg-[#0a0e14]/60 p-4 backdrop-blur-sm sm:p-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={templateType}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={MOTION_FADE}
              className="mb-3 text-xs font-medium text-white/50"
            >
              {templateType === "video" ? "视频剧情分类" : "图片风格分类"}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              key={templateType}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={MOTION_FADE}
            >
              <LayoutGroup id={`prompt-category-${templateType}`}>
                <div className="flex flex-wrap gap-2">
                  <CategoryPill
                    active={category === null}
                    onClick={() => setCategory(null)}
                  >
                    全部
                  </CategoryPill>
                  {categories.map((cat) => (
                    <CategoryPill
                      key={cat}
                      active={category === cat}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </CategoryPill>
                  ))}
                </div>
              </LayoutGroup>
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索模板标题、提示词、分类…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/30 outline-none transition focus:border-cyan-400/40 focus:bg-white/8"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key={`loading-${listKey}`}
              aria-busy="true"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={MOTION_FADE}
              className="space-y-6"
            >
              <div className="flex items-center justify-center gap-2 text-sm text-white/45">
                <Loader2 className="h-4 w-4 motion-safe:animate-spin text-cyan-400" />
                加载模板中…
              </div>
              <div className={promptFactoryGridClass(templateType)}>
                {Array.from({ length: pageSize }, (_, i) => i).map((i) => (
                  <TemplateCardSkeleton key={i} type={templateType} />
                ))}
              </div>
            </motion.div>
          ) : templates.length === 0 ? (
            <motion.p
              key={`empty-${listKey}`}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={MOTION_FADE}
              className="py-20 text-center text-sm text-white/40"
            >
              {error ?? "未找到匹配的模板"}
            </motion.p>
          ) : (
            <motion.div
              key={`grid-${listKey}`}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={MOTION_FADE}
            >
              <div className={promptFactoryGridClass(templateType)}>
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...MOTION_FADE,
                      delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.28),
                    }}
                  >
                    <TemplateCard
                      template={template}
                      onCopy={onCopy}
                      onLike={onLike}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PromptFactoryPagination
          page={page}
          totalPages={totalPages}
          total={total}
          disabled={loading}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}
