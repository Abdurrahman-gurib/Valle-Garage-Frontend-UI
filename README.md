# Vallé GMS - Garage & Spare Parts Management

Production-ready React/Vite frontend prototype for the internal Vallé Garage & CFMOTO spare parts system.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@valle.com | admin123 |
| Mechanic | mechanic@valle.com | mech123 |
| Store Keeper | store@valle.com | store123 |

## Install and run

```powershell
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Open: `http://localhost:5173`

## Build

```powershell
npm run build
npm run preview
```

## Included features

- Role-based login: Admin, Mechanic, Store Keeper.
- Admin has all pages.
- Mechanic has dashboard, vehicles, assessments, garage work.
- Store Keeper has dashboard, vehicles, assessments, inventory, transactions, reports.
- Vehicle registration form with internal/external dropdown.
- Assessment creation, detail view, update, re-open with reason/accountability.
- Store keeper can complete assessments after parts issuance.
- Garage work creation and details view.
- Vehicle history includes assessments and garage operations, with parts used inside each entry.
- Inventory re-order using Purchase Order form.
- PO save, download, print, and email compose flow.
- Transactions with PO, invoice upload, status update, GRN on completion.
- Customer/vehicle order transaction statuses: Pending, Build in Progress, Built and Testing, Delivered, Paid, Completed.
- Search suggestions across vehicles, assessments, parts, garage work, and transactions.
- Notifications per user.
- Responsive internal-friendly Vallé theme.

## Backend compatibility

This frontend is ready to connect to any REST API. Recommended backend stack:

- NestJS or Express.js
- PostgreSQL
- Prisma ORM
- JWT authentication
- Role-based access control

Replace state actions in `src/context/AppContext.jsx` with API calls when backend is ready.
