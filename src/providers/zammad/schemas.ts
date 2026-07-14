import { z } from "zod";

const zammadNullableStringSchema = z.string().nullish();
const zammadIdSchema = z.union([z.number(), z.string()]).nullish();

const zammadNamedReferenceSchema = z
  .union([
    z.string(),
    z
      .object({
        id: z.number().optional(),
        name: zammadNullableStringSchema,
        name_last: zammadNullableStringSchema,
      })
      .passthrough(),
  ])
  .nullish();

export const zammadUserSchema = z
  .object({
    id: z.number().optional(),
    organization_id: zammadIdSchema,
    organization: zammadNamedReferenceSchema,
    firstname: zammadNullableStringSchema,
    lastname: zammadNullableStringSchema,
    fullname: zammadNullableStringSchema,
    name: zammadNullableStringSchema,
    display_name: zammadNullableStringSchema,
    displayName: zammadNullableStringSchema,
    email: zammadNullableStringSchema,
    login: zammadNullableStringSchema,
    active: z.boolean().optional(),
    group_ids: z.record(z.string(), z.array(z.string())).optional(),
  })
  .passthrough();

export const zammadUserListResponseSchema = z.array(zammadUserSchema);

const zammadExpandedUserReferenceSchema = z
  .union([z.string(), zammadUserSchema])
  .nullish();

export const zammadTicketSchema = z
  .object({
    id: z.number(),
    number: z.string(),
    title: z.string(),
    customer_id: zammadIdSchema,
    owner_id: zammadIdSchema,
    organization_id: zammadIdSchema,
    group_id: zammadIdSchema,
    state_id: zammadIdSchema,
    priority_id: zammadIdSchema,
    customer: zammadExpandedUserReferenceSchema,
    owner: zammadExpandedUserReferenceSchema,
    organization: zammadNamedReferenceSchema,
    group: zammadNamedReferenceSchema,
    state: zammadNamedReferenceSchema,
    priority: zammadNamedReferenceSchema,
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
    size: z.union([z.number(), z.string()]).nullish(),
    preferences: z.record(z.string(), z.unknown()).nullish(),
  })
  .passthrough();

export const zammadArticleSchema = z
  .object({
    id: z.number(),
    ticket_id: z.number(),
    type: z.string().nullish(),
    sender: z.string().nullish(),
    internal: z.boolean(),
    created_by_id: zammadIdSchema,
    created_by: zammadExpandedUserReferenceSchema,
    from: z.string().nullish(),
    to: zammadStringListSchema,
    cc: zammadStringListSchema,
    reply_to: zammadStringListSchema,
    subject: z.string().nullish(),
    message_id: z.string().nullish(),
    in_reply_to: z.string().nullish(),
    references: zammadStringListSchema,
    body: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    attachments: z.array(zammadAttachmentSchema).default([]),
  })
  .passthrough();

export const zammadArticleListSchema = z.array(zammadArticleSchema);

export const zammadEmailAddressSchema = z
  .object({
    email: z.string(),
    active: z.boolean().optional(),
  })
  .passthrough();

export const zammadEmailAddressListSchema = z.array(zammadEmailAddressSchema);

export const zammadGenericNamedAssetSchema = z
  .object({
    id: z.number().optional(),
    name: zammadNullableStringSchema,
  })
  .passthrough();

export const zammadGenericNamedAssetListResponseSchema = z.array(
  zammadGenericNamedAssetSchema,
);

export const zammadGroupSchema = zammadGenericNamedAssetSchema.extend({
  active: z.boolean().optional(),
});

export const zammadGroupListResponseSchema = z.array(zammadGroupSchema);

export const zammadOrganizationSchema = zammadGenericNamedAssetSchema.extend({
  active: z.boolean().optional(),
});

export const zammadAssetsSchema = z
  .object({
    Ticket: z.record(z.string(), zammadTicketSchema).optional(),
    TicketArticle: z.record(z.string(), zammadArticleSchema).optional(),
    User: z.record(z.string(), zammadUserSchema).optional(),
    Organization: z.record(z.string(), zammadOrganizationSchema).optional(),
    Group: z.record(z.string(), zammadGenericNamedAssetSchema).optional(),
    State: z.record(z.string(), zammadGenericNamedAssetSchema).optional(),
    TicketPriority: z.record(z.string(), zammadGenericNamedAssetSchema).optional(),
    Priority: z.record(z.string(), zammadGenericNamedAssetSchema).optional(),
  })
  .passthrough();

export const zammadFullTicketPayloadSchema = z
  .object({
    record_ids: z.array(z.union([z.number(), z.string()])).optional(),
    assets: zammadAssetsSchema,
    total_count: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const zammadTicketListResponseSchema = z.union([
  zammadTicketListSchema,
  zammadFullTicketPayloadSchema,
]);

export const zammadArticleListResponseSchema = z.union([
  zammadArticleListSchema,
  zammadFullTicketPayloadSchema,
]);

export type ZammadTicket = z.infer<typeof zammadTicketSchema>;
export type ZammadArticle = z.infer<typeof zammadArticleSchema>;
export type ZammadEmailAddress = z.infer<typeof zammadEmailAddressSchema>;
export type ZammadAssets = z.infer<typeof zammadAssetsSchema>;
export type ZammadGenericNamedAsset = z.infer<typeof zammadGenericNamedAssetSchema>;
export type ZammadGroup = z.infer<typeof zammadGroupSchema>;
export type ZammadOrganization = z.infer<typeof zammadOrganizationSchema>;
export type ZammadUser = z.infer<typeof zammadUserSchema>;
export type ZammadFullTicketPayload = z.infer<typeof zammadFullTicketPayloadSchema>;
