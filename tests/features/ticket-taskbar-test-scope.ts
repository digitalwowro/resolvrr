import type { TaskbarSyncRequest } from "@/features/taskbar-sync/model";

export const taskbarTestScope = {
  userId: "taskbar-user",
  workspaceId: "taskbar-workspace",
  helpdeskConnectionId: "taskbar-connection",
  identityVersion: "taskbar-identity",
};

export function taskbarTestActionArgs(request: TaskbarSyncRequest) {
  return [
    request,
    taskbarTestScope.helpdeskConnectionId,
    taskbarTestScope.identityVersion,
  ] as const;
}
