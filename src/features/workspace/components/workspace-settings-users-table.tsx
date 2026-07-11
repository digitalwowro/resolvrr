"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHeadStaticCell,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { ManagedUser } from "@/features/user-management";

function displayName(user: ManagedUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function WorkspaceSettingsUsersTable({
  currentUserId,
  onDelete,
  onEdit,
  onResetPassword,
  pending,
  users,
}: {
  currentUserId: string;
  onDelete(user: ManagedUser): void;
  onEdit(user: ManagedUser): void;
  onResetPassword(user: ManagedUser): void;
  pending: boolean;
  users: ManagedUser[];
}) {
  return (
    <TableRoot>
      <Table>
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[24%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <TableHeader>
          <tr>
            <TableHeadStaticCell>Name</TableHeadStaticCell>
            <TableHeadStaticCell>Email</TableHeadStaticCell>
            <TableHeadStaticCell>Role</TableHeadStaticCell>
            <TableHeadStaticCell>Status</TableHeadStaticCell>
            <TableHeadStaticCell>Workspaces</TableHeadStaticCell>
            <TableHeadStaticCell>Created</TableHeadStaticCell>
            <TableHeadStaticCell>Actions</TableHeadStaticCell>
          </tr>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const protectedUser = user.id === currentUserId;
            const deactivated = user.status === "deactivated";
            return (
              <TableRow key={user.id}>
                <TableCell className="font-semibold text-slate-950">
                  {displayName(user)}
                </TableCell>
                <TableCell className="truncate text-slate-600">
                  {user.email}
                </TableCell>
                <TableCell className="text-slate-700">
                  {user.role === "ADMIN" ? "Admin" : "User"}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      deactivated
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {deactivated ? "Deactivated" : "Active"}
                  </span>
                </TableCell>
                <TableCell className="text-slate-700">
                  {user.workspaceAccessCount}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formattedDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      aria-label={`Edit ${displayName(user)}`}
                      disabled={pending || deactivated}
                      icon={<Pencil aria-hidden="true" className="size-4" />}
                      onClick={() => onEdit(user)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    />
                    <Button
                      aria-label={`Reset password for ${displayName(user)}`}
                      disabled={pending || deactivated}
                      icon={<RotateCcw aria-hidden="true" className="size-4" />}
                      onClick={() => onResetPassword(user)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    />
                    <Button
                      aria-label={`Delete ${displayName(user)}`}
                      disabled={pending || protectedUser}
                      icon={<Trash2 aria-hidden="true" className="size-4" />}
                      onClick={() => onDelete(user)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableRoot>
  );
}
