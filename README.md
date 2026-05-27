# Vallé Garage Frontend UI

## Professional README Documentation

**Project:** Vallé Garage Operations System  
**Frontend Application:** React + Vite  
**Backend API:** NestJS REST API  
**Database:** PostgreSQL through Prisma backend  
**Brand Theme:** Vallé Adventure Park / Garage Operations  
**Main Users:** Admin, Mechanic, Store Keeper, Fuel Manager, Vehicle Manager, Guest Drop-off  

---

## 1. Executive Summary

The **Vallé Garage Frontend UI** is the browser-based operational interface for managing Vallé Adventure Park garage activities. It is designed for real workshop use, where multiple users can log in with different responsibilities and interact with live database records.

The system supports:

- Garage dashboard and operational overview.
- Vehicle registration and vehicle history.
- Guest vehicle drop-off workflow.
- Vehicle assessments and diagnosis.
- Multiple mechanic assignment.
- Garage work tickets and repair tracking.
- Parts and inventory management.
- Fuel management system.
- Vehicle out/in management system.
- Advanced admin reports and analytics.
- Notifications and user settings.
- Real database-driven dropdowns and search fields.

The frontend does **not** act as the database. It sends requests to the backend API, and all permanent data is stored in PostgreSQL.

---

## 2. Business Workflow

```text
Vehicle / Guest Drop-off
        ↓
Vehicle Registration
        ↓
Assessment / Diagnosis
        ↓
Mechanic Assignment
        ↓
Parts Request / Stock Deduction
        ↓
Garage Work / Repair / Servicing
        ↓
Fuel Entry / Vehicle Out-In Tracking
        ↓
Vehicle History
        ↓
Admin Reports and Analytics
```

---

## 3. Technology Stack

| Area | Technology |
|---|---|
| UI Library | React |
| Build Tool | Vite |
| Routing | React Router DOM |
| Styling | Custom CSS |
| API Calls | Fetch API |
| Authentication | JWT token from backend |
| Session Storage | Browser localStorage |
| Backend Communication | REST API |
| Reports Export | CSV / browser-generated exports |
| Recommended Node Version | Node.js 20 LTS |
| Package Manager | npm |

---

## 4. Folder Structure

```text
Valle-Garage-Frontend-UI/
│
├── public/
│   ├── logo.webp
│   └── vehicles/
│       ├── quad-450l.jpeg
│       ├── quad-520l.jpeg
│       ├── uforce-600.jpeg
│       ├── uforce-800xl.jpeg
│       ├── uforce-u6-ev.jpeg
│       ├── ut10-pro-highland.jpeg
│       └── ut10-pro-xl-highland.jpeg
│
├── src/
│   ├── components/
│   │   ├── Forms.jsx
│   │   ├── Logo.jsx
│   │   ├── MultipleMechanicsSelect.jsx
│   │   ├── PartsCostTable.jsx
│   │   ├── SearchBox.jsx
│   │   ├── UI.jsx
│   │   └── VehicleChecklist.jsx
│   │
│   ├── context/
│   │   └── AppContext.jsx
│   │
│   ├── data/
│   │   └── vehicleCatalog.js
│   │
│   ├── layouts/
│   │   └── AppLayout.jsx
│   │
│   ├── pages/
│   │   ├── Assessments.jsx
│   │   ├── Dashboard.jsx
│   │   ├── FuelConsumption.jsx
│   │   ├── Garage.jsx
│   │   ├── GuestDropoff.jsx
│   │   ├── GuestPending.jsx
│   │   ├── Inventory.jsx
│   │   ├── Login.jsx
│   │   ├── Notifications.jsx
│   │   ├── Reports.jsx
│   │   ├── Settings.jsx
│   │   ├── Transactions.jsx
│   │   ├── VehicleHistory.jsx
│   │   ├── VehicleOut.jsx
│   │   └── Vehicles.jsx
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── styles/
│   │   └── main.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env
├── index.html
├── package.json
└── README.md
```

---

## 5. Application Routes

