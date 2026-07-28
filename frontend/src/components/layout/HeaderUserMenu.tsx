import { LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { useAuthStore } from "@/stores/auth-store";

function UserAvatar({
  src,
  name,
  className = "h-8 w-8",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0) || "微";

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-linear-to-br from-[#2563eb] via-[#0891b2] to-[#059669] text-xs font-semibold text-white ${className}`}
    >
      {initial}
    </span>
  );
}

export function HeaderUserMenu() {
  const username = useAuthStore((s) => s.username) ?? "微信用户";
  const avatarUrl = useAuthStore((s) => s.avatarUrl);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        data-testid="header-user-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${username} 账户菜单`}
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-cyan-400/35 focus-visible:outline-none focus-visible:ring-cyan-400/50"
      >
        <UserAvatar src={avatarUrl} name={username} />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sideOffset={10}
        layer="modal"
        width="w-36"
        className="overflow-hidden rounded-lg border border-white/10 py-0.5 shadow-[0_12px_32px_oklch(0_0_0/0.4)]"
        style={{
          background: "oklch(0.14 0.01 265 / 0.98)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="border-b border-white/8 px-2.5 py-1.5">
          <p className="truncate text-xs font-medium text-white/90">{username}</p>
        </div>
        <button
          type="button"
          data-testid="header-logout-btn"
          role="menuitem"
          onClick={handleLogout}
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-white/70 transition hover:bg-white/6 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          退出登录
        </button>
      </Popover>
    </div>
  );
}
