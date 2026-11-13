# Google sign-in for Coding Hubs

The login page uses the official Google Identity Services button. New Google users are registered automatically as ordinary students; returning users are matched by Google's immutable subject identifier. The backend verifies the token signature, issuer, expiry and allowed client IDs using `google-auth` before issuing the existing site JWTs.

Gmail/verified Workspace owners can connect an existing account with the matching email. For an existing account using a third-party email address, Google does not guarantee current ownership of that mailbox, so the user confirms their existing Coding Hubs password once before linking. An account already linked to a different Google identity is never silently reassigned. Disabled accounts remain blocked. No Gmail/Drive scopes or Google API access are requested.

## Required Google Cloud setup

1. In Google Cloud Console → Google Auth Platform, choose the project's audience as **External** if sign-in should be available beyond one Workspace organisation. Make the application available in production rather than limiting it to test users. Complete any branding/domain verification Google requires.
2. Create a client of type **Web application** under **Clients**.
3. Add these **Authorized JavaScript origins** as applicable: `https://codinghubs.in`, `https://www.codinghubs.in`, `http://localhost`, and `http://localhost:5173`. Origins contain no paths. This implementation uses the JavaScript callback, so it does not require a new redirect endpoint.
4. Set the application homepage to `https://codinghubs.in/` and privacy policy to `https://codinghubs.in/policies`. Use the real support email and verify the authorised domain as requested by Google.
5. Copy the public Web client ID ending in `.apps.googleusercontent.com`. No client secret is used by this flow.

Google's current instructions: [web client and branding setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [production branding and audience](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [server-side token verification and account linking](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Runtime configuration

The owner-supplied public Web client ID is configured as the application default in `backend/config/settings.py`. OAuth client IDs are public identifiers, not client secrets. To override it locally, set `GOOGLE_CLIENT_IDS=<your-web-client-id>` in the untracked `backend/.env` and restart Django. The frontend obtains the public ID from `GET /api/auth/google/`; no frontend build-time secret is required.

Production can override this public default through the existing `/codinghubs/prod/GOOGLE_CLIENT_IDS` SSM parameter → Docker environment path. A deliberately empty override disables Google sign-in. No client secret or private Google credential is stored in source.

Install backend requirements and apply the additive migration `accounts.0002` before serving the new backend. It adds a nullable, unique Google subject field without changing existing passwords or accounts.

Without a configured client ID, the page clearly reports Google sign-in as temporarily unavailable and keeps password login available. A blocked or failed Google script offers a retry. An absent client ID cannot be replaced by a generated or guessed value.

## Verification

- `DEBUG=1 python manage.py test apps.accounts --noinput`: account creation, repeat sign-in, account linking, disabled users, verified email checks, and real locally signed RSA tokens exercising issuer/audience/expiry/signature rejection.
- `npx playwright test --config playwright.home.config.ts google-login.spec.ts`: browser sign-in exchange, linking, SDK retry and missing-configuration states. The Google SDK and API responses are intercepted; these tests do not sign into a real Google account.
- A real Google-account sign-in on the production origin still requires the configured Web client ID and the Google Cloud settings above.

## Account photo and persistent browser session

Verified Google `picture` claims from HTTPS `*.googleusercontent.com` URLs populate the read-only `avatar_url` profile field. The shared header displays the photo with a name-initial fallback and a keyboard-accessible account disclosure: Profile, User Dashboard, Support and Logout. No separate referral feature is advertised.

The public React app requests `persistent: true` on password/Google login and registration. The server returns an access token and sets an opaque `ch_session` cookie (`HttpOnly`, `Secure` outside DEBUG, `SameSite=Lax`, path `/api/auth/`). Only its SHA-256 digest is stored in `accounts.LoginSession`; session secrets are never returned to JavaScript. Existing clients that omit this flag retain the original rotating JWT refresh API, including the admin application.

`POST /api/auth/session/` restores the profile and issues a short-lived access token. Cookie session operations require `X-Requested-With: XMLHttpRequest` and reject unexpected Origin headers; the existing CORS allowlist governs cross-origin preflights. Session records have no idle timeout. Browsers impose a finite cookie lifetime (400 days here), renewed on restore. Clearing browser cookies/storage also removes the browser's ability to remember the account.

Logout deletes the server session and cookie. Password reset and account deletion revoke all persistent sessions; disabled accounts cannot restore. The frontend keeps credentials during temporary network/5xx errors, retries revocation after an offline logout, and synchronizes account changes between tabs. Cached display data never grants backend access.

Deploy migration `accounts.0003_user_avatar_url_loginsession` before serving this version. Existing users receive the persistent cookie on their next login. Run `apps.accounts.test_sessions` and `e2e/account-menu.spec.ts` for cookie security/revocation, photo fallback, reload and mobile menu coverage.
