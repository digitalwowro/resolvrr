"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LoadWorkspaceSavedViewsSettingsAction,
  SavedViewSettingsData,
} from "@/features/saved-views/settings-model";
import type { WorkspaceSettingsSection } from "./workspace-settings-types";

export function useSavedViewSettingsData({
  initialData,
  loadAction,
  onDataChange,
  section,
}: {
  initialData?: SavedViewSettingsData;
  loadAction?: LoadWorkspaceSavedViewsSettingsAction;
  onDataChange?(data: SavedViewSettingsData): void;
  section: WorkspaceSettingsSection;
}) {
  const [data, setData] = useState(initialData);
  const lookupRequested = useRef(false);

  useEffect(() => {
    if (section !== "views" || lookupRequested.current || !loadAction) return;
    lookupRequested.current = true;
    void loadAction()
      .then((loaded) => {
        setData(loaded);
        onDataChange?.(loaded);
      })
      .catch(() => {
        lookupRequested.current = false;
      });
  }, [loadAction, onDataChange, section]);

  return [data, setData] as const;
}
