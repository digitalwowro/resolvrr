# Authentication

Resolvrr uses native email/password authentication for the first release.

## User Flow

- `/` redirects signed-out users to `/login`.
- `/` redirects signed-in users to `/workspace`.
- `/login` signs in an existing user.
- `/register` creates a user account and signs the user in.
- `/workspace` is the protected placeholder route for signed-in users.
- Signing out deletes the server-side session and clears the session cookie.

## Security Behavior

- Passwords are hashed with Argon2id.
- Sessions are stored in SQL using a hashed session token.
- Expired sessions are rejected during current-user lookup.
- Expired session cleanup is available as a service helper for operations jobs.
- The browser receives only the `resolvrr_session` cookie.
- Login failures use a generic error message.
- Auth forms use server actions, not public JSON endpoints.

Password reset, email delivery, invites, external identity providers, and team
administration are not part of this slice.
