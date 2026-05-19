import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(12);

export type LoginInput = {
  email: string;
  password: string;
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
