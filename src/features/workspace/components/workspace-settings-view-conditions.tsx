"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, SearchableDropdown } from "@/components/ui";
import {
  type SavedViewCondition,
  type SavedViewConditionField,
  type SavedViewConditionOperator,
} from "@/core/saved-views";
import type { SavedViewSettingsData } from "@/features/saved-views/settings-model";
import {
  conditionOptions,
  conditionValueKey,
  conditionValueLabel,
  parseConditionValue,
} from "./workspace-settings-views-utils";

type ViewConditionsEditorProps = {
  conditions: SavedViewCondition[];
  data: SavedViewSettingsData;
  onConditionsChange(conditions: SavedViewCondition[]): void;
};

export function ViewConditionsEditor({
  conditions,
  data,
  onConditionsChange,
}: ViewConditionsEditorProps) {
  function addCondition() {
    const condition: SavedViewCondition = {
      id: `condition-${Date.now()}`,
      field: "state",
      operator: "is",
      values: [],
    };
    onConditionsChange([...conditions, condition].slice(0, 12));
  }

  function replaceCondition(index: number, condition: SavedViewCondition) {
    onConditionsChange(
      conditions.map((item, itemIndex) => (itemIndex === index ? condition : item)),
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Conditions</h4>
        <Button
          disabled={conditions.length >= 12}
          icon={<Plus aria-hidden="true" className="size-4" />}
          onClick={addCondition}
          type="button"
        >
          Add condition
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {conditions.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Add at least one condition to save this view.
          </p>
        ) : (
          conditions.map((condition, index) => {
            const options = conditionOptions(condition.field, data);
            return (
              <div
                className="grid items-start gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[9rem_8rem_minmax(0,1fr)_auto]"
                key={condition.id}
              >
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  onChange={(event) =>
                    replaceCondition(index, {
                      ...condition,
                      field: event.currentTarget.value as SavedViewConditionField,
                      values: [],
                    })
                  }
                  value={condition.field}
                >
                  <option value="owner">Owner</option>
                  <option value="state">State</option>
                  <option value="priority">Priority</option>
                  <option value="group">Group</option>
                </select>
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  onChange={(event) =>
                    replaceCondition(index, {
                      ...condition,
                      operator: event.currentTarget.value as SavedViewConditionOperator,
                    })
                  }
                  value={condition.operator}
                >
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                </select>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <SearchableDropdown
                    ariaLabel={`${condition.field} condition value`}
                    className="shrink-0"
                    emptyMessage="No values"
                    onValueChange={(value) => {
                      const option = options.find((item) => item.value === value);
                      const parsed = option
                        ? parseConditionValue(condition.field, value, option.label)
                        : undefined;
                      if (!parsed) {
                        return;
                      }
                      if (parsed.kind === "owner-preset" && parsed.value === "all") {
                        onConditionsChange(
                          conditions.filter((_item, itemIndex) => itemIndex !== index),
                        );
                        return;
                      }
                      replaceCondition(index, {
                        ...condition,
                        values: [
                          ...condition.values.filter(
                            (item) =>
                              conditionValueKey(item) !== conditionValueKey(parsed),
                          ),
                          parsed,
                        ].slice(0, 20),
                      });
                    }}
                    options={options}
                    placeholder="Add value"
                    searchPlaceholder="Find value"
                  />
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {condition.values.map((value) => (
                      <span
                        className="inline-flex h-6 items-center gap-1 rounded bg-slate-100 px-2 text-xs text-slate-700"
                        key={conditionValueKey(value)}
                      >
                        {conditionValueLabel(value)}
                        <button
                          aria-label={`Remove ${conditionValueLabel(value)}`}
                          onClick={() =>
                            replaceCondition(index, {
                              ...condition,
                              values: condition.values.filter(
                                (item) =>
                                  conditionValueKey(item) !== conditionValueKey(value),
                              ),
                            })
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  aria-label="Remove condition"
                  className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
                  onClick={() =>
                    onConditionsChange(
                      conditions.filter((_item, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
