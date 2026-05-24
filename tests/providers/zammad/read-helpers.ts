import type { ProviderContext } from "@/core/providers";

export function providerContext(): ProviderContext {
  return {
    connection: {
      id: "connection-1",
      providerKey: "zammad",
      displayName: "Support",
      baseUrl: "https://helpdesk.example.com",
      status: "active",
    },
    credentialScheme: "basic-auth",
    credentialPayload: { username: "agent", password: "secret" },
    requestSecurity: { validatedAddresses: ["93.184.216.34"] },
  };
}

export const rawTicket = {
  id: 42,
  number: "42042",
  title: "Cannot log in",
  customer: "Maya Patel",
  owner: "Agent Smith",
  group: "Users",
  state: "open",
  priority: "3 high",
  created_at: "2026-05-22T10:00:00Z",
  updated_at: "2026-05-24T08:30:00Z",
  pending_time: null,
};

export const rawArticle = {
  id: 500,
  ticket_id: 42,
  type: "email",
  sender: "Customer",
  internal: false,
  created_by: "Maya Patel",
  from: "maya@example.com",
  to: "support@example.com",
  cc: null,
  subject: "Cannot log in",
  body: "<p>Hello <script>alert(1)</script>there</p>",
  created_at: "2026-05-24T08:31:00Z",
  attachments: [],
};
