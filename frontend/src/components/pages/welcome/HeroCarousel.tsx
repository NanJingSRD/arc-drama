import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HeroSlide } from "./welcome-data";
import {
  WELCOME_HERO_SECTION_CLASS,
  WELCOME_HERO_STYLE,
  WELCOME_SECTION,
} from "./welcome-layout";
import { WelcomeLazyVideo } from "./WelcomeLazyVideo";

function heroSideX(offset: -1 | 0 | 1) {
  if (offset === 0) return 0;
  return `calc(var(--hero-side) * ${offset})`;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  loading?: boolean;
  error?: string | null;
}

function HeroCarouselFrame({ children }: { children: ReactNode }) {
  return (
    <section className={WELCOME_HERO_SECTION_CLASS} style={WELCOME_HERO_STYLE}>
      <div
        className={`${WELCOME_SECTION} flex min-h-0 flex-1 flex-col overflow-visible pt-2 pb-1 sm:pt-2.5 sm:pb-1.5 lg:pt-3 lg:pb-1.5 xl:pt-4 xl:pb-2`}
      >
        {children}
      </div>
    </section>
  );
}

function SlideStage({
  slide,
  isCenter,
}: {
  slide: HeroSlide;
  isCenter: boolean;
}) {
  return (
    <div
      className={`relative h-full w-full rounded-2xl p-[2px] transition-shadow duration-500 ${
        isCenter
          ? "bg-linear-to-br from-cyan-400 via-cyan-300 to-teal-400 shadow-[0_0_32px_oklch(0.78_0.12_195/0.5),0_24px_56px_oklch(0_0_0/0.5)]"
          : "bg-transparent"
      }`}
    >
      <div className="relative aspect-video h-full w-full overflow-hidden rounded-[14px] bg-black">
        <WelcomeLazyVideo
          src={slide.video}
          playing={isCenter}
          muted={!isCenter}
          eager
          preload={isCenter ? "auto" : "metadata"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
        {isCenter && (
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.35 }}
              className="absolute bottom-0 left-0 p-4 text-left sm:p-5"
            >
              <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                {slide.title}
              </h2>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function HeroDots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="轮播切换"
      data-testid="hero-carousel-dots"
      className="flex h-6 w-full shrink-0 items-center justify-center gap-2 pt-1.5 pb-0.5 sm:gap-2.5 lg:h-6 lg:pt-2.5 lg:pb-1"
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`跳转到第 ${i + 1} 张`}
          aria-current={i === active ? "true" : undefined}
          onClick={() => onSelect(i)}
          className={`block shrink-0 rounded-full transition-all duration-300 ${
            i === active
              ? "h-2 w-10 bg-cyan-400 shadow-[0_0_14px_oklch(0.78_0.12_195/0.85)]"
              : "h-2 w-2 bg-white/45 hover:bg-white/70"
          }`}
        />
      ))}
    </nav>
  );
}

function HeroTrackShell({
  children,
  onPrev,
  onNext,
}: {
  children: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1320px] flex-1 grid-cols-[2rem_1fr_2rem] items-stretch gap-1.5 overflow-visible sm:grid-cols-[2.25rem_1fr_2.25rem] sm:gap-2 lg:max-w-[1400px] lg:grid-cols-[2.5rem_1fr_2.5rem]">
      {onPrev ? (
        <HeroNavButton direction="prev" onClick={onPrev} />
      ) : (
        <span aria-hidden />
      )}

      <div className="@container/hero relative flex min-h-0 flex-1 items-center justify-center overflow-visible py-1.5 lg:py-3 xl:py-4">
        <div
          className="relative flex h-full max-h-full w-full items-center justify-center overflow-visible"
          style={{
            maxWidth: "min(100%, calc(var(--hero-max-w) + 2 * var(--hero-peek)))",
          }}
        >
          <div
            className="relative mx-auto aspect-video h-auto w-full max-h-full max-w-[var(--hero-max-w)] lg:h-full lg:w-auto lg:max-h-full"
          >
            {children}
          </div>
        </div>
      </div>

      {onNext ? (
        <HeroNavButton direction="next" onClick={onNext} />
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}

function HeroNavButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "上一张" : "下一张";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center justify-self-center self-center rounded-full border border-white/12 bg-white/4 text-white/55 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/8 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:h-9 sm:w-9"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

function HeroCarouselPlaceholder({ message }: { message?: string }) {
  return (
    <HeroCarouselFrame>
      <HeroTrackShell>
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {message ? (
            <p className="text-sm text-white/50">{message}</p>
          ) : (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
          )}
        </div>
      </HeroTrackShell>
      <HeroDots count={3} active={0} onSelect={() => undefined} />
    </HeroCarouselFrame>
  );
}

function HeroCarouselLoaded({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (dir: -1 | 1) => setActive((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    const timer = setInterval(() => go(1), 6000);
    return () => clearInterval(timer);
  }, [go]);

  useEffect(() => {
    const nextSrc = slides[(active + 1) % count]?.video;
    if (!nextSrc) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "video";
    link.href = nextSrc;
    document.head.appendChild(link);
    return () => link.remove();
  }, [active, count, slides]);

  const visible = [-1, 0, 1].map((offset) => {
    const idx = (active + offset + count) % count;
    return { slide: slides[idx], offset: offset as -1 | 0 | 1, idx };
  });

  return (
    <HeroCarouselFrame>
      <HeroTrackShell onPrev={() => go(-1)} onNext={() => go(1)}>
        <div className="absolute inset-0 overflow-visible">
          {visible.map(({ slide, offset, idx }) => {
            const isCenter = offset === 0;
            return (
              <motion.div
                key={`${idx}-${slide.id}`}
                className="absolute left-0 top-0 h-full w-full"
                animate={{
                  x: heroSideX(offset),
                  scale: isCenter ? 1 : 0.88,
                  opacity: isCenter ? 1 : 0.42,
                  zIndex: isCenter ? 10 : 5,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                style={{ pointerEvents: isCenter ? "auto" : "none" }}
              >
                <SlideStage slide={slide} isCenter={isCenter} />
              </motion.div>
            );
          })}
        </div>
      </HeroTrackShell>

      <HeroDots count={count} active={active} onSelect={setActive} />
    </HeroCarouselFrame>
  );
}

export function HeroCarousel({ slides, loading = false, error = null }: HeroCarouselProps) {
  if (loading) {
    return <HeroCarouselPlaceholder />;
  }

  if (slides.length === 0) {
    return <HeroCarouselPlaceholder message={error ?? "暂无轮播内容"} />;
  }

  return <HeroCarouselLoaded slides={slides} />;
}