| Route | Page | Main Purpose |
|---|---|---|
| `/login` | Login | Role-based login screen |
| `/guest` | Guest Drop-off | Public/front-desk vehicle drop-off form |
| `/dashboard` | Dashboard | Role-specific overview |
| `/vehicles` | Vehicles | Vehicle list and vehicle search |
| `/vehicles/:plate` | Vehicle History | Full story for selected vehicle |
| `/assessments` | Assessments | Diagnosis and parts requirement |
| `/garage` | Garage Work | Repair and service work tickets |
| `/inventory` | Parts / Inventory | Parts, stock, supplier, cost controls |
| `/fuel` | Fuel Management | Fuel entry by vehicle |
| `/vehicle-out` | Vehicle Out/In Management | Vehicle activity, out time, in time |
| `/transactions` | Transactions | PO, GRN, invoices, purchasing |
| `/reports` | Reports | Admin analytics and export |
| `/settings` | Settings | Users and system configuration |
| `/notifications` | Notifications | Operational alerts |
| `*` | Not Found | Invalid route fallback |

---

## 6. User Roles and Navigation

### 6.1 Admin

Admin has full operational and reporting access.

Admin can access:

```text
Dashboard
Vehicles
Assessments
Parts
Garage Work
Fuel Management
Vehicle Out/In
Transactions
Reports
Settings
Notifications
```

Admin is the only role intended to extract full system reports across fuel, vehicle activity, assessments, garage work, costs, parts, and mechanics.

---

### 6.2 Mechanic

Mechanic access is focused on technical workshop activity.

Mechanic can access:

```text
Dashboard
Guest Pending
Vehicles
Assessments
Garage Work
Notifications
```

Mechanics should **not** see Fuel Management or Vehicle Out/In Management if those are handled by separate staff.

---

### 6.3 Store Keeper

Store Keeper access is focused on parts and stock.

Store Keeper can access:

```text
Dashboard
Vehicles
Assessments
Parts
Transactions
Reports
Notifications
```

The Store Keeper can add parts, edit parts, update stock, issue parts, and see inventory-related reports depending on final permissions.

---

### 6.4 Fuel Manager

Fuel Manager is a focused role for fuel data entry.

Fuel Manager should access:

```text
Fuel Management
Reports
Notifications
```

Fuel Manager should not see:

```text
Dashboard
Assessments
Garage repair cost
Low stock analytics
Garage work costing
Admin-only financial analytics
```

---

### 6.5 Vehicle Manager

Vehicle Manager is a focused role for vehicle activity tracking.

Vehicle Manager should access:

```text
Vehicle Out/In Management
Reports
Notifications
```

Vehicle Manager should not see:

```text
Dashboard
Assessments
Garage repair cost
Low stock analytics
Admin-only financial analytics
```

---

## 7. Login Page

The login page supports multiple role boxes.

Recommended layout:

```text
Admin          Mechanic          Store Keeper
Fuel Manager  Vehicle Manager   Guest Drop-off
```

The login screen should be aligned as **3 boxes above and 3 boxes below** for a clean professional appearance.

### Login Flow

```text
User selects role
        ↓
User enters email and password
        ↓
Frontend calls POST /auth/login
        ↓
Backend returns accessToken and user profile
        ↓
Frontend stores token in localStorage
        ↓
User is redirected to allowed landing page
```

---

## 8. Authentication and Session Handling

Authentication uses JWT tokens from the backend.

Local storage keys usually include:

```text
valle-token
valle-user
token
```

Every protected API request attaches:

```text
Authorization: Bearer <accessToken>
```

Logout clears local storage and redirects to `/login`.

---

## 9. API Service Layer

All backend calls are centralized in:

```text
src/services/api.js
```

Main API groups:

```text
auth
users
vehicles
assessments
garageOps
inventory
transactions
reports
fuelConsumptions
vehicleOut
notifications
```

Example usage:

```js
api.vehicles.list()
api.inventory.create(payload)
api.assessments.issueParts(id, payload)
api.reports.fuel(query)
api.vehicleOut.create(payload)
api.fuelConsumptions.create(payload)
```

---

## 10. Core Feature Modules

## 10.1 Dashboard

File:

```text
src/pages/Dashboard.jsx
```

Dashboard displays a role-based overview.

Example dashboard cards:

- Vehicles.
- In Garage.
- Low Stock.
- Assessments.
- Garage Tickets.
- Guest Tickets.

Important rule:

The `In Garage` count should come from active garage operations, not only from vehicle status.

Correct logic concept:

```js
const ongoing = garageOps.filter(g =>
  !['Completed', 'Delivered', 'Cancelled', 'Canceled'].includes(g.status)
);
```

