import { sessionCookieName } from "./session";

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires: Date;
};

type SessionCookieConfig = {
  appBaseUrl?: string;
  nodeEnv?: string;
};

export function sessionCookieOptions(
  expires: Date,
  config: SessionCookieConfig = {},
): SessionCookieOptions {
  const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV;
  const appBaseUrl = config.appBaseUrl ?? process.env.APP_BASE_URL ?? "";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production" || appBaseUrl.startsWith("https://"),
    path: "/",
    expires,
  };
}

export function clearedSessionCookieOptions(): SessionCookieOptions {
  return sessionCookieOptions(new Date(0));
}

export { sessionCookieName };
