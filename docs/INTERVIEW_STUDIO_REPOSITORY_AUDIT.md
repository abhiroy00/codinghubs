# Interview Studio repository audit

Inspected 12 November 2026 before implementation. Working tree was clean.

| Area | Existing implementation / decision |
| --- | --- |
| Frontend | React 19.2, TypeScript 6, Vite 8; React Router 7; lazy route modules. Preserve existing marketing, course, store and SEO pages. |
| Backend | Django REST Framework and SimpleJWT. Requirements declare Django 6.1 / DRF 3.18; README says Django 5; installed system Django is 5.1.4. Verify dependency availability before changing framework versions. |
| Database | PostgreSQL 16 in production, SQLite fallback locally. Add an independent Django app and additive migrations referencing AUTH_USER_MODEL. |
| Identity / roles | accounts.User extends AbstractUser with phone. Existing JWT refresh interceptor. Student, staff and superuser flags; no teacher-specific role model. Reuse these identities. |
| Existing learning | Course, CourseCategory, LearningProgress, CourseQuestion and CourseCertificate. Existing questions are course-specific text Q&A without execution test schema. Studio coding problems need versioned constraints and private test cases; do not duplicate users/courses/enrollments. |
| Admin | Separate React app at /admin-panel/; staff-only DRF APIs at /api/admin/ plus Django /admin/. Extend both. |
| Routing | Existing /interview-prep/ must remain stable. New /interview-studio area; new /api/studio/v1/ namespace. Production nginx uses explicit SPA allowlists, which must include the new area. |
| UI | Existing global styles, several scoped free-session/learning styles. Scope all Studio CSS to avoid regressions. Reuse auth/API client; existing public code editor sends code to public Judge0 and is unsuitable for private hidden-test assessment. Leave it unchanged. |
| Payments / management | Razorpay payments/webhooks, enrollments, tutor bookings, shop inventory/orders/private downloads, CMS. No changes to their schemas or contracts. |
| AI | No existing model integration, vector store, speech provider or AI secrets contract. New server-only provider abstraction; unavailable services must fail explicitly. |
| Deployment | Docker Compose, Postgres, nginx, gunicorn, ECR/EC2 deployment via GitHub Actions/SSM. Push to main automatically deploys. Work stays local; no pushes or production writes. |
| Secrets | python-decouple, env examples, AWS env fetch scripts. Never read or copy real .env values. Extend examples only. |
| QA | Django app test suites; frontend/admin TypeScript builds; SEO and 18-location validation, prerendered sitemap. CI/backend image use Python 3.12. Installed Django 6.1.3 metadata declares Python >=3.12, so no runtime change is required. Initial suspected incompatibility was ruled out by installed package metadata. |
| SEO / analytics | Prerendered React pages, canonical and JSON-LD registry, nginx real 404s, SSR CMS/shop. Studio public landing should be prerendered; private routes noindex. No new external analytics tracker required. |

Local Docker CLI exists but daemon is unavailable. Real container resource/isolation tests cannot pass until Docker is started. No claims about production concurrency, AI quality or successful hidden execution may be made without corresponding integration tests.

Functional reference: https://algomaster.io/ was reviewed only for public feature categories. No code, text, layouts, media or datasets were imported. The production https://codinghubs.in/ page could not be fetched by the research tool; repository source is the implementation reference.