---

## 10.2 Vehicles

File:

```text
src/pages/Vehicles.jsx
```

Features:

- Load vehicles from backend database.
- Search by plate, model, type, or manufacturer.
- Display vehicle image.
- Open vehicle history.
- Support internal and external vehicles.
- Store plate, model, VIN, CC, owner, status, and notes.

Vehicle dropdowns used in other pages should auto-populate from the backend `Vehicle` table.

---

## 10.3 Vehicle History

File:

```text
src/pages/VehicleHistory.jsx
```

Vehicle history should provide a complete story for one vehicle.

Recommended sections:

- Vehicle identity.
- Current status.
- Fuel consumed by day/week/month.
- Vehicle out/in count by day/week/month.
- Assessment history.
- Garage work history.
- Parts used.
- Cost summary.
- Mechanic work hours.
- Full activity timeline.

Useful for questions like:

- How many times did this quad go out today?
- How much fuel did it consume this week?
- What repairs were done?
- Which parts were used?
- What was the total cost?

---

## 10.4 Guest Drop-off

File:

```text
src/pages/GuestDropoff.jsx
```

Allows a vehicle or guest drop-off ticket to be created.

Fields may include:

- Guest name.
- Delivery person name.
- Plate.
- VIN.
- Vehicle type.
- Model.
- CC.
- Contact number.
- Email.
- Notes.
- Image URL.

---

## 10.5 Guest Pending

File:

```text
src/pages/GuestPending.jsx
```

Mechanics can review guest tickets and convert them into assessments.

Workflow:

```text
Guest ticket created
        ↓
Mechanic reviews pending ticket
        ↓
Mechanic accepts/takes ticket
        ↓
Vehicle/assessment workflow starts
```

---

## 10.6 Assessments

File:

```text
src/pages/Assessments.jsx
```

Features:

- Create assessment.
- Select vehicle from database.
- Assign one or more mechanics.
- Record issue detected.
- Add required parts.
- Calculate estimated cost.
- Issue parts.
- Complete assessment.
- Reopen assessment.

### Multiple Mechanics

The multiple mechanic selector should:

- Load mechanics from the backend `User` table.
- Allow selecting more than one mechanic.
- Display selected mechanic names as chips.
- Save assigned mechanic IDs to the backend.

---

## 10.7 Garage Work

File:

```text
src/pages/Garage.jsx
```

Tracks actual work done on vehicles.

Fields:

- Process number.
- Vehicle.
- Assessment or PO.
- Process type.
- Mechanic(s).
- Check-in time.
- Expected date.
- Status.
- Procedures performed.
- Parts used.
- Labour hours.

The dashboard garage count should match active garage tickets.

---

## 10.8 Parts / Inventory

File:

```text
src/pages/Inventory.jsx
```

Store Keeper and Admin can manage parts.

Editable fields:

```text
SKU
Part name
Selling price
Current stock
Reorder level
Supplier
Supplier email
Category
Location
```

Features:

- Add new part.
- Edit existing part.
- Search parts.
- Add stock.
- Deduct stock when parts are issued.
- View stock movement history.
- Generate low-stock alerts.

### Parts Dropdown

Where a part is selected in assessment or repair flow:

- Dropdown should load parts from DB.
- User should also be able to type manually.
- Search should auto-populate possible matching parts.
- Selecting a part should auto-fill SKU, name, price, and current stock where needed.

---

## 10.9 Fuel Management

File:

```text
src/pages/FuelConsumption.jsx
```

Fuel Management is a focused page for fuel entries only.

Fields:

```text
Vehicle plate
Vehicle ID
Fuel type
Meter type
Meter reading
Fuel litres
Recorded at
Notes
```

Rules:

- Vehicle plate field should auto-populate from DB vehicles.
- Selecting plate should also store `vehicleId`.
- `vehiclePlate` should also be stored in `FuelConsumption` for easy reporting.
- Today’s fuel entries should show separately.
- Older fuel entries should remain visible below.
- Fuel reports should be extracted from the Reports page.

---

## 10.10 Vehicle Out/In Management

File:

```text
src/pages/VehicleOut.jsx
```

This page tracks activity movement of quads/vehicles.

Recommended tabs:

```text
Vehicle Out
Vehicle In
Activity Summary
```

Vehicle Out fields:

