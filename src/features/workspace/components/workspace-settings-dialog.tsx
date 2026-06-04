"use client";

import { Eye, Settings, User, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/classnames";
import type { AuthUserRole } from "@/auth/types";
import type {
  ConnectionProviderOption,
  HelpdeskConnectionFormAction,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";
import type {
  DeleteWorkspaceSavedViewAction,
  LoadWorkspaceSavedViewsSettingsAction,
  ReorderWorkspaceSavedViewsAction,
  SaveWorkspaceSavedViewAction,
  SavedViewSettingsData,
  SetDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/settings-model";
import { WorkspacesSection } from "./workspace-settings-workspaces-section";
import { ViewsSection } from "./workspace-settings-views-section";

export type WorkspaceSettingsSection = "profile" | "workspaces" | "views";

type WorkspaceSettingsDialogProps = {
  connections: WorkspaceSettingsConnection[];
  createConnectionAction?: HelpdeskConnectionFormAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  deleteSavedViewAction?: DeleteWorkspaceSavedViewAction;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  initialSection: WorkspaceSettingsSection;
  initialSavedViewData?: SavedViewSettingsData;
  loadSavedViewsSettingsAction?: LoadWorkspaceSavedViewsSettingsAction;
  onClose(): void;
  onSavedViewDataChange?(data: SavedViewSettingsData): void;
  providerOptions: ConnectionProviderOption[];
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  setActiveConnectionAction?: HelpdeskConnectionFormAction;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  updateConnectionAction?: HelpdeskConnectionFormAction;
  userEmail: string;
  userRole: AuthUserRole;
  validateConnectionAction?: HelpdeskConnectionFormAction;
};

function sectionButtonClass(active: boolean) {
  return cn(
    "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm",
    active
      ? "bg-indigo-50 font-semibold text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  );
}

export function WorkspaceSettingsDialog({
  connections: initialConnections,
  createConnectionAction,
  deleteConnectionAction,
  deleteSavedViewAction,
  disableConnectionAction,
  initialSection,
  initialSavedViewData,
  loadSavedViewsSettingsAction,
  onClose,
  onSavedViewDataChange,
  providerOptions,
  reorderSavedViewsAction,
  saveSavedViewAction,
  setActiveConnectionAction,
  setDefaultSavedViewAction,
  updateConnectionAction,
  userEmail,
  userRole,
  validateConnectionAction,
}: WorkspaceSettingsDialogProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [section, setSection] = useState<WorkspaceSettingsSection>(initialSection);
  const [connections, setConnections] = useState(initialConnections);
  const [savedViewData, setSavedViewData] = useState(initialSavedViewData);

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timeoutId = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      restoreFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (section !== "views" || savedViewData || !loadSavedViewsSettingsAction) {
      return;
    }
    void loadSavedViewsSettingsAction().then((data) => {
      setSavedViewData(data);
      onSavedViewDataChange?.(data);
    });
  }, [loadSavedViewsSettingsAction, onSavedViewDataChange, savedViewData, section]);

  function applySavedViewData(data: SavedViewSettingsData) {
    setSavedViewData(data);
    onSavedViewDataChange?.(data);
  }

  if (typeof document === "undefined") {
    return null;
  }

  const dialog = (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex h-[90vh] w-[90vw] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        role="dialog"
      >
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-950" id={titleId}>
              Settings
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500">{userEmail}</p>
          </div>
          <nav className="flex-1 space-y-1 p-3" aria-label="Settings sections">
            <button
              className={sectionButtonClass(section === "profile")}
              onClick={() => setSection("profile")}
              type="button"
            >
              <User aria-hidden="true" className="size-4" />
              My Profile
            </button>
            <button
              className={sectionButtonClass(section === "workspaces")}
              onClick={() => setSection("workspaces")}
              type="button"
            >
              <Settings aria-hidden="true" className="size-4" />
              Workspaces
            </button>
            <button
              className={sectionButtonClass(section === "views")}
              onClick={() => setSection("views")}
              type="button"
            >
              <Eye aria-hidden="true" className="size-4" />
              Views
            </button>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-end border-b border-slate-200 px-4">
            <button
              aria-label="Close settings"
              className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          {section === "profile" ? (
            <section className="min-h-0 flex-1 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-950">My Profile</h3>
            </section>
          ) : section === "workspaces" ? (
            <WorkspacesSection
              connections={connections}
              createConnectionAction={createConnectionAction}
              deleteConnectionAction={deleteConnectionAction}
              disableConnectionAction={disableConnectionAction}
              onConnectionsChange={setConnections}
              providerOptions={providerOptions}
              setActiveConnectionAction={setActiveConnectionAction}
              updateConnectionAction={updateConnectionAction}
              validateConnectionAction={validateConnectionAction}
            />
          ) : (
            <ViewsSection
              key={savedViewData ? "views-ready" : "views-loading"}
              data={savedViewData}
              deleteSavedViewAction={deleteSavedViewAction}
              onDataChange={applySavedViewData}
              reorderSavedViewsAction={reorderSavedViewsAction}
              saveSavedViewAction={saveSavedViewAction}
              setDefaultSavedViewAction={setDefaultSavedViewAction}
              userRole={userRole}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
