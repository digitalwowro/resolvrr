export type HelpdeskConnectionMessageCode =
  | "created"
  | "updated"
  | "validated"
  | "enabled"
  | "disabled"
  | "active-set"
  | "deleted"
  | "invalid-input"
  | "unknown-provider"
  | "unknown-credential-scheme"
  | "credential-required"
  | "connection-not-found"
  | "invalid-base-url"
  | "provider-validation-failed";

const messages: Record<HelpdeskConnectionMessageCode, string> = {
  created: "Workspace connected.",
  updated: "Workspace updated.",
  validated: "Workspace connection validated.",
  enabled: "Workspace enabled.",
  disabled: "Workspace disabled.",
  "active-set": "Active workspace updated.",
  deleted: "Workspace deleted.",
  "invalid-input": "Check the form fields and try again.",
  "unknown-provider": "Choose a supported helpdesk provider.",
  "unknown-credential-scheme": "Choose a supported credential method.",
  "credential-required": "Enter all credential fields or leave them all blank.",
  "connection-not-found": "Workspace was not found.",
  "invalid-base-url": "Enter a public HTTPS helpdesk URL.",
  "provider-validation-failed": "The helpdesk provider could not validate this connection.",
};

export function helpdeskConnectionMessage(
  code: string | string[] | undefined,
): string | null {
  if (typeof code !== "string" || !(code in messages)) {
    return null;
  }

  return messages[code as HelpdeskConnectionMessageCode];
}

export function connectionMessagePath(
  path: string,
  kind: "success" | "error",
  code: HelpdeskConnectionMessageCode,
): string {
  return `${path}?${kind}=${encodeURIComponent(code)}`;
}
