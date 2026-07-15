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
  | "personal-connection-required"
  | "provider-identity-already-linked"
  | "identity-change-requires-reconnect"
  | "base-url-change-confirmation-required"
  | "invalid-base-url"
  | "provider-validation-failed"
  | "provider-auth-failed"
  | "provider-permission-denied"
  | "provider-rate-limited"
  | "provider-temporary-failure"
  | "provider-unexpected-response";

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
  "personal-connection-required": "Connect your own helpdesk account to use this workspace.",
  "provider-identity-already-linked":
    "This helpdesk identity is already connected to another Resolvrr user in this workspace.",
  "identity-change-requires-reconnect":
    "Disconnect first before connecting a different helpdesk identity.",
  "base-url-change-confirmation-required":
    "Confirm the helpdesk URL change. Every workspace member will need to reconnect.",
  "invalid-base-url": "Enter a public HTTPS helpdesk URL.",
  "provider-validation-failed": "The helpdesk provider could not validate this connection.",
  "provider-auth-failed": "The helpdesk credentials were rejected.",
  "provider-permission-denied":
    "The helpdesk account does not have permission to validate this workspace.",
  "provider-rate-limited": "The helpdesk provider is rate limiting validation.",
  "provider-temporary-failure":
    "The helpdesk provider could not be reached. Try again shortly.",
  "provider-unexpected-response":
    "The helpdesk provider returned an unexpected validation response.",
};

export function helpdeskConnectionMessage(
  code: string | string[] | undefined,
): string | null {
  if (typeof code !== "string" || !(code in messages)) {
    return null;
  }

  return messages[code as HelpdeskConnectionMessageCode];
}
