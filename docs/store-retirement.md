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

The earlier data purge is intentionally irreversible; data rollback requires an existing database
backup. Schema rollback of `0009` restores empty Store tables and the legacy access
label; restoring old Store records or removed permissions requires the backup.
`shop.0009` now detaches resources from the retired product/order schema and drops
16 empty Store models plus three join tables. Historical migrations stay intact.
Unexpected Store rows stop this migration for reconciliation; stale Store content
types and permissions are removed within the same migration. Private resource
links now use `/api/resources/download/`.

Deployment runs `manage.py migrate --noinput` in the new backend container before
starting Gunicorn (`backend/docker-entrypoint.sh`). The deployment replaces the old
backend container before migration; do not run this purge alongside an old backend
that lacks the new project file access guard. Historical commerce endpoint tests are
retired alongside their routes; project/guide access, upload/download, publishing,
SEO and new Store removal/purge tests remain.


The 23 November cleanup removes the remaining commerce implementation, serializers,
Store templates, obsolete order audit command, product admin form types, and price
filters. Restricted projects/guides, private downloads, brochures/resumes, users,
courses, enrollments and course payments remain. Local SQLite migration was verified
on a backup copy first. Production deployment creates and validates a PostgreSQL
archive before startup migrations and verifies retained-record counts afterward.
