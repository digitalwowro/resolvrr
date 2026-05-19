export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }

  return "Email or password is incorrect.";
}

export function registrationErrorMessage(
  code: string | undefined,
): string | null {
  if (!code) {
    return null;
  }

  if (code === "email_taken") {
    return "An account already exists for that email.";
  }

  return "Enter a valid email and a password with at least 12 characters.";
}

export async function searchParamValue(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  key: string,
): Promise<string | undefined> {
  const params = await searchParams;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
