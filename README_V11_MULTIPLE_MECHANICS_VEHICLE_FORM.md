# Vallé Garage Frontend V11 - Multiple Mechanics on Add Vehicle

This frontend update fixes the Add Vehicle form so mechanics can be selected one by one from a dropdown.

## Fixed

- Add Vehicle form now supports multiple assigned mechanics.
- After selecting one mechanic, the dropdown resets so another mechanic can be selected.
- Selected mechanics appear as removable name chips.
- Each selected chip has an `×` button to remove it.
- Payload now sends:
  - `mechanicIds`
  - `mechanicNames`
  - existing vehicle details
- The old single-mechanic dropdown is replaced with a professional multi-select flow.
- Frontend production build has been tested successfully.

## Main changed files

```text
src/components/Forms.jsx
src/components/MultipleMechanicsSelect.jsx
src/context/AppContext.jsx
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
