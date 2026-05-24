import { z } from "zod";

export const zammadTicketSchema = z
  .object({
    id: z.number(),
    number: z.string(),
    title: z.string(),
    customer: z.string().nullish(),
    owner: z.string().nullish(),
    group: z.string().nullish(),
    state: z.string().nullish(),
    priority: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    pending_time: z.string().nullish(),
  })
  .passthrough();

export const zammadTicketListSchema = z.array(zammadTicketSchema);

const zammadStringListSchema = z.union([z.string(), z.array(z.string())]).nullish();

const zammadAttachmentSchema = z
  .object({
    id: z.number(),
    filename: z.string().nullish(),
    name: z.string().nullish(),
    size: z.number().nullish(),
    preferences: z.record(z.string(), z.string()).nullish(),
  })
  .passthrough();

export const zammadArticleSchema = z
  .object({
    id: z.number(),
    ticket_id: z.number(),
    type: z.string().nullish(),
    sender: z.string().nullish(),
    internal: z.boolean().default(false),
    created_by: z.string().nullish(),
    from: z.string().nullish(),
    to: zammadStringListSchema,
    cc: zammadStringListSchema,
    subject: z.string().nullish(),
    body: z.string().nullish(),
    created_at: z.string().nullish(),
    attachments: z.array(zammadAttachmentSchema).default([]),
  })
  .passthrough();

export const zammadArticleListSchema = z.array(zammadArticleSchema);

export type ZammadTicket = z.infer<typeof zammadTicketSchema>;
export type ZammadArticle = z.infer<typeof zammadArticleSchema>;
