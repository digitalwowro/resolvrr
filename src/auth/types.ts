export type AuthUserRole = "USER" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarDataUrl: string | null;
  role: AuthUserRole;
};

export type AuthSessionRecord = {
  user: AuthUser;
  expiresAt: Date;
};

export type AuthFailureCode =
  | "invalid_credentials"
  | "invalid_registration"
  | "email_taken";

export type AuthSuccess = {
  ok: true;
  user: AuthUser;
  sessionToken: string;
  expiresAt: Date;
};

export type AuthFailure = {
  ok: false;
  code: AuthFailureCode;
};

export type AuthResult = AuthSuccess | AuthFailure;
