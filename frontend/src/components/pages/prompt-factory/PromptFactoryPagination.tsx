import { ChevronLeft, ChevronRight } from "lucide-react";

function buildPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push("ellipsis");
  for (let page = left; page <= right; page += 1) items.push(page);
  if (right < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

interface PromptFactoryPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function PromptFactoryPagination({
  page,
  totalPages,
  total,
  disabled = false,
  onPageChange,
}: PromptFactoryPaginationProps) {
  if (total <= 0) return null;

  const pageItems = buildPageItems(page, totalPages);

  return (
    <nav
      aria-label="模板分页"
      className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-[#0a0e14]/60 px-4 py-4 backdrop-blur-sm sm:flex-row sm:justify-between sm:px-5"
    >
      <p className="text-xs text-white/40">
        共 <span className="font-medium tabular-nums text-white/60">{total}</span> 条
        <span className="mx-1.5 text-white/20">·</span>
        第 <span className="font-medium tabular-nums text-white/60">{page}</span> /{" "}
        <span className="font-medium tabular-nums text-white/60">{totalPages}</span> 页
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="上一页"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-xs text-white/30"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`第 ${item} 页`}
              aria-current={item === page ? "page" : undefined}
              disabled={disabled}
              onClick={() => onPageChange(item)}
              className={`min-w-9 rounded-lg px-2.5 py-2 text-sm font-medium tabular-nums transition ${
                item === page
                  ? "border border-cyan-400/45 bg-cyan-400/15 text-cyan-200 shadow-[0_0_16px_oklch(0.62_0.14_210/0.25)]"
                  : "border border-transparent bg-transparent text-white/55 hover:border-white/10 hover:bg-white/5 hover:text-white/85"
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="下一页"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
