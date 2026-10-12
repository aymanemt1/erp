# ERP API — Stock & Invoicing

A complete ERP backend (Laravel 12 + Sanctum) covering the full
purchase → stock → sales → cash cycle of a small trading company:

- **Catalog** — categories, products (auto SKU), warehouses
- **Inventory** — per-warehouse stock levels, full movement ledger,
  atomic transfers, manual adjustments (never negative)
- **Purchasing** — suppliers, purchase orders
  (`draft → ordered → received`), goods receipt books stock in
- **Sales** — clients, quotations (`draft → sent → accepted`),
  invoices with sequential numbering (`INV-2026-0001`),
  PDF generation, payments, overdue detection
- **Ops** — dashboard KPIs, low-stock alerts, company settings

## Stack

PHP 8.2+, Laravel 12, Sanctum (token auth), SQLite (dev/test),
`barryvdh/laravel-dompdf` (invoice PDFs), PHPUnit.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
# SQLite is the default (database/database.sqlite)
php artisan migrate --seed
php artisan serve
```

The seeder creates demo accounts, 2 warehouses, settings,
suppliers/clients, 8 products with opening stock (one of them
deliberately below its reorder level so the low-stock alert fires).

## Demo accounts (password: `password`)

| Email            | Role    |
| ---------------- | ------- |
| admin@erp.test   | admin   |
| manager@erp.test | manager |
| staff@erp.test   | staff   |

Roles: every authenticated user can **read**; writes need
`admin`/`manager`; `PUT /api/settings` needs `admin`.

```bash
curl -X POST http://localhost:8000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@erp.test","password":"password"}'
# -> { "token": "...", "user": {...} }
# then: -H "Authorization: Bearer <token>"
```

## API overview

| Method | Endpoint | Notes |
| ------ | -------- | ----- |
| POST | `/api/login`, `/api/logout` | token auth |
| GET | `/api/user` | current user |
| CRUD | `/api/categories`, `/api/products`, `/api/warehouses`, `/api/suppliers`, `/api/clients` | reads open, writes admin/manager |
| GET | `/api/stock`, `/api/stock/movements` | filter `product_id`, `warehouse_id`, `type` |
| POST | `/api/stock/transfer` | `{product_id, from_warehouse_id, to_warehouse_id, qty}` — atomic, 2 movements |
| POST | `/api/stock/adjust` | `{product_id, warehouse_id, qty}` — delta, ± |
| CRUD | `/api/purchase-orders` | totals computed server-side |
| POST | `/api/purchase-orders/{id}/confirm` | draft → ordered |
| POST | `/api/purchase-orders/{id}/receive` | ordered → received, books stock IN |
| POST | `/api/purchase-orders/{id}/cancel` | draft/ordered → cancelled |
| CRUD | `/api/quotations` | |
| POST | `/api/quotations/{id}/send` | draft → sent |
| POST | `/api/quotations/{id}/accept` | sent → accepted, spawns draft invoice (`warehouse_id` required) |
| POST | `/api/quotations/{id}/reject` | sent → rejected |
| CRUD | `/api/invoices` | `?status=`, `?client_id=`, `?overdue=1` |
| POST | `/api/invoices/{id}/send` | draft → sent, verifies then deducts stock (all-or-nothing) |
| POST | `/api/invoices/{id}/cancel` | draft/sent → cancelled, restores stock |
| GET | `/api/invoices/{id}/pdf` | printable PDF (company info from settings) |
| POST | `/api/invoices/{id}/payments` | `{amount, method, paid_at?, notes?}` — paid when balance hits 0 |
| GET | `/api/payments` | `?invoice_id=` |
| GET | `/api/dashboard` | revenue, outstanding, stock value, low-stock count, pending POs, overdue count, recents |
| GET | `/api/alerts/low-stock` | products at/below reorder level + per-warehouse breakdown |
| GET/PUT | `/api/settings` | key-value (PUT: admin only) |

## Business rules enforced

- Stock can never go negative (row locks + transactions, verified by tests).
- Documents are immutable once they leave `draft` (only drafts editable/deletable).
- PO receive only from `ordered`; invoice send only from `draft` with full
  stock availability; quotation accept only from `sent`.
- Price snapshots: PO/quotation/invoice lines store `unit_price` at creation,
  so later product price changes never rewrite history.
- Document numbers (`INV-`, `QUO-`, `PO-`) come from a locked counters table —
  sequential and unique under concurrency.
- Payments can't exceed the invoice balance; full payment flips status to `paid`.
- `php artisan invoices:mark-overdue` (scheduled daily) marks past-due
  unpaid `sent` invoices as `overdue`.

## Tests

```bash
php artisan test
```

39 feature tests / 255 assertions covering: auth + role gates, catalog CRUD,
atomic transfers, negative-stock prevention, PO receive, quotation → invoice,
sequential numbering, invoice send/cancel stock effects, payments → paid,
overdue command, low-stock alerts, dashboard numbers, settings gates, PDF.
