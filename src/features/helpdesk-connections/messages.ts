export type HelpdeskConnectionMessageCode =
  | "created"
  | "updated"
  | "validated"
  | "disabled"
  | "active-set"
  | "deleted"
  | "invalid-input"
  | "unknown-provider"
  | "provider-mismatch"
  | "unknown-credential-scheme"
  | "credential-required"
  | "connection-not-found"
  | "connection-not-active"
  | "invalid-base-url"
  | "provider-validation-failed";

const messages: Record<HelpdeskConnectionMessageCode, string> = {
  created: "Workspace connected.",
  updated: "Workspace updated.",
  validated: "Workspace connection validated.",
  disabled: "Workspace disabled.",
  "active-set": "Active workspace updated.",
  deleted: "Workspace deleted.",
  "invalid-input": "Check the form fields and try again.",
  "unknown-provider": "Choose a supported helpdesk provider.",
  "provider-mismatch": "The submitted provider does not match this workspace.",
  "unknown-credential-scheme": "Choose a supported credential method.",
  "credential-required": "Enter all credential fields or leave them all blank.",
  "connection-not-found": "Workspace was not found.",
  "connection-not-active": "Validate this workspace before setting it active.",
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
