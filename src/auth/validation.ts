import { z } from "zod";
import { Buffer } from "node:buffer";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(12);
const nameSchema = z
  .string()
  .trim()
  .max(80)
  .transform((value) => (value.length > 0 ? value : null));
const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const avatarMaxBytes = 512 * 1024;

export type LoginInput = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ProfileInput = {
  firstName: string | null;
  lastName: string | null;
};

export type AvatarInput = {
  avatarDataUrl: string;
};

type FileLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  size: number;
  type: string;
};

export function normalizeEmail(email: string): string {
  return emailSchema.parse(email);
}

export function isValidPassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function parseLoginInput(input: FormData | unknown): LoginInput | null {
  const source = input instanceof FormData ? Object.fromEntries(input) : input;
  const result = z
    .object({
      email: emailSchema,
      password: z.string().min(1),
    })
    .safeParse(source);

  return result.success ? result.data : null;
}

export function parseRegistrationInput(
  input: FormData | unknown,
): LoginInput | null {
  const source = input instanceof FormData ? Object.fromEntries(input) : input;
  const result = z
    .object({
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse(source);

  return result.success ? result.data : null;
}

export function parseProfileInput(input: FormData | unknown): ProfileInput | null {
  const source = input instanceof FormData ? Object.fromEntries(input) : input;
  const result = z
    .object({
      firstName: nameSchema,
      lastName: nameSchema,
    })
    .safeParse(source);

  return result.success ? result.data : null;
}

function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

export async function parseAvatarInput(
  input: FormData | unknown,
): Promise<AvatarInput | null> {
  if (!(input instanceof FormData)) {
    return null;
  }

  const avatar = input.get("avatar");
  if (
    !isFileLike(avatar) ||
    avatar.size <= 0 ||
    avatar.size > avatarMaxBytes ||
    !avatarMimeTypes.includes(avatar.type as (typeof avatarMimeTypes)[number])
  ) {
    return null;
  }

  const bytes = Buffer.from(await avatar.arrayBuffer());
  const base64 = bytes.toString("base64");
  return { avatarDataUrl: `data:${avatar.type};base64,${base64}` };
}

export function parseChangePasswordInput(
  input: FormData | unknown,
): ChangePasswordInput | null {
  const source = input instanceof FormData ? Object.fromEntries(input) : input;
  const result = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .refine((value) => value.newPassword === value.confirmPassword)
    .safeParse(source);

  return result.success
    ? {
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
      }
    : null;
}
