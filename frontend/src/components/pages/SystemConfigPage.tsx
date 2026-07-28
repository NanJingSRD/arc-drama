
import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  AlertTriangle,
  ChevronLeft,
  Film,
  Languages,
  Plug,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { MediaModelSection } from "./settings/MediaModelSection";
import { ProviderSection } from "./ProviderSection";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_LABELS,
  type SupportedLanguage,
} from "@/i18n";
import {
  W3_ACCENT_BUTTON_STYLE,
  W3_HEADER_BAR_STYLE,
  W3_NAV_ACTIVE_CLS,
  W3_NAV_INACTIVE_CLS,
  W3_SIDEBAR_STYLE,
  WorkspacePageShell,
  w3KickerStyle,
} from "@/components/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsSection = "providers" | "media";

interface SectionDef {
  id: SettingsSection;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}

interface SectionGroup {
  kicker: string;
  items: SectionDef[];
}

// ---------------------------------------------------------------------------
// Sidebar navigation config — grouped by purpose
// ---------------------------------------------------------------------------

const SECTION_GROUPS: SectionGroup[] = [
  {
    kicker: "Configuration",
    items: [
      { id: "providers", labelKey: "dashboard:providers", Icon: Plug },
      { id: "media", labelKey: "dashboard:models", Icon: Film },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SystemConfigPage() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const [location, navigate] = useLocation();
  const search = useSearch();

  const activeSection = useMemo((): SettingsSection => {
    const section = new URLSearchParams(search).get("section");
    if (section === "media") return "media";
    return "providers";
  }, [search]);

  // 已隐藏的旧 section（agent / usage / api-keys / about）统一回退到供应商页
  useEffect(() => {
    const section = new URLSearchParams(search).get("section");
    if (
      section &&
      section !== "providers" &&
      section !== "media"
    ) {
      const params = new URLSearchParams(search);
      params.set("section", "providers");
      navigate(`${location}?${params.toString()}`, { replace: true });
    }
  }, [search, location, navigate]);

  const setActiveSection = (section: SettingsSection) => {
    const params = new URLSearchParams(search);
    params.set("section", section);
    navigate(`${location}?${params.toString()}`, { replace: true });
  };

  const configIssues = useConfigStatusStore((s) => s.issues);
  const fetchConfigStatus = useConfigStatusStore((s) => s.fetch);

  useEffect(() => {
    void fetchConfigStatus();
  }, [fetchConfigStatus]);

  const currentLang = i18n.language.split("-")[0] as SupportedLanguage;
  const langDisplay =
    LANGUAGE_DISPLAY_LABELS[currentLang] ?? i18n.language;

  const cycleLang = () => {
    const idx = SUPPORTED_LANGUAGES.indexOf(currentLang);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % SUPPORTED_LANGUAGES.length;
    void i18n.changeLanguage(SUPPORTED_LANGUAGES[nextIdx]);
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <WorkspacePageShell fullHeight>
      {/* ─── Top bar ─── */}
      <header className="sticky top-0 z-30 shrink-0" style={W3_HEADER_BAR_STYLE}>
        <div className="mx-auto flex max-w-[1320px] items-center gap-5 px-6 py-4">
          <Link
            href="/app/projects"
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-hairline bg-bg-grad-a/50 px-2.5 py-1.5 text-[12px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={t("common:back")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t("common:back")}</span>
          </Link>
          <span aria-hidden className="h-5 w-px bg-hairline-soft" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={w3KickerStyle()}>
              Control Booth — {currentLang.toUpperCase()}
            </div>
            <h1
              className="font-editorial mt-0.5"
              style={{
                fontWeight: 400,
                fontSize: 26,
                lineHeight: 1.05,
                letterSpacing: "-0.012em",
                color: "var(--color-text)",
              }}
            >
              {t("common:settings")}
              <span className="ml-2 align-middle font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-text-3">
                {t("dashboard:system_config_title")}
              </span>
            </h1>
          </div>
          <button
            type="button"
            onClick={cycleLang}
            className="inline-flex items-center gap-2 rounded-[7px] border border-hairline bg-bg-grad-a/50 px-2.5 py-1.5 text-[12px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title={langDisplay}
            aria-label={t("dashboard:language_setting")}
          >
            <Languages className="h-3.5 w-3.5" />
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em]">
              {currentLang}
            </span>
          </button>
        </div>
      </header>

      {/* ─── Body: sidebar + content ─── */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav
          aria-label={t("common:settings")}
          className="w-[220px] shrink-0 overflow-y-auto px-3 py-5"
          style={W3_SIDEBAR_STYLE}
        >
          {SECTION_GROUPS.map((group, gi) => (
            <div key={group.kicker} className={gi > 0 ? "mt-5" : undefined}>
              <div className="mb-2 px-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-4">
                {group.kicker}
              </div>
              {group.items.map(({ id, labelKey, Icon }) => {
                const isActive = activeSection === id;
                const hasIssue =
                  (id === "providers" || id === "media") &&
                  configIssues.length > 0;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    aria-current={isActive ? "page" : undefined}
                    aria-pressed={isActive}
                    className={
                      "group mb-0.5 flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2 text-left text-[12.5px] transition-[color,box-shadow,background,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 motion-safe:hover:-translate-y-px " +
                      (isActive ? W3_NAV_ACTIVE_CLS : W3_NAV_INACTIVE_CLS)
                    }
                    style={isActive ? W3_ACCENT_BUTTON_STYLE : undefined}
                  >
                    <Icon
                      className={
                        "h-3.5 w-3.5 shrink-0 " +
                        (isActive ? "text-slate-100" : "text-text-3 group-hover:text-text-2")
                      }
                    />
                    <span className="flex-1 truncate">{t(labelKey)}</span>
                    {hasIssue && (
                      <span
                        aria-label={t("dashboard:config_incomplete")}
                        className="grid h-4 w-4 place-items-center rounded-full"
                        style={{
                          background: "oklch(0.30 0.10 25 / 0.22)",
                          color: "var(--color-warm-bright)",
                        }}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Content area — main is the scroll container.
            providers section bypasses the centered padded wrapper so its sticky bottom bar
            can truly hug the viewport edge (and sidebar can sticky-top across full height). */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {activeSection === "providers" ? (
            <ProviderSection />
          ) : (
            <div className="mx-auto max-w-4xl px-8 py-8">
              {/* Quick alert for config issues */}
              {configIssues.length > 0 && (
                <div
                  className="mb-7 rounded-[10px] border p-4"
                  style={{
                    borderColor: "var(--color-warm-ring)",
                    background: "var(--color-warm-tint)",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-warm-bright">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("dashboard:config_issues")}
                  </div>
                  <p className="mb-2.5 text-[12px] leading-[1.55] text-text-2">
                    {t("dashboard:config_issues_hint")}
                  </p>
                  <ul className="space-y-1.5">
                    {configIssues.map((issue, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-[12px] text-text-3"
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full"
                          style={{ background: "var(--color-warm)" }}
                        />
                        {t(`dashboard:${issue.label}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSection === "media" && <MediaModelSection />}
            </div>
          )}
        </main>
      </div>
    </WorkspacePageShell>
  );
}
