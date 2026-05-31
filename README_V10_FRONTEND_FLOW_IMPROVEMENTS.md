# Vallé Garage Frontend V10 - Flow Improvements

This frontend package includes only frontend changes requested after the backend PATCH DTO fix.

## Added

- Better success/error messages after API save/update actions.
- Global loading bar while API requests are running.
- Forms now show saving states and prevent double-submit.
- Tables refresh automatically after create/update through the existing `refreshAll()` flow.
- Assessment detail now hides/locks Store Keeper actions when:
  - parts have already been issued
  - assessment is completed
- Garage work detail now locks closed/completed tickets to protect garage history.
- Garage work and assessment modal actions now wait for backend completion before closing.

## Main changed files

```text
src/context/AppContext.jsx
src/layouts/AppLayout.jsx
src/components/Forms.jsx
src/pages/Assessments.jsx
src/pages/Garage.jsx
src/styles/main.css
```

## Run

```powershell
cd Valle-Garage-Frontend-UI
npm install
npm run dev -- --port 5173 --strictPort
```

## Build

```powershell
npm run build
```

If node_modules already exists from another machine, delete it first and reinstall:

```powershell
rmdir /s /q node_modules
del package-lock.json
npm install
npm run build
```
