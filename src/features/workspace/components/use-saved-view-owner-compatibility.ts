"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedViewCondition } from "@/core/saved-views";
import type { SavedViewSettingsData } from "@/features/saved-views/settings-model";
import { savedViewOwnerGroupScope } from "@/features/saved-views/owner-group-compatibility";
import { lookupWorkspaceAssignableUsersAction } from "@/features/tickets/lookup-actions";

export function useSavedViewOwnerCompatibility(
  conditions: SavedViewCondition[],
  data: SavedViewSettingsData,
) {
  const scope = useMemo(
    () => savedViewOwnerGroupScope(conditions, data.currentUser),
    [conditions, data.currentUser],
  );
  const groupKey = scope.groupExternalIds.join("\0");
  const [state, setState] = useState({
    groupKey: "",
    loading: false,
    options: data.ownerOptions,
    unavailable: false,
  });

  useEffect(() => {
    if (!groupKey) {
      return;
    }
    let current = true;
    void lookupWorkspaceAssignableUsersAction({
      groupExternalIds: groupKey.split("\0"),
    })
      .then((lookup) => {
        if (!current) return;
        setState({
          groupKey,
          loading: false,
          options: lookup.status === "available" ? lookup.options : [],
          unavailable: lookup.status !== "available",
        });
      })
      .catch(() => {
        if (current) {
          setState({ groupKey, loading: false, options: [], unavailable: true });
        }
      });
    return () => {
      current = false;
    };
  }, [data.ownerOptions, groupKey]);

  const stateMatchesScope = state.groupKey === groupKey;
  const displayedOptions = !groupKey
    ? data.ownerOptions
    : stateMatchesScope ? state.options : [];
  const loading = Boolean(groupKey) && (!stateMatchesScope || state.loading);
  const unavailable = Boolean(groupKey) && stateMatchesScope && state.unavailable;
  const eligibleIds = new Set(displayedOptions.map((option) => option.externalId));
  const incompatibleIds = groupKey && !loading && !unavailable
    ? scope.ownerExternalIds.filter((externalId) => !eligibleIds.has(externalId))
    : [];
  const message = unavailable
    ? "Owner eligibility could not be verified for the selected group."
    : scope.unresolvedMyself && groupKey
      ? "Your helpdesk identity could not be verified for the selected group."
      : incompatibleIds.length > 0
        ? "One or more selected owners do not have full access to the selected group."
        : undefined;

  return {
    data: { ...data, ownerOptions: displayedOptions },
    message,
    valid: !message,
    validating: loading,
  };
}
