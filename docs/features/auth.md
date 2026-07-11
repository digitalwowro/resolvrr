# Authentication

Resolvrr uses native email/password authentication for the first release.

## User Flow

- `/` redirects signed-out users to `/login`.
- `/` redirects signed-in users to `/workspace`.
- `/login` signs in an existing user.
- `/register` creates a user account and signs the user in.
- `/workspace` is the protected placeholder route for signed-in users.
- Workspace Settings > My Profile shows the signed-in user's account email,
  role, avatar upload, editable first and last names, and password-change form.
- Admins can use Workspace Settings > Users to manage global users, reset
  passwords, assign workspace access, and grant workspace-level AI permissions.
- Signing out deletes the server-side session and clears the session cookie.

## Security Behavior

- Passwords are hashed with Argon2id.
- Sessions are stored in SQL using a hashed session token.
- Expired sessions are rejected during current-user lookup.
- Expired session cleanup is available as a service helper for operations jobs.
- Password changes require the current password, store a new Argon2id hash, and
  revoke the user's other active sessions while preserving the current session.
- Avatar uploads accept PNG, JPEG, or WebP files under 512 KB and store a
  validated data URL on the user record.
- Deactivated users cannot sign in. Existing sessions and password login are
  removed during deactivation.
- Removing a user never deletes helpdesk-provider replies or articles. If a
  user has provider mutation history, Resolvrr deactivates and scrubs the local
  user instead of hard-deleting it so mutation audit rows remain accountable.
- Users with no provider mutation history can be hard-deleted. If the user owns
  workspaces, an admin must transfer ownership before removal.
- The browser receives only the `resolvrr_session` cookie.
- Login failures use a generic error message.
- Auth forms use server actions, not public JSON endpoints.

Email delivery, invites, and external identity providers are not part of this
slice.
