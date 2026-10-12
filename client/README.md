# Nexus ERP — Client

React frontend for **Nexus ERP**, a stock + invoicing management system for companies.
Pairs with the Laravel API (`erp-api`): multi-warehouse inventory, purchase orders,
quotations, invoices with payments, low-stock alerts and company settings.

## Tech stack

- React 18 + Vite 6
- Tailwind CSS v4
- react-router-dom v6, axios
- Hand-rolled SVG charts (no chart library)

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```

### Environment

| Variable       | Default                 | Description                    |
|----------------|-------------------------|--------------------------------|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the Laravel API (the `/api` prefix is added automatically) |

Create a `.env` file if the API runs elsewhere:

```
VITE_API_URL=https://erp.example.com
```

## Demo accounts

| Role    | Email            | Password   |
|---------|------------------|------------|
| Admin   | admin@erp.test   | `password` |
| Manager | manager@erp.test | `password` |
| Staff   | staff@erp.test   | `password` |

One-click login buttons for these accounts are on the login page.

### Roles

- **admin** — everything, including Settings
- **manager** — inventory, purchasing and sales (no Settings)
- **staff** — operational actions (stock transfers/adjustments, receiving POs, recording payments); no master-data or document create/edit/delete

## Pages

| Route | Page |
|---|---|
| `/` | Dashboard — KPIs, revenue bar chart, low-stock widget, recent invoices/POs/movements |
| `/products` | Products — search, category + low-stock filters, per-warehouse stock, CRUD |
| `/categories`, `/warehouses` | Master-data CRUD |
| `/stock` | Movements history (type/product/warehouse filters), transfer & adjust modals |
| `/suppliers` | Supplier cards, CRUD |
| `/purchase-orders` | List, create/edit with dynamic item rows, detail with order → receive → cancel workflow (receive adds stock) |
| `/clients` | Client cards, CRUD |
| `/quotations` | List, create/edit (discount + tax), detail with send → accept (creates invoice) → reject |
| `/invoices` | List with overdue highlighting, create/edit, detail with send, record-payment modal, payment timeline, PDF download, cancel |
| `/alerts` | Low-stock list with per-warehouse breakdown and reorder suggestions |
| `/settings` | Company info, currency, default tax rate, document prefixes (admin only) |

## API contract notes

The client is defensive about payload shapes and accepts:

- bare arrays `[...]` and Laravel paginated resources `{ data: [...], meta }`
- single resources as `{ data: {...} }` or bare `{...}`
- both `snake_case` and a few `camelCase` aliases for dashboard keys

Expected endpoints (all under `/api`, Sanctum bearer token):

- `POST /login`, `POST /logout`, `GET /me`
- `GET /dashboard`
- CRUD: `/products`, `/categories`, `/warehouses`, `/suppliers`, `/clients`
- `GET /stock-movements`, `POST /stock-movements/transfer`, `POST /stock-movements/adjust`
- `/purchase-orders` CRUD + `POST /{id}/order`, `/{id}/receive`, `/{id}/cancel`
- `/quotations` CRUD + `POST /{id}/send`, `/{id}/accept`, `/{id}/reject`
- `/invoices` CRUD + `POST /{id}/send`, `/{id}/payments`, `/{id}/cancel`, `GET /{id}/pdf`
- `GET /alerts/low-stock`, `GET|PUT /settings`

The invoice PDF opens `GET /api/invoices/{id}/pdf?token=…` in a new tab
(the token is passed as a query param because a new tab can't send headers).

Currency formatting defaults to **MAD** and follows the currency saved in Settings.
