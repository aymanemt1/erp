# ERP — Stock & Invoicing Management

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=flat-square&logo=laravel&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Tests](https://img.shields.io/badge/tests-39_passed-brightgreen?style=flat-square)

A full-featured ERP system: multi-warehouse inventory, purchasing, sales, invoicing with PDF, payments, and low-stock alerts.

## Structure

- `api/` — Laravel 12 + Sanctum REST API (see `api/README.md`)
- `client/` — React 18 + Vite + Tailwind frontend (see `client/README.md`)

## Quick start

```bash
# API
cd api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve          # http://localhost:8000

# Client
cd client
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:8000
npm run dev                # http://localhost:5173
```

## Demo accounts (password: `password`)

| Role    | Email            |
| ------- | ---------------- |
| Admin   | admin@erp.test   |
| Manager | manager@erp.test |
| Staff   | staff@erp.test   |

## Features

**Inventory** — products (auto SKU), categories, multi-warehouse stock levels, atomic transfers, adjustments, full movement ledger, low-stock alerts.

**Purchasing** — suppliers, purchase orders (draft → ordered → received), receiving books stock in.

**Sales** — clients, quotations (draft → sent → accepted/rejected, accept spawns an invoice), invoices with sequential numbering (INV-2026-0001), PDF generation, stock deduction on send, cancellation restores stock.

**Cash** — payments per invoice (partial supported, overpayment rejected), auto paid status, overdue detection.

**Ops** — dashboard (revenue, outstanding, stock value, alerts), company settings.

## Tests

API: `php artisan test` — 39 tests / 255 assertions passing.

## Discussions
Have a question? Ask it in [GitHub Discussions](../../discussions).
