import { LayoutGroup, motion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";
import { Link, useLocation } from "wouter";
import { BRAND } from "@/branding";
import { useAuthStore } from "@/stores/auth-store";
import { publicAssetUrl } from "@/utils/app-base";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { SITE_HEADER_SHELL } from "@/utils/site-layout";
import { getActiveSiteNav, SITE_NAV_ITEMS, type SiteNavItem } from "@/utils/site-nav";
import { isWorkspaceNavItem } from "@/utils/workspace-auth";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function getHashSnapshot() {
  return window.location.hash;
}

function NavActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg bg-linear-to-r from-[#2563eb] via-[#0891b2] to-[#059669] shadow-[0_0_22px_oklch(0.62_0.14_210/0.45),inset_0_1px_0_oklch(1_0_0/0.28)]"
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-white/25 via-white/5 to-transparent"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent"
      />
    </motion.span>
  );
}

function SiteNavLink({
  href,
  label,
  isActive,
  compact = false,
  onClick,
  pillLayoutId,
}: {
  href: string;
  label: string;
  isActive: boolean;
  compact?: boolean;
  onClick?: () => void;
  pillLayoutId: string;
}) {
  const shellClass = `relative shrink-0 overflow-hidden rounded-lg transition-colors ${
    compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
  } ${
    isActive
      ? "font-semibold text-white hover:brightness-110"
      : "font-medium text-white/50 hover:bg-white/5 hover:text-white/90"
  }`;

  const labelNode = <span className="relative z-10">{label}</span>;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClass}>
        {isActive ? <NavActivePill layoutId={pillLayoutId} /> : null}
        {labelNode}
      </button>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {isActive ? <NavActivePill layoutId={pillLayoutId} /> : null}
      {labelNode}
    </Link>
  );
}

function HeaderNavItem({
  item,
  isActive,
  compact = false,
  pillLayoutId,
}: {
  item: SiteNavItem;
  isActive: boolean;
  compact?: boolean;
  pillLayoutId: string;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openWorkspaceLogin = useAuthStore((s) => s.openWorkspaceLogin);
  const [, navigate] = useLocation();

  const requiresAuth = isWorkspaceNavItem(item.id);

  const handleWorkspaceClick = () => {
    if (isAuthenticated) {
      navigate(item.href);
      return;
    }
    openWorkspaceLogin(item.href);
  };

  return (
    <SiteNavLink
      href={item.href}
      label={item.label}
      isActive={isActive}
      compact={compact}
      pillLayoutId={pillLayoutId}
      onClick={requiresAuth && !isAuthenticated ? handleWorkspaceClick : undefined}
    />
  );
}

export function AppSiteHeader() {
  const [pathname] = useLocation();
  const hash = useSyncExternalStore(subscribeHash, getHashSnapshot, () => "");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openWorkspaceLogin = useAuthStore((s) => s.openWorkspaceLogin);

  const activeNav = useMemo(
    () => getActiveSiteNav(pathname, hash),
    [pathname, hash],
  );

  return (
    <header
      data-testid="app-site-header"
      className="sticky top-0 z-50 border-b border-white/6 bg-[#06080f]/85 backdrop-blur-xl"
    >
      <div className={`relative flex h-14 items-center ${SITE_HEADER_SHELL}`}>
        <Link
          href="/app/home"
          className="relative z-10 flex shrink-0 items-center gap-2.5 text-white transition hover:opacity-90"
        >
          <img
            src={publicAssetUrl("srd-logo.png")}
            alt={BRAND.name}
            className="h-8 w-8 rounded-lg"
          />
          <span className="hidden text-base font-semibold tracking-tight sm:inline">
            ArcDrama - 星帧漫影
          </span>
        </Link>

        <LayoutGroup id="site-nav-desktop">
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:flex">
            {SITE_NAV_ITEMS.map((item) => (
              <HeaderNavItem
                key={item.id}
                item={item}
                isActive={activeNav === item.id}
                pillLayoutId="site-nav-active-pill"
              />
            ))}
          </nav>
        </LayoutGroup>

        <LayoutGroup id="site-nav-mobile">
          <nav className="relative z-10 flex flex-1 justify-end gap-1 overflow-x-auto md:hidden">
            {SITE_NAV_ITEMS.map((item) => (
              <HeaderNavItem
                key={item.id}
                item={item}
                isActive={activeNav === item.id}
                compact
                pillLayoutId="site-nav-active-pill-compact"
              />
            ))}
          </nav>
        </LayoutGroup>

        <div className="relative z-10 ml-auto flex shrink-0 items-center">
          {isAuthenticated ? (
            <HeaderUserMenu />
          ) : (
            <button
              type="button"
              data-testid="header-login-btn"
              onClick={() => openWorkspaceLogin()}
              className="rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-400/55 hover:bg-cyan-400/15 sm:text-sm"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
