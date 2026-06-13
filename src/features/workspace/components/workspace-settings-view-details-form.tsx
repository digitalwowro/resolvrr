import type { Dispatch, ReactNode, SetStateAction } from "react";
import { DropdownSelect, SearchableDropdown, type DropdownOption } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  savedViewColorNames,
  savedViewTitleMaxLength,
  type SavedViewVisibility,
} from "@/core/saved-views";
import type { AuthUserRole } from "@/auth/types";
import type { SavedViewDraft } from "./workspace-settings-views-utils";
import { viewColorClass } from "./workspace-settings-views-utils";

const visibilityOptions: Array<DropdownOption & { value: SavedViewVisibility }> = [
  { value: "personal", label: "Personal" },
  { value: "shared", label: "Shared" },
];

type ViewDetailsFormProps = {
  draft: SavedViewDraft;
  iconOptions: {
    value: string;
    label: string;
    icon: ReactNode;
  }[];
  setDraft: Dispatch<SetStateAction<SavedViewDraft>>;
  userRole: AuthUserRole;
};

export function ViewDetailsForm({
  draft,
  iconOptions,
  setDraft,
  userRole,
}: ViewDetailsFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          maxLength={savedViewTitleMaxLength}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setDraft((current) => ({
              ...current,
              name: value,
            }));
          }}
          required
          value={draft.name}
        />
      </label>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Visibility</span>
        <DropdownSelect
          ariaLabel="Visibility"
          className="mt-1 block w-full [&>div]:w-full"
          disabled={userRole !== "ADMIN"}
          onValueChange={(value) => {
            const visibility = value as SavedViewVisibility;
            setDraft((current) => ({
              ...current,
              visibility,
            }));
          }}
          options={visibilityOptions}
          triggerClassName="h-10 w-full text-sm"
          value={draft.visibility}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-slate-700">Icon</span>
        <div className="mt-1">
          <SearchableDropdown
            ariaLabel="View icon"
            className="block w-full [&>div]:w-full"
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, iconName: value }))
            }
            options={iconOptions}
            searchPlaceholder="Find icon"
            triggerClassName="w-full"
            value={draft.iconName}
          />
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Custom icon</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          onChange={(event) => {
            const { value } = event.currentTarget;
            setDraft((current) => ({
              ...current,
              iconName: value,
            }));
          }}
          placeholder="briefcase-business"
          value={draft.iconName}
        />
      </label>
      <div>
        <span className="text-sm font-medium text-slate-700">Color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {savedViewColorNames.map((colorName) => (
            <button
              aria-label={`${colorName} view color`}
              className={cn(
                "grid size-7 place-items-center rounded border",
                draft.colorName === colorName
                  ? "border-slate-900"
                  : "border-slate-200",
              )}
              key={colorName}
              onClick={() => setDraft((current) => ({ ...current, colorName }))}
              type="button"
            >
              <span className={cn("size-4 rounded", viewColorClass[colorName])} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
