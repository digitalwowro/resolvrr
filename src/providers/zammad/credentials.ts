import { z } from "zod";

export const zammadProviderKey = "zammad";
export const zammadBasicAuthScheme = "basic-auth";

export const zammadBasicAuthCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type ZammadBasicAuthCredentials = z.infer<
  typeof zammadBasicAuthCredentialsSchema
>;

export function normalizeZammadBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  if (parsed.pathname === "/api/v1") {
    parsed.pathname = "";
  } else if (parsed.pathname.endsWith("/api/v1")) {
    parsed.pathname = parsed.pathname.slice(0, -"/api/v1".length);
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function buildBasicAuthHeader(
  credentials: ZammadBasicAuthCredentials,
): string {
  const token = Buffer.from(
    `${credentials.username}:${credentials.password}`,
    "utf8",
  ).toString("base64");

  return `Basic ${token}`;
}
