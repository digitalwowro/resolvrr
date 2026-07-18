export const ticketSummarySchemaVersion = "ticket-summary-v2" as const;

export type TicketAiSummaryContent = {
  schemaVersion: typeof ticketSummarySchemaVersion;
  situation: string;
  timeline: Array<{
    date: string | null;
    event: string;
  }>;
  nextRisk: string | null;
};

export function ticketSummaryDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function ticketSummaryParagraphs(
  summary: TicketAiSummaryContent,
): string[] {
  return [
    "Situation",
    summary.situation,
    ...(summary.timeline.length > 0
      ? [
          "Timeline",
          ...summary.timeline.map((item) =>
            item.date
              ? `- ${ticketSummaryDisplayDate(item.date)}: ${item.event}`
              : `- ${item.event}`),
        ]
      : []),
    ...(summary.nextRisk ? ["Next Risk", summary.nextRisk] : []),
  ];
}
