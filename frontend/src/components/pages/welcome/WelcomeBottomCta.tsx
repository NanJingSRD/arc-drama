import { useLocation } from "wouter";
import { WELCOME_SECTION_WIDE } from "./welcome-layout";

export function WelcomeBottomCta() {
  const [, navigate] = useLocation();

  return (
    <section className={`${WELCOME_SECTION_WIDE} py-10 sm:py-12`}>
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-cyan-600/90 via-teal-600/75 to-emerald-600/70 px-6 py-6 sm:px-8 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 100% 50%, oklch(1 0 0 / 0.12), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white sm:text-xl">为 AI 短剧协作而生</h2>
            <p className="mt-2 text-xs leading-relaxed text-white/75 sm:text-sm">
              智能蓝图 | 自由画布 | AI 协同创作 | 资产工厂 | 智能流水线
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/projects")}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-white/90 active:scale-[0.98] sm:self-center"
          >
            免费体验
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
