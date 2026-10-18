# Coding Hubs School of AI — React + DRF rebuild

This replaces the static site (`index.html`, `faq.html`, `main.js`, `styles.css`,
`free-session/`) with:

- **`backend/`** — Django 5 + Django REST Framework. JWT auth, course catalog,
  lead capture, and Razorpay-powered course enrollment payments.
- **`frontend/`** — React 19 + Vite + TypeScript, pixel-matched to the original
  design (same CSS, same copy, same animations), now talking to the API above.

The original static files are left in place for reference / comparison — delete
them once you're happy with the rebuild.

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
