# Connect Google Search Console to the admin panel (free)

The Blogs list shows a **Google** column (Indexed / Not indexed / Not checked, with 28-day clicks and impressions) once the server can read Search Console. It uses Google's free, read-only Search Console API.

1. **Google Cloud** (console.cloud.google.com): create or pick a project → *APIs & Services → Library* → enable **Google Search Console API**.
2. *IAM & Admin → Service accounts* → **Create service account** (no roles needed) → *Keys → Add key → JSON*. A `.json` file downloads. Keep it private.
3. **Search Console** → property `https://codinghubs.in/` → *Settings → Users and permissions → Add user* → paste the service account email (`…@….iam.gserviceaccount.com`) → permission **Restricted**.
4. Encode the key on one line: `base64 -i key.json | tr -d '\n'`.
5. **AWS SSM Parameter Store** (region ap-southeast-2) → create SecureString `/codinghubs/prod/GSC_SERVICE_ACCOUNT_B64` with that value. Optional: `/codinghubs/prod/GSC_PROPERTY` = `https://codinghubs.in/` (default) or `sc-domain:codinghubs.in` for a domain property.
6. Redeploy (any push to `main`), open *Blogs*, click **Refresh Google status**. Each click refreshes clicks/impressions for all posts and checks the index status of the 15 least recently checked posts (Google allows 2,000 inspections per day). From the server you can also run `python manage.py sync_search_console --limit 60`.

Notes: Search Console data lags by about two days; "Not indexed" shows Google's own reason on hover (for example "Discovered – currently not indexed"). Nothing is written to Search Console.