```text
Vehicle plate
Vehicle ID
Invoice number
Guide name
Quad activity
Trip duration
Time out
Notes
```

Vehicle In fields:

```text
Open activity record
Vehicle plate
Time in
Return notes
```

Rules:

- Vehicle plate should auto-populate from DB.
- One vehicle may go out, return, then go out again.
- Each activity is a separate record.
- Reports should show how many times a vehicle went out per day/week/month/custom range.
- Today’s entries should be shown separately from previous entries.

---

## 10.11 Transactions

File:

```text
src/pages/Transactions.jsx
```

Supports:

- Parts purchase orders.
- Vehicle orders.
- Service invoices.
- PO number.
- Invoice file path.
- GRN data.
- Supplier.
- Amount.
- Status.

---

## 10.12 Reports and Analytics

File:

```text
src/pages/Reports.jsx
```

Admin can extract advanced reports.

Recommended report categories:

- Fuel consumption report.
- Vehicle out/in activity report.
- Assessment report.
- Garage work report.
- Parts sold/issued report.
- Costing report.
- Mechanic working hours report.
- Inventory low-stock report.
- Full vehicle story report.

Recommended filters:

```text
Day
Week
Month
Year
Custom date range
Vehicle plate
Mechanic
Part
Status
Fuel type
Activity type
```

Recommended exports:

```text
CSV
Excel
PDF
```

Current browser implementation may support CSV first, with Excel/PDF as production improvements.

---

## 11. Environment Setup

Create `.env` in the frontend root:

```env
VITE_API_URL=http://localhost:3000/api
```

Backend default:

```text
http://localhost:3000/api
```

Frontend default:

```text
http://localhost:5173
```

---

## 12. Installation

```bash
cd Valle-Garage-Frontend-UI
npm install
```

---

## 13. Run Locally

Recommended fixed port:

```bash
npm run dev -- --port 5173 --strictPort
```

Open:

```text
http://localhost:5173/login
```

---

## 14. Production Build

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

Build output:

```text
dist/
```

---

## 15. Recommended Full Run Order

Start backend first:

```bash
cd Valle-Garage-Backend
npm install
npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact
npx prisma generate
npx prisma db push
npm run db:seed
npm run start:dev
```

Then frontend:

```bash
cd Valle-Garage-Frontend-UI
npm install
npm run dev -- --port 5173 --strictPort
```

---

## 16. Default Login Users

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vallepark.com` | `password123` |
| Mechanic | `mechanic@vallepark.com` | `password123` |
| Store Keeper | `store@vallepark.com` | `password123` |
| Fuel Manager | `fuel@vallepark.com` | `password123` |
| Vehicle Manager | `vehicle@vallepark.com` | `password123` |

---

## 17. Performance and Smoothness Guidelines

For multiple users:

- Keep API calls centralized in `api.js`.
- Avoid loading huge tables repeatedly.
- Use search/filter before rendering very large datasets.
- Use pagination or limited visible queues.
- Refresh only the module that changed.
- Keep dashboard cards based on summarized API data where possible.
- Avoid blocking UI while saving.
- Show loading states and success/error messages.

---

## 18. Troubleshooting

### Login works in Swagger but not frontend

Check CORS and frontend port.

If frontend is on `5174`, either run it on `5173`:

```bash
npm run dev -- --port 5173 --strictPort
```

or update backend `.env`:

```env
FRONTEND_URL=http://localhost:5174
```

Restart backend.

---

### Data not refreshing

Refresh the page or ensure the page calls the list endpoint after create/update.

Recommended pattern:

```js
await api.module.create(payload);
await loadData();
```

---

### Vehicle dropdown does not show plates

Check:

- Backend is running.
- `/api/vehicles` returns vehicles.
- Token exists.
- User has permission.
- Vehicle table contains records.

---

### Wrong time shown

Check database timezone:

```sql
SHOW timezone;
SELECT timezone('Indian/Mauritius', now());
```

Also check frontend date conversion code.

---

## 19. Future Improvements

Recommended future improvements:

- PDF report export.
- Excel report export.
- Advanced dashboard charts.
- Offline tablet mode.
- QR code per vehicle.
- Barcode scanner for parts.
- Mechanic timesheet approval.
- File upload for invoice, PO, and repair photos.
- Admin audit trail screen.
- Dark/light theme switch.
- Mobile-first workshop mode.
