## PROGRESS_SUMMARY_2025-10-17_beta0.5.1

This document summarizes the changes made to the project up to version `beta0.5.1`.

### 1. `app/admin/inscriptions/page.tsx`
- Fixed the typo `setIncriptions` to `setInscriptions`.
- Removed the duplicate `filter` state declaration.

### 2. `app/api/admin/inscriptions/route.ts`
- Removed the role-based filtering for `ADMIN_RESERVATION` and `ADMIN_RESOURCE` roles, ensuring all inscriptions are returned.