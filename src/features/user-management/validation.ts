import { z } from "zod";
import {
  type DeleteManagedUserRequest,
  type ResetManagedUserPasswordRequest,
  type SaveManagedUserRequest,
} from "./model";

const emailSchema = z.string().trim().toLowerCase().email();
const nameSchema = z
  .string()
  .trim()
  .max(80)
  .transform((value) => (value ? value : null))
  .nullable();
const passwordSchema = z.string().min(12);
const membershipSchema = z.object({
  canEditAiRephraseStyleOverrides: z.boolean(),
  canEditMyStyle: z.boolean(),
  workspaceId: z.string().min(1),
  role: z.enum(["ADMIN", "AGENT"]),
});

export function parseSaveManagedUserRequest(
  input: unknown,
): SaveManagedUserRequest | null {
  const result = z
    .object({
      email: emailSchema,
      firstName: nameSchema,
      lastName: nameSchema,
      memberships: z.array(membershipSchema),
      password: z.string().optional(),
      role: z.enum(["ADMIN", "USER"]),
      userId: z.string().min(1).optional(),
    })
    .superRefine((value, context) => {
      if (!value.userId && !passwordSchema.safeParse(value.password).success) {
        context.addIssue({
          code: "custom",
          path: ["password"],
          message: "Password is required for new users.",
        });
      }
    })
    .safeParse(input);

  return result.success ? result.data : null;
}

export function parseResetManagedUserPasswordRequest(
  input: unknown,
): ResetManagedUserPasswordRequest | null {
  const result = z
    .object({
      password: passwordSchema,
      userId: z.string().min(1),
    })
    .safeParse(input);

  return result.success ? result.data : null;
}

export function parseDeleteManagedUserRequest(
  input: unknown,
): DeleteManagedUserRequest | null {
  const result = z
    .object({
      replacementOwners: z.record(z.string().min(1), z.string().min(1)).optional(),
      userId: z.string().min(1),
    })
    .safeParse(input);

  return result.success ? result.data : null;
}
