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

Local: set `GOOGLE_CLIENT_IDS=<your-web-client-id>` in the untracked `backend/.env` and restart Django. The frontend obtains the public ID from `GET /api/auth/google/`; no frontend build-time secret is required.

Production uses the existing `/codinghubs/prod/` SSM Parameter Store → `infra/fetch-env.sh` → Docker environment path. Set `/codinghubs/prod/GOOGLE_CLIENT_IDS` to the Web client ID and redeploy/restart the backend using the existing deployment process. Do not put runtime credentials in tracked source.

Install backend requirements and apply the additive migration `accounts.0002` before serving the new backend. It adds a nullable, unique Google subject field without changing existing passwords or accounts.

Without a configured client ID, the page clearly reports Google sign-in as temporarily unavailable and keeps password login available. A blocked or failed Google script offers a retry. An absent client ID cannot be replaced by a generated or guessed value.

## Verification

- `DEBUG=1 python manage.py test apps.accounts --noinput`: account creation, repeat sign-in, account linking, disabled users, verified email checks, and real locally signed RSA tokens exercising issuer/audience/expiry/signature rejection.
- `npx playwright test --config playwright.home.config.ts google-login.spec.ts`: browser sign-in exchange, linking, SDK retry and missing-configuration states. The Google SDK and API responses are intercepted; these tests do not sign into a real Google account.
- A real Google-account sign-in on the production origin still requires the configured Web client ID and the Google Cloud settings above.
