# Vallé GMS Frontend — Final Amended Version

This React + Vite frontend keeps the original login structure from the provided ZIP and adds the requested workflow amendments for Admin, Mechanic and Store Keeper users.

## Demo Login

Admin:
- Email: `admin@valle.com`
- Password: `admin123`

Mechanic:
- Email: `mechanic@valle.com`
- Password: `mech123`

Store Keeper:
- Email: `store@valle.com`
- Password: `store123`

## Main Amendments Added

### Admin
- Add transactions directly from the Transactions page.
- Attach Purchasing Order files.
- Mark transaction as `Pending`, `In Progress`, `Build in Progress`, `Built and Testing`, `Delivered`, `Paid`, or `Completed`.
- Fill transaction fields such as start date, expected delivery date, amount, supplier/customer email and notes.
- Create vehicle/build tickets based on customer purchase orders.
- Create vehicles marked as `Build in Progress` from transaction details.
- View and update transactions, invoices, PO and GRN details.

### Mechanic
- View admin-created build/repair requests from purchase orders.
- Start garage process from admin request.
- Update garage work status and expected delivery date.
- Add vehicles with check-in date and time.
- Vehicle form supports internal/external vehicle logic.
- External vehicles include company name, delivery person name, contact number and email.
- Vehicle type supports dropdown options and manual input.
- Assessment form supports dropdown suggestions and manual entry.
- Required parts can be selected from inventory or manually typed.
- Garage process includes vehicle dropdown or manual vehicle input.
- Garage process includes check-in date and time.
- Garage process supports invoice attachment and payment status.

### Store Keeper
- View recent/open assessments and required parts.
- Issue parts and complete assessment.
- Re-order low-stock inventory items.
- Edit PO message before sending supplier email.
- Download and print purchase orders.
- Manage transactions, invoices and GRN.

## Installation

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## Notes

This frontend currently uses mock in-memory data via React context. It is ready to connect to the NestJS + Prisma backend by replacing context actions with API service calls.
