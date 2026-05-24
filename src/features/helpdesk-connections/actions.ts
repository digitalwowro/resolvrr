"use server";

import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import {
  connectionMessagePath,
  type HelpdeskConnectionMessageCode,
} from "./messages";
import {
  createConnection,
  deleteConnection,
  setActiveConnection,
  setConnectionEnabled,
  updateConnection,
  validateConnection,
} from "./service";

const listPath = "/workspace/connections";

function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function redirectForResult(
  targetPath: string,
  result: { ok: boolean; code: HelpdeskConnectionMessageCode },
): never {
  redirect(connectionMessagePath(targetPath, result.ok ? "success" : "error", result.code));
}

export async function createHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await createConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    formData,
  );

  redirectForResult(result.ok ? listPath : `${listPath}/new`, result);
}

export async function updateHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const connectionId = textValue(formData, "connectionId");
  const result = await updateConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    connectionId,
    formData,
  );

  redirectForResult(
    result.ok ? listPath : `${listPath}/${encodeURIComponent(connectionId)}/edit`,
    result,
  );
}

export async function validateHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await validateConnection(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    textValue(formData, "connectionId"),
  );

  redirectForResult(listPath, result);
}

export async function setActiveHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await setActiveConnection(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
  );

  redirectForResult(listPath, result);
}

export async function enableHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await setConnectionEnabled(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
    true,
  );

  redirectForResult(listPath, result);
}

export async function disableHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await setConnectionEnabled(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
    false,
  );

  redirectForResult(listPath, result);
}

export async function deleteHelpdeskConnectionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = await deleteConnection(
    prismaHelpdeskConnectionsRepository,
    user.id,
    textValue(formData, "connectionId"),
  );

  redirectForResult(listPath, result);
}
