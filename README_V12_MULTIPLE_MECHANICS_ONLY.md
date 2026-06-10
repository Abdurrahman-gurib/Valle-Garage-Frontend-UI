# V12 Multiple Mechanics Fix

Changes:

- Removed the separate **Manual / Workshop Assignment** section from Add Vehicle.
- Add Vehicle now shows only **Assigned Mechanics**.
- Assigned Mechanics dropdown loads mechanic users from the database through `/api/users/mechanics`.
- Users can select multiple mechanics one by one.
- Selected mechanic names appear as removable chips.
- Save payload still sends `mechanicIds` and `mechanicNames`.

Backend requirement:

- Use the included backend patch or make sure `/api/users/mechanics` exists and allows Admin, Mechanic, Store Keeper, Fuel Manager, and Vehicle Manager roles to read active mechanic users.
