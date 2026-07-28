import type { ReactNode } from "react";
import { Search } from "lucide-react";
import {
  flattenWorkspaceV2StyleTemplates,
  type WorkspaceV2StyleTemplatesResult,
} from "@/api/workspace-v2";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeSelect } from "./ThemeSelect";
import {
  WS2_HOME_FILTER_LABEL_CLASS,
  WS2_HOME_FILTER_STRIP_CLASS,
  WS2_HOME_INPUT_CLASS,
  WS2_HOME_PANEL_CLASS,
  WS2_HOME_SELECT_TRIGGER_CLASS,
} from "./workspace-v2-home-theme";
import {
  WORKSPACE_V2_PROGRESS_LABELS,
  WORKSPACE_V2_PROGRESS_ORDER,
  type WorkspaceV2Progress,
} from "@/types/workspace-v2";
import { cn } from "@/lib/utils";

export interface WorkspaceV2Filters {
  keyword: string;
  progress: WorkspaceV2Progress | "";
  style: string;
}

interface FilterBarProps {
  filters: WorkspaceV2Filters;
  styleTemplates: WorkspaceV2StyleTemplatesResult | null;
  onChange: (patch: Partial<WorkspaceV2Filters>) => void;
  /** 嵌入统一面板时去掉外层卡片样式 */
  embedded?: boolean;
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="block min-w-0 flex-1 space-y-2">
      <Label htmlFor={htmlFor} className={WS2_HOME_FILTER_LABEL_CLASS}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FilterBar({ filters, styleTemplates, onChange, embedded = false }: FilterBarProps) {
  const progressOptions = [
    { value: "" as const, label: "全部状态" },
    ...WORKSPACE_V2_PROGRESS_ORDER.map((progress) => ({
      value: progress,
      label: WORKSPACE_V2_PROGRESS_LABELS[progress],
    })),
  ];

  const styleOptions = [
    { value: "", label: "全部风格" },
    ...(styleTemplates
      ? flattenWorkspaceV2StyleTemplates(styleTemplates).map((template) => ({
          value: template.id,
          label: template.name,
        }))
      : []),
  ];

  const fields = (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
      <FilterField label="项目/剧集名称搜索" htmlFor="ws2-keyword">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            id="ws2-keyword"
            type="search"
            value={filters.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            placeholder="请输入项目或剧集名称关键词搜索..."
            className={cn("pl-10", WS2_HOME_INPUT_CLASS)}
          />
        </div>
      </FilterField>

      <FilterField label="剧集状态" htmlFor="ws2-progress">
        <ThemeSelect
          id="ws2-progress"
          aria-label="剧集状态"
          value={filters.progress}
          onChange={(progress) => onChange({ progress })}
          options={progressOptions}
          placeholder="全部状态"
          triggerClassName={WS2_HOME_SELECT_TRIGGER_CLASS}
        />
      </FilterField>

      <FilterField label="视频风格" htmlFor="ws2-style">
        <ThemeSelect
          id="ws2-style"
          aria-label="视频风格"
          value={filters.style}
          onChange={(style) => onChange({ style })}
          options={styleOptions}
          placeholder="全部风格"
          triggerClassName={WS2_HOME_SELECT_TRIGGER_CLASS}
        />
      </FilterField>
    </div>
  );

  if (embedded) {
    return <div className={WS2_HOME_FILTER_STRIP_CLASS}>{fields}</div>;
  }

  return (
    <Card className={cn(WS2_HOME_PANEL_CLASS)}>
      <CardContent className="space-y-4 p-6">{fields}</CardContent>
    </Card>
  );
}
