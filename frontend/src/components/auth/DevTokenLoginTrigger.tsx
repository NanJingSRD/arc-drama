import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Wrench, X } from "lucide-react";
import { useLocation } from "wouter";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { DevTokenLoginPanel } from "@/components/auth/DevTokenLoginPanel";
import { useAuthStore } from "@/stores/auth-store";
import { lockBodyScroll } from "@/utils/body-scroll-lock";
import { WORKSPACE_REQUIRES_WECHAT_AUTH } from "@/utils/workspace-auth";

const PANEL_TRANSITION = { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };
const TRIGGER_SIZE = 36;
const TRIGGER_MARGIN = 12;
const DRAG_THRESHOLD_PX = 5;
const POS_STORAGE_KEY = "dev-token-trigger-pos";

function clampTriggerPos(x: number, y: number) {
  const maxX = Math.max(TRIGGER_MARGIN, window.innerWidth - TRIGGER_SIZE - TRIGGER_MARGIN);
  const maxY = Math.max(TRIGGER_MARGIN, window.innerHeight - TRIGGER_SIZE - TRIGGER_MARGIN);
  return {
    x: Math.min(Math.max(TRIGGER_MARGIN, x), maxX),
    y: Math.min(Math.max(TRIGGER_MARGIN, y), maxY),
  };
}

function defaultTriggerPos() {
  return clampTriggerPos(
    window.innerWidth - TRIGGER_SIZE - TRIGGER_MARGIN,
    window.innerHeight - TRIGGER_SIZE - TRIGGER_MARGIN,
  );
}

function readStoredTriggerPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return clampTriggerPos(parsed.x, parsed.y);
  } catch {
    return null;
  }
}

function DevTokenDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (token: string, username: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTargetRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    returnTargetRef.current = (document.activeElement as HTMLElement | null) ?? null;
  }, []);

  useEscapeClose(onClose, true);
  useFocusTrap(dialogRef, true, returnTargetRef);

  useLayoutEffect(() => {
    return lockBodyScroll();
  }, []);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-60 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 cursor-pointer border-0 bg-black/50"
        onClick={onClose}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Token 登录"
        tabIndex={-1}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={PANEL_TRANSITION}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#0c1018] p-5 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-white/40 transition hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        <DevTokenLoginPanel onSuccess={onSubmit} />
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** 开发环境隐藏入口：可拖拽扳手按钮，点击打开 token 登录 */
export function DevTokenLoginTrigger() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const login = useAuthStore((s) => s.login);
  const closeWeChatLogin = useAuthStore((s) => s.closeWeChatLogin);
  const wechatReturnTo = useAuthStore((s) => s.wechatReturnTo);
  const [, navigate] = useLocation();

  useEffect(() => {
    setPos(readStoredTriggerPos() ?? defaultTriggerPos());

    const onResize = () => {
      setPos((prev) => (prev ? clampTriggerPos(prev.x, prev.y) : defaultTriggerPos()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!import.meta.env.DEV && WORKSPACE_REQUIRES_WECHAT_AUTH) return null;
  if (!pos) return null;

  const handleSubmit = (token: string, username: string) => {
    login(token, username);
    closeWeChatLogin();
    setOpen(false);
    if (wechatReturnTo) navigate(wechatReturnTo);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      drag.moved = true;
    }
    if (drag.moved) {
      setPos(clampTriggerPos(drag.originX + dx, drag.originY + dy));
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const moved = drag.moved;
    dragRef.current = null;

    if (moved) {
      const next = clampTriggerPos(
        drag.originX + (event.clientX - drag.startX),
        drag.originY + (event.clientY - drag.startY),
      );
      setPos(next);
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
      return;
    }

    handleWrenchActivate();
  };

  const handleWrenchActivate = () => {
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        data-testid="dev-token-login-trigger"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        style={{ left: pos.x, top: pos.y, width: TRIGGER_SIZE, height: TRIGGER_SIZE }}
        className="fixed z-[51] grid cursor-grab touch-none place-items-center rounded-lg border border-cyan-300/70 bg-[linear-gradient(180deg,rgba(34,211,238,0.22),rgba(15,23,42,0.92))] text-cyan-200 shadow-[0_0_24px_-4px_rgba(34,211,238,0.75),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-[color,box-shadow,border-color] hover:border-cyan-200 hover:text-white hover:shadow-[0_0_28px_0_rgba(34,211,238,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 active:cursor-grabbing"
        aria-label="开发者 Token 登录"
        title="开发者 Token 登录（可拖拽）"
      >
        <Wrench className="h-4 w-4" aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <DevTokenDialog
            key="dev-token-dialog"
            onClose={() => setOpen(false)}
            onSubmit={handleSubmit}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
