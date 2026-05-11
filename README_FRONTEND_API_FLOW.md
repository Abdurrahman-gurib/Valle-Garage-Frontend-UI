# Vallé Garage Frontend - API Connected Version

This frontend has been amended so the UI flow is prepared to communicate with the NestJS backend and PostgreSQL database.

## Main changes

- Added centralized API service: `src/services/api.js`
- Refactored app state in `src/context/AppContext.jsx` to load and save via backend APIs
- Added password eye toggle for login
- Updated demo emails to `@vallepark.com`
- Admin dashboard uses live context data loaded from API
- Vehicles created from frontend call `POST /api/vehicles`
- Assessments created from frontend call `POST /api/assessments`
- Garage operations call `POST /api/garage-ops`
- Transactions call `POST /api/transactions`
- Settings user creation calls `POST /api/users`
- Store keeper can create transactions
- Garage work dropdown shows open assessment tickets
- Garage detail includes assessment/PO reference, parts used and payment status with `None - Internal`
- Store keeper assessment ticket has issued-parts note and confirm prompt before saving/issuing
- Added 404 page for invalid URLs
- Reports now show interactive chart bars and CSV export buttons
- Vehicle detail history shows assessments, parts, garage work and payment/invoice status

## Required frontend `.env`

Create `.env` in the frontend root:

```env
VITE_API_URL=http://localhost:3000/api
```

## Run

```powershell
npm install
npm run dev
```

## Test full flow

1. Start backend first on `http://localhost:3000/api`.
2. Start frontend on Vite.
3. Login.
4. Add a vehicle from frontend.
5. In PostgreSQL run:

```sql
SELECT * FROM "Vehicle" ORDER BY "createdAt" DESC;
```

## Important

The frontend includes fallback local state so screens still work if the backend is down. If the backend is online and login/token are valid, records are sent to the API and refreshed from PostgreSQL.
