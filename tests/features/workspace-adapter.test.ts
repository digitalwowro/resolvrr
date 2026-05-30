import { describe, expect, it, vi } from "vitest";
import type { TicketDetail, TicketListItem } from "@/core/tickets";
import {
  workspaceTicketDetail,
  workspaceTicketRows,
} from "@/features/tickets";

describe("workspace ticket adapter date formatting", () => {
  it("uses the shared workspace date/time format for rows and detail threads", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T12:00:00Z"));

    try {
      const ticket = {
        externalId: "ticket-1",
        number: "1001",
        title: "Cannot log in",
        customer: { name: "Maya Patel" },
        owner: { name: "Agent Smith" },
        group: { name: "Users" },
        state: "open",
        priority: "medium",
        createdAt: new Date("2025-12-31T23:30:00"),
        pendingUntil: new Date("2026-05-27T06:00:00"),
        updatedAt: new Date("2026-05-17T16:49:00"),
        tags: [],
      } satisfies TicketListItem;

      const row = workspaceTicketRows([ticket])[0];
      const detail = workspaceTicketDetail({
        ticket,
        thread: {
          ticketExternalId: "ticket-1",
          articles: [
            {
              externalId: "article-1",
              attachments: [
                {
                  externalId: "attachment-1",
                  fileName: "invoice.pdf",
                  contentType: "application/pdf",
                  byteSize: 2048,
                },
              ],
              author: { email: "maya@example.com", name: "Maya Patel" },
              createdAt: new Date("2026-05-27T06:00:00"),
              direction: "inbound",
              kind: "message",
              recipients: [
                {
                  channel: "to",
                  email: "agent@example.com",
                  name: "Agent Smith",
                },
                {
                  channel: "cc",
                  email: "lead@example.com",
                  name: "Team Lead",
                },
              ],
              sanitizedHtml: "<p>Hello</p>",
              visibility: "public",
            },
          ],
        },
        links: [
          {
            externalId: "ticket-2",
            direction: "related",
            label: "#1002 Webhook failed",
            providerUrl: "https://helpdesk.example.com/#ticket/zoom/2",
          },
        ],
        subscription: { supported: true, following: true },
        measuredAt: new Date("2026-05-25T12:00:00Z"),
      } satisfies TicketDetail);

      expect(row?.createdAt).toBe("Dec 31, 2025, 23:30");
      expect(row?.pendingTill).toBe("May 27, 06:00");
      expect(row?.updatedAt).toBe("May 17, 16:49");
      expect(detail.updatedAt).toBe("May 17, 16:49");
      expect(detail.articles[0]?.meta).toBe("May 27, 06:00");
      expect(detail.articles[0]?.from).toEqual({
        email: "maya@example.com",
        label: "Maya Patel",
      });
      expect(detail.articles[0]?.to).toEqual([
        { email: "agent@example.com", label: "Agent Smith" },
      ]);
      expect(detail.articles[0]?.cc).toEqual([
        { email: "lead@example.com", label: "Team Lead" },
      ]);
      expect(detail.articles[0]?.attachments).toEqual([
        {
          id: "attachment-1",
          fileName: "invoice.pdf",
          contentType: "application/pdf",
          byteSize: 2048,
        },
      ]);
      expect(detail.links).toEqual([
        {
          direction: "related",
          id: "ticket-2",
          label: "#1002 Webhook failed",
          providerUrl: "https://helpdesk.example.com/#ticket/zoom/2",
        },
      ]);
      expect(detail.subscription).toEqual({ supported: true, following: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
