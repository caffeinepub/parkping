# ParkPing

## Current State
- Backend has `MixinAuthorization` and `AccessControl` modules for role-based admin access
- Frontend has `/claim-admin` page that calls `actor.claimAdmin(token)` -- but this function does NOT exist in the backend
- Admin token is stored as a CAFFEINE_ADMIN_TOKEN env var but is never exposed or usable from the UI
- User cannot access the admin panel because they don't know the token and the claim function is missing

## Requested Changes (Diff)

### Add
- `forceSetAdmin(state, user)` function in `access-control.mo` to directly assign admin
- `adminSetupToken` mutable variable in `main.mo` with a readable default value
- `adminTokenVersion` counter in `main.mo` for token rotation
- `claimAdmin(token: Text)` shared function in `main.mo` -- verifies token, assigns admin, rotates token
- `getAdminSetupToken()` query in `main.mo` -- public when no admin assigned, admin-only otherwise
- `resetAdminSetupToken()` shared function in `main.mo` -- admin-only, rotates token and returns new one
- Token display section on `/claim-admin` page: auto-fetches the token, shows it with a Copy button
- Token reset section on `/admin` page for the admin to rotate the token

### Modify
- `access-control.mo`: add `forceSetAdmin` export
- `ClaimAdminPage.tsx`: fetch and display current setup token with copy button above the form
- `AdminPage.tsx`: add Admin Token card showing token and reset button

### Remove
- Nothing removed

## Implementation Plan
1. Add `forceSetAdmin` to `access-control.mo`
2. Add `adminSetupToken`, `claimAdmin`, `getAdminSetupToken`, `resetAdminSetupToken` to `main.mo`
3. Update `ClaimAdminPage.tsx` to fetch and display the token
4. Update `AdminPage.tsx` to show/reset the admin token
5. Add query hooks `useAdminSetupToken` and `useResetAdminToken` to `useQueries.ts`
