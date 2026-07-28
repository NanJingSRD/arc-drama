import { Clapperboard, Film, Scissors, Users } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

import { useAuthStore } from "@/stores/auth-store";
import type { FeatureItem } from "./welcome-data";
import { FEATURES, WELCOME_CTA_BUTTON } from "./welcome-data";
import { WELCOME_SECTION } from "./welcome-layout";

const ICONS = {
  canvas: Clapperboard,
  scissors: Scissors,
  film: Film,
  users: Users,
} as const;

function FeatureTab({
  feature,
  isActive,
  onSelect,
}: {
  feature: FeatureItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[feature.icon];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onSelect}
      className={`relative flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors duration-300 ${
        isActive
          ? "border-cyan-400/40 text-white"
          : "border-white/5 bg-white/2 text-white/80 hover:border-cyan-400/25 hover:bg-white/4"
      }`}
    >
      {isActive ? (
        <motion.span
          layoutId="welcome-feature-tab-bg"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl bg-linear-to-r from-[#2563eb] via-[#0891b2] to-[#059669] shadow-[0_0_24px_oklch(0.62_0.14_210/0.4),inset_0_1px_0_oklch(1_0_0/0.22)]"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-b from-white/20 via-white/5 to-transparent"
          />
        </motion.span>
      ) : null}

      <motion.div
        animate={{ scale: isActive ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isActive
            ? "radial-gradient(circle at 50% 60%, oklch(1 0 0 / 0.18), transparent 70%)"
            : `radial-gradient(circle at 50% 60%, ${feature.color} / 0.22, transparent 70%)`,
          boxShadow: isActive
            ? "0 0 18px oklch(1 0 0 / 0.12)"
            : `0 0 20px ${feature.color} / 0.15`,
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: isActive ? "white" : feature.color }}
        />
      </motion.div>

      <motion.span
        animate={{ opacity: isActive ? 1 : 0.85 }}
        className="relative text-[10px] font-medium leading-snug sm:text-[11px]"
      >
        {feature.title}
      </motion.span>
    </button>
  );
}

export function WelcomeCtaBar() {
  const [, navigate] = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openWorkspaceLogin = useAuthStore((s) => s.openWorkspaceLogin);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = FEATURES[activeIndex];

  const handleStartCreating = () => {
    if (isAuthenticated) {
      navigate("/app/projects");
      return;
    }
    openWorkspaceLogin("/app/projects");
  };

  return (
    <section className={`${WELCOME_SECTION} shrink-0 pb-2 pt-1.5 sm:pb-3 sm:pt-2 lg:max-w-[1400px] lg:pb-2.5 lg:pt-2 xl:pb-3 xl:pt-2.5`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e16]/95 backdrop-blur-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/8 via-transparent to-emerald-500/6"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-3 border-b border-white/6 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4 lg:gap-5 lg:px-5 lg:py-3">
          <div className="min-h-[3.25rem] text-center sm:min-h-[3.5rem] sm:text-left lg:min-h-[3rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  {activeFeature.headline}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-white/45 sm:text-sm">
                  {activeFeature.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            data-testid="start-creating-btn"
            onClick={handleStartCreating}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-lg bg-linear-to-r from-[#3b82f6] via-[#06b6d4] to-[#10b981] px-6 py-2 text-sm font-semibold text-white shadow-[0_0_28px_oklch(0.62_0.14_210/0.4)] transition hover:brightness-110 active:scale-[0.98] sm:self-auto"
          >
            {WELCOME_CTA_BUTTON}
            <span aria-hidden>→</span>
          </button>
        </div>

        <LayoutGroup id="welcome-feature-tabs">
          <div className="relative grid grid-cols-2 gap-2 p-3 sm:gap-2.5 sm:p-3.5 lg:grid-cols-4 lg:gap-2 lg:p-2.5 xl:p-3">
            {FEATURES.map((f, i) => (
              <FeatureTab
                key={f.id}
                feature={f}
                isActive={i === activeIndex}
                onSelect={() => setActiveIndex(i)}
              />
            ))}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
