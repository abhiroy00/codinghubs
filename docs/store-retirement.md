# Store and order history removal

The owner requested removal of Store and My Orders, including their database data.

Public and admin Store interfaces, cart/checkout, store payment/order/refund APIs,
product editing, customer lists and free-download leads are removed. Profile retains
account details, learning Dashboard, data export and account controls. Removed URLs
return 404 and no longer appear in navigation or resource purchase buttons.

`shop.0007` adds a resource access guard. `shop.0008` deletes store products/categories,
product files, carts, coupons, store orders/items, payments/events/refunds, inventory,
store download permissions/leads/events, settings and store audit entries. Project
and guide content, their assets/audit entries, users, courses, enrollments and course
payment records remain. Previously paid project files stay restricted after their
Product link is removed; private guide access rules also remain in force.

The purge is intentionally irreversible; data rollback requires an existing database
backup. It deletes store records, rather than dropping the historical shared tables.
Shared model definitions remain because projects/guides and migration history still
reference them; no public/admin Store API can repopulate them. Private resource
links now use `/api/resources/download/`.

Deployment runs `manage.py migrate --noinput` in the new backend container before
starting Gunicorn (`backend/docker-entrypoint.sh`). The deployment replaces the old
backend container before migration; do not run this purge alongside an old backend
that lacks the new project file access guard. Historical commerce endpoint tests are
retired alongside their routes; project/guide access, upload/download, publishing,
SEO and new Store removal/purge tests remain.
