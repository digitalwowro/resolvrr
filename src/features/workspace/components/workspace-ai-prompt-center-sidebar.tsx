"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  AiPromptAdminView,
  UserAiRephraseStyleOverrideView,
  WorkspaceAiRephraseStyleView,
} from "@/features/ai";

export type PromptCenterSelection =
  | { id: string; type: "override" }
  | { id: string; type: "prompt" }
  | { id: string; type: "style" }
  | { type: "new-style" };

export function promptCenterSelectionKey(selection: PromptCenterSelection) {
  return selection.type === "new-style"
    ? "new-style"
    : `${selection.type}:${selection.id}`;
}

export function firstPromptCenterSelection(input: {
  canManageWorkspace: boolean;
  prompts: AiPromptAdminView[];
  styles: WorkspaceAiRephraseStyleView[];
  overrides: UserAiRephraseStyleOverrideView[];
}): PromptCenterSelection | undefined {
  if (input.canManageWorkspace) {
    if (input.prompts[0]) {
      return { id: input.prompts[0].key, type: "prompt" };
    }
    if (input.styles[0]) {
      return { id: input.styles[0].id, type: "style" };
    }
    return { type: "new-style" };
  }
  return input.overrides[0]
    ? { id: input.overrides[0].id, type: "override" }
    : undefined;
}

export function promptCenterSelectionExists(
  selection: PromptCenterSelection | undefined,
  input: {
    canManageWorkspace: boolean;
    prompts: AiPromptAdminView[];
    styles: WorkspaceAiRephraseStyleView[];
    overrides: UserAiRephraseStyleOverrideView[];
  },
) {
  if (!selection) {
    return false;
  }
  if (selection.type === "new-style") {
    return input.canManageWorkspace;
  }
  if (selection.type === "prompt") {
    return input.prompts.some((prompt) => prompt.key === selection.id);
  }
  if (selection.type === "style") {
    return input.styles.some((style) => style.id === selection.id);
  }
  return input.overrides.some((override) => override.id === selection.id);
}

export function PromptCenterSidebar({
  canManageWorkspace,
  onMoveStyle,
  onSelect,
  pending,
  prompts,
  selectedKey,
  styles,
  userOverrides,
}: {
  canManageWorkspace: boolean;
  onMoveStyle(styleId: string, direction: "down" | "up"): void;
  onSelect(selection: PromptCenterSelection): void;
  pending: boolean;
  prompts: AiPromptAdminView[];
  selectedKey?: string;
  styles: WorkspaceAiRephraseStyleView[];
  userOverrides: UserAiRephraseStyleOverrideView[];
}) {
  return (
    <div className="space-y-5">
      {canManageWorkspace ? (
        <>
          <SidebarGroup title="Workspace prompts">
            {prompts.map((prompt) => (
              <SidebarItem
                description={prompt.isCustomized ? "Custom" : "Default"}
                key={prompt.key}
                label={prompt.label}
                onSelect={() => onSelect({ id: prompt.key, type: "prompt" })}
                selected={selectedKey === `prompt:${prompt.key}`}
              />
            ))}
          </SidebarGroup>
          <SidebarGroup
            action={
              <Button
                icon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => onSelect({ type: "new-style" })}
                size="sm"
                type="button"
                variant="primary"
              >
                New style
              </Button>
            }
            title="Rephrase styles"
          >
            {styles.length > 0 ? (
              styles.map((style, index) => (
                <StyleSidebarItem
                  disabled={pending}
                  index={index}
                  key={style.id}
                  onMoveStyle={onMoveStyle}
                  onSelect={() => onSelect({ id: style.id, type: "style" })}
                  selected={selectedKey === `style:${style.id}`}
                  style={style}
                  stylesCount={styles.length}
                />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
                No rephrase styles yet.
              </p>
            )}
          </SidebarGroup>
        </>
      ) : null}
      {userOverrides.length > 0 ? (
        <SidebarGroup title="Personal overrides">
          {userOverrides.map((style) => (
            <SidebarItem
              description={style.isCustomized ? "Custom" : "Workspace default"}
              key={style.id}
              label={style.label}
              onSelect={() => onSelect({ id: style.id, type: "override" })}
              selected={selectedKey === `override:${style.id}`}
            />
          ))}
        </SidebarGroup>
      ) : null}
    </div>
  );
}

function SidebarGroup({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h4>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SidebarItem({
  description,
  label,
  onSelect,
  selected,
}: {
  description: string;
  label: string;
  onSelect(): void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`${label}, ${description}`}
      className={cn(
        "block w-full rounded-md border bg-white p-3 text-left text-sm",
        selected
          ? "border-indigo-300 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-slate-300",
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="block truncate font-medium text-slate-900">{label}</span>
      <span className="text-xs text-slate-500">{description}</span>
    </button>
  );
}

function StyleSidebarItem({
  disabled,
  index,
  onMoveStyle,
  onSelect,
  selected,
  style,
  stylesCount,
}: {
  disabled: boolean;
  index: number;
  onMoveStyle(styleId: string, direction: "down" | "up"): void;
  onSelect(): void;
  selected: boolean;
  style: WorkspaceAiRephraseStyleView;
  stylesCount: number;
}) {
  const source = style.isBuiltIn ? "Built-in" : "Custom";
  const state = style.isEnabled ? "Enabled" : "Disabled";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-white p-2 text-sm",
        selected
          ? "border-indigo-300 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-slate-300",
      )}
    >
      <button
        aria-label={`${style.label}, ${state}, ${source}`}
        className="min-w-0 flex-1 rounded px-1 py-1 text-left"
        onClick={onSelect}
        type="button"
      >
        <span className="block truncate font-medium text-slate-900">
          {style.label}
        </span>
        <span className="text-xs text-slate-500">
          {state} · {source}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1">
        <button
          aria-label={`Move ${style.label} up`}
          className="grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
          disabled={disabled || index === 0}
          onClick={() => onMoveStyle(style.id, "up")}
          type="button"
        >
          <ArrowUp aria-hidden="true" className="size-3.5" />
        </button>
        <button
          aria-label={`Move ${style.label} down`}
          className="grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
          disabled={disabled || index === stylesCount - 1}
          onClick={() => onMoveStyle(style.id, "down")}
          type="button"
        >
          <ArrowDown aria-hidden="true" className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
