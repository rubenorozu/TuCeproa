## PROGRESS_SUMMARY_2025-10-17_beta0.5.0

This document summarizes the changes made to the project up to version `beta0.5.0`.

### 1. `app/admin/page.tsx`
- Modified the layout for `ADMIN_RESERVATION` users to show a smaller "Inscripciones" card and a larger reservations list.
- Modified the `useEffect` hook to fetch reservations for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` roles.
- Added a new view for the `ADMIN_RESOURCE` user, similar to the `SUPERUSER` view but without the "Users" card.
- Adjusted the authorization logic to allow `ADMIN_RESOURCE` users to access the admin dashboard.
- Removed the `h-100` class from the "Inscripciones" card for the `ADMIN_RESERVATION` user.

### 2. `app/api/admin/reservations/route.ts`
- Removed role-based filtering for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` roles, ensuring all reservations are returned.
- Modified the authorization check to include `ADMIN_RESOURCE` role.
- Included `responsibleUserId` in the `select` statement for `space` and `equipment` relations.

### 3. `app/admin/inscriptions/page.tsx`
- Allowed `ADMIN_RESERVATION` and `ADMIN_RESOURCE` users to access the page.
- Modified the `useEffect` hook to fetch inscriptions for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` roles.
- Modified the `handleApproveReject` and `handleDelete` functions to pass the current filter value to the `fetchInscriptions` function.
- Fixed the typo `setIncriptions` to `setInscriptions`.
- Modified the logic for the "Eliminar" button to be visible to all admins, but disabled if the user is not a `SUPERUSER` or the responsible user.

### 4. `app/api/admin/inscriptions/route.ts`
- Removed role-based filtering for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` roles, ensuring all inscriptions are returned.
- Modified the authorization check to include `ADMIN_RESOURCE` role.
- Ensured that no `whereClause` is applied if the user is a `SUPERUSER`.
- Reintroduced role-based filtering for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` (if the user is `ADMIN_RESERVATION` or `ADMIN_RESOURCE`, add a condition to filter by `responsibleUserId`). This condition should be combined with the `statusFilter` using `AND`.

### 5. `components/Header.tsx`
- Added the `ADMIN_RESOURCE` role to the condition for displaying the "Admin Dashboard" link.