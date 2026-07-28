import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";
import { lockBodyScroll } from "@/utils/body-scroll-lock";

// ModalShell — 站内所有居中模态对话框的通用 primitive。
// 只负责：fixed inset 布局 + portal 出 body + role=dialog + focus trap + escape 关闭 +
// 可点 backdrop + 统一进出场过渡。视觉皮肤（玻璃 PANEL_BG / hairline / 圆角）由消费者在
// children 容器里自己套上去（典型消费者：GlassModal）。

interface ModalShellBaseProps {
  open: boolean;
  onClose: () => void;
  /** dialog 描述节点 id，绑定 aria-describedby */
  describedBy?: string;
  /** 点击 backdrop 是否关闭，默认 true。设为 false 时仅 Esc 与显式 onClose 关闭。 */
  closeOnBackdrop?: boolean;
  /** 启用 Esc 关闭，默认 true。loading 态可以传 false 防误触。 */
  closeOnEscape?: boolean;
  /** 容器额外 className，追加到 role=dialog 节点 */
  className?: string;
  /** 容器额外 inline style */
  style?: CSSProperties;
  /** Backdrop（黑底 + blur）的自定义样式，覆盖默认半透明遮罩 + blur(8px) */
  backdropStyle?: CSSProperties;
  children: ReactNode;
}

// 类型层强制提供 accessible name：必传 labelledBy（dialog 标题节点 id）或 ariaLabel
// 二选一，避免遗漏导致渲染出无名 role="dialog"。
type ModalShellA11yProps =
  | { labelledBy: string; ariaLabel?: never }
  | { labelledBy?: never; ariaLabel: string };

export type ModalShellProps = ModalShellBaseProps & ModalShellA11yProps;

const DEFAULT_BACKDROP_STYLE: CSSProperties = {
  background: "oklch(0 0 0 / 0.55)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

/** 与 ImageLightbox / VideoLightbox 一致的缓动 */
const MODAL_EASE = [0.22, 1, 0.36, 1] as const;

// 模块级 body overflow 引用计数：避免叠加弹窗时先关掉的实例
// 把 body.overflow 还原成可滚动，而仍打开的实例下背景却能滚。
// 见 @/utils/body-scroll-lock

export function ModalShell(props: ModalShellProps) {
  const {
    open,
    onClose,
    describedBy,
    closeOnBackdrop = true,
    closeOnEscape = true,
    className,
    style,
    backdropStyle,
    children,
  } = props;
  // discriminated union 下不能同时解构两者，分开读
  const labelledBy = "labelledBy" in props ? props.labelledBy : undefined;
  const ariaLabel = "ariaLabel" in props ? props.ariaLabel : undefined;
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  /** 退场动画期间保持挂载，避免 open=false 时瞬间消失 */
  const [present, setPresent] = useState(open);
  // open 边沿同步拉起 present，避免晚一拍导致 dialog 未挂载、focus trap 空跑
  if (open && !present) {
    setPresent(true);
  }

  // 在 open 从 false → true 的边沿用 useLayoutEffect 抓 document.activeElement。
  // React 的提交后顺序是：layout effects（bottom-up）→ paint → useEffects（bottom-up）。
  // 父组件的 layout effect 跑在所有 useEffect 之前，所以即使子组件（如
  // AssetFormModal）随后在 useEffect 里调 nameRef.current?.focus()，此刻
  // activeElement 仍是 modal 打开前真正的触发节点。直接读 useEffect 会拿到
  // 已被子组件抢焦的输入框，关闭后 focus 一个即将卸载的节点 → 焦点丢到 body。
  const returnTargetRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    returnTargetRef.current = (document.activeElement as HTMLElement | null) ?? null;
  }, [open]);

  useEscapeClose(onClose, open && closeOnEscape);
  useFocusTrap(
    dialogRef,
    open,
    returnTargetRef,
  );

  useLayoutEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!present) return null;

  const composedClassName = cn(
    "relative max-w-[96vw] outline-none",
    className,
  );

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!open) setPresent(false);
      }}
    >
      {open ? (
        <motion.div
          key="modal-shell"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={false}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: MODAL_EASE }}
        >
          {/* 遮罩先行淡入虚化，再弹出面板，避免「先出框、后虚化」 */}
          <motion.div
            data-testid="modal-backdrop"
            aria-hidden="true"
            onClick={closeOnBackdrop ? onClose : undefined}
            className={`absolute inset-0 ${closeOnBackdrop ? "cursor-pointer" : "cursor-default"}`}
            style={backdropStyle ?? DEFAULT_BACKDROP_STYLE}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: MODAL_EASE }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            aria-label={!labelledBy ? ariaLabel : undefined}
            className={composedClassName}
            style={style}
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: MODAL_EASE,
              delay: reduceMotion ? 0 : 0.06,
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
