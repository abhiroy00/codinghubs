# Free 2-Hour Live Session — Landing Page

Static single page (HTML + CSS + vanilla JS, no build step) built for Google Ads lead generation.

```
free-session/
├── index.html     page + all sections
├── styles.css     design (navy / blue / yellow)
├── app.js         form validation, submission, tracking, course filter, sticky CTA
├── config.js      ← EDIT THIS: institute details, session date/time, endpoint, tracking IDs
└── policies.html  Privacy / Cookies / Terms / Rescheduling (template text — review before launch)
```

## Before going live

1. **config.js** – set `institute.email`, `website`, social links, `session.date/time`.
2. **Form endpoint** – set `form.endpoint` (see below). Without it:
   - on `localhost` / `file://` the form runs in *demo mode* (shows success with a "not saved" note, no conversion fired);
   - on a real domain it shows an error — it never fakes success.
3. **Tracking** – fill `tracking.*` (GTM or GA4/Ads IDs, conversion label).
4. **Logo** – `img/logo.jpg` (copy of `img/coding-hub.jfif`). Replace that file to change it.
   **Demo videos** – put .mp4 files in `img/videos/` and list them in `videos.items` in config.js (src, title, duration).
5. **About / trainer text** – edit the blocks marked `<!-- EDIT -->`.
6. **Canonical URL** – uncomment and set the `<link rel="canonical">` in `index.html`.
7. **policies.html** – replace template text with reviewed policies.
8. Serve over **HTTPS** (any static host: Netlify, Vercel, Cloudflare Pages, cPanel).

## Form submission contract

`POST form.endpoint` with body (JSON by default):

```json
{
  "submission_id": "uuid (use for de-duplication / idempotency)",
  "name": "…", "phone": "+919876543210", "email": "…",
  "course": "Generative AI", "education": "", "whatsapp_consent": false,
  "session_date": "…", "session_time": "…",
  "page_url": "…", "referrer": "…", "submitted_at": "ISO date",
  "utm_source": "…", "utm_medium": "…", "utm_campaign": "…", "utm_term": "…", "utm_content": "…",
  "gclid": "…", "gbraid": "…", "wbraid": "…", "landing_page": "…"
}
```

Success = HTTP 2xx **and** the JSON body (if any) does not contain `ok:false`, `success:false`, `result:"error"` or `status:"error"`.
Only then is the thank-you state shown and the conversion fired.

**Keep secrets server-side.** If your CRM needs an API key, point `form.endpoint` at your own small server/serverless function (or a Zapier/Make webhook) that adds the key and forwards the lead. Validate + rate-limit there too; the browser-side checks (validation, honeypot, 24h duplicate guard) are only a first filter.

### Quick option: Google Sheets via Apps Script

1. New Google Sheet → Extensions → Apps Script → paste:

```js
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const cols = ['submitted_at','submission_id','name','phone','email','course','education','whatsapp_consent',
                  'utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','gbraid','wbraid','page_url','referrer'];
    if (sh.getLastRow() === 0) sh.appendRow(cols);
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1).getValues().flat() : [];
    if (!ids.includes(d.submission_id)) sh.appendRow(cols.map(c => d[c] ?? ''));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}
```

2. Deploy → New deployment → Web app → Execute as *Me*, access *Anyone* → copy URL.
3. In `config.js`: `endpoint: '<that URL>'`, `contentType: 'text/plain'`.

## Tracking events (dataLayer / GA4)

| Event | When |
|---|---|
| `cta_click` (`cta_location`, `course?`) | any Register / Join Free Session button click |
| `course_select` (`course`, `source`) | course picked from card or dropdown |
| `form_start` | first focus in the form |
| `form_error` / `form_submit_failed` | validation error / endpoint failure |
| `generate_lead` (`course`, `lead_id`) | **only after confirmed successful submission** |
| `virtual_pageview` (`page_path: …/thank-you`) | with the lead, for thank-you-page goals |
| `whatsapp_click` | WhatsApp button on thank-you state |
| `consent_update` | cookie banner choice |

- **Direct gtag**: set `ga4Id` and/or `adsId` + `adsConversionLabel`; the Ads conversion fires with `transaction_id = submission_id` (prevents double counting).
- **GTM**: set only `gtmId`; in GTM create a Custom Event trigger on `generate_lead` for your Google Ads Conversion + GA4 tags (use `{{DLV - lead_id}}` as transaction ID). Don't set `ga4Id/adsId` too, or you'll double count.
- **Consent Mode v2**: defaults to *denied* until the visitor accepts (`requireConsent: true`); `url_passthrough` keeps gclid attribution meanwhile. The banner only appears when a tracking ID is set.
- UTM params and gclid/gbraid/wbraid are stored for 90 days and sent with every lead, so you can also import offline conversions (admissions) into Google Ads later.

## Test checklist

- Every **Join Free Session** card button → scrolls to form with that course preselected.
- Header / hero / session / how-it-works / final / sticky CTAs → scroll to form.
- Empty submit → all required errors; `12345` / `5123456789` phone → error; `+91 98765 43210` → OK.
- Endpoint returns 500 → error message, no thank-you, no conversion.
- Same phone + course within 24h → "already registered" notice, no second submission.
- Mobile (≤ 999px): form appears right below the headline; sticky bar appears once the form is scrolled away.
