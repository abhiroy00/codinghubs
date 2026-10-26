# Coding Hubs School of AI — React + DRF

Full rewrite of the original static HTML site as:

- **`backend/`** — Django 5 + Django REST Framework. JWT auth, course catalog,
  lead capture, and Razorpay-powered course enrollment payments.
- **`frontend/`** — React 19 + Vite + TypeScript. Home/FAQ/Policies are
  pixel-matched to the original marketing site; `/free-session` is a separate
  ported landing page with its own scoped design.

**Live deployment:** every push to `main` auto-deploys to AWS via GitHub Actions
(Docker images on ECR, running on a single EC2 instance, no SSH / no standing
AWS credentials in CI). See [DEPLOY.md](DEPLOY.md) for the infrastructure
details and what's left before going live with real payments.

## Running it locally

**Backend** (Django, port 8000):

```bash
cd backend
.venv/Scripts/activate        # already created; or: python -m venv .venv
pip install -r requirements.txt
cp .env.example .env          # fill in Razorpay keys (see below)
python manage.py migrate
python manage.py seed_courses # seeds categories/courses with PLACEHOLDER prices
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

**Frontend** (Vite, port 5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## Razorpay setup (required for payments to work)

1. Create a [Razorpay](https://dashboard.razorpay.com/) account, switch to **Test Mode**.
2. Copy the test **Key ID** and **Key Secret** into `backend/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```
3. Put the same Key ID in `frontend/.env` as `VITE_RAZORPAY_KEY_ID`.
4. For the webhook fallback (`/api/payments/webhook/`): in the Razorpay dashboard,
   add a webhook pointing at `https://<your-domain>/api/payments/webhook/` for the
   `payment.captured` and `order.paid` events, and put its signing secret in
   `RAZORPAY_WEBHOOK_SECRET`. Locally you can skip this — the browser-side
   `/api/payments/verify/` call is enough to test the flow end to end with a
   [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-upi-details/).

## Before going live

- **Course prices are placeholders.** `seed_courses` filled in guessed prices
  (`₹9,999` default, a few flagship courses priced off the old "Compare
  programs" numbers). Correct every `Course.price` in Django admin
  (`/admin/courses/course/`) before accepting real payments.
- Set a real `SECRET_KEY`, `DEBUG=False`, and real `ALLOWED_HOSTS` /
  `CORS_ALLOWED_ORIGINS` in `backend/.env` for production.
- Switch Razorpay from test to live keys.
- The `free-session/` Google Ads landing page was **not** ported in this pass
  (flagged as a follow-up in the plan) — it still works standalone as a static
  page if you need it meanwhile.

## What's new vs. the old static site

- Real student accounts (register/login, JWT) with a `/dashboard` showing
  enrollment + payment status.
- Course enrollment is now a real paid transaction (Razorpay Checkout →
  signature-verified server-side → webhook fallback), not just a WhatsApp lead.
- The "Talk to an expert" / "Free demo" modal still opens WhatsApp *and* now
  also stores the lead in the database (visible in Django admin).
- Course/category content (the "Our programs" and "Compare programs" sections)
  now comes from the database instead of being hardcoded in JS.

## Location landing pages (`/locations/`)

`/locations/` plus 18 locality pages (`/locations/ai-course-in-<area>/`) target
AI-course searches across Delhi NCR. Each page is a long guide (4,000+ editorial
words) written separately per locality in `frontend/src/locations/content/`;
shared layout lives in `LocationView.tsx`, the list of locations/menu data in
`registry.ts`. The official head-office address is used everywhere and no local
branches are claimed.

- `npm run build` also prerenders every location page to static HTML
  (`scripts/prerender.mjs`, using `src/entry-server.tsx`), writes
  `dist/sitemap.xml`, and the SPA takes over in the browser.
- `npm run validate:locations` (run in CI) checks all 18 pages: word count,
  one `<h1>`, unique title/description/canonical, head-office address, logo,
  JSON-LD, internal links, sitemap, banned phrases and cross-page phrase overlap.
- Logo for these pages: `frontend/public/assets/coding-hubs-school-of-ai-logo*.jpeg`.
- No prices are shown anywhere on the site (home, program pages, checkout, dashboard).
