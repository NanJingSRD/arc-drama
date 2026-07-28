import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  WS2_NODE_BODY_CLASS,
  WS2_NODE_BODY_INNER_CLASS,
  WS2_NODE_TITLE_ACCENT_CLASS,
  WS2_NODE_TITLE_CLASS,
  WS2_NODE_TOOLBAR_CLASS,
} from "../workspace-v2-theme";

interface Ws2NodeContentLayoutProps {
  /** 当前流程节点标题，展示在内容区顶部 */
  title?: string;
  /** 标题右侧说明（与标题同行，靠左排列） */
  titleAside?: ReactNode;
  /** 与标题同行、靠右的操作区 */
  titleAction?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 不渲染主体内嵌边框/背景（如剧情导入） */
  plainBody?: boolean;
  /** 默认 true：主体内层可滚动；表格等需自行撑满时可设为 false */
  scrollBody?: boolean;
  bodyInnerClassName?: string;
}

function Ws2NodeTitle({
  children,
  aside,
  action,
}: {
  children: ReactNode;
  aside?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 px-0.5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
          <span aria-hidden className={WS2_NODE_TITLE_ACCENT_CLASS} />
          <h2 className={WS2_NODE_TITLE_CLASS}>{children}</h2>
        </div>
        {aside ? <div className="min-w-0 flex-1">{aside}</div> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}

export function Ws2NodeContentLayout({
  title,
  titleAside,
  titleAction,
  toolbar,
  children,
  className,
  bodyClassName,
  plainBody = false,
  scrollBody = true,
  bodyInnerClassName,
}: Ws2NodeContentLayoutProps) {
  const hasHeader = Boolean(title || titleAction || toolbar);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {hasHeader ? (
        <div className={cn("shrink-0 space-y-3", toolbar ? null : "mb-1")}>
          {title ? (
            <Ws2NodeTitle action={titleAction} aside={titleAside}>
              {title}
            </Ws2NodeTitle>
          ) : null}
          {!title && titleAction ? <div className="flex justify-end px-0.5">{titleAction}</div> : null}
          {toolbar ? (
            <div className={cn(WS2_NODE_TOOLBAR_CLASS, "flex items-center justify-between gap-4")}>
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          plainBody
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : WS2_NODE_BODY_CLASS,
          hasHeader ? "mt-3" : null,
          bodyClassName,
        )}
      >
        {scrollBody ? (
          <div className={cn(WS2_NODE_BODY_INNER_CLASS, bodyInnerClassName)}>{children}</div>
        ) : (
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden p-3", bodyInnerClassName)}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
