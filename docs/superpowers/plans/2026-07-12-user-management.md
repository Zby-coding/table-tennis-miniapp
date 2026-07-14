# User Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a shared NestJS user-management API, a user-facing profile/settings experience, and a protected desktop admin console under `manage/`.

**Architecture:** Extend the existing `User` entity and `UserService` for self-service profile data, then add an isolated `AdminUserModule` with a database-backed admin guard for overview, search, detail, status, role, and note operations. The Taro app consumes the self-service endpoints; `manage/` is a small React/Vite desktop app that consumes only the admin API and never accesses the database directly.

**Tech Stack:** NestJS 11, TypeORM, SQLite/MySQL, JWT, class-validator, Jest/ts-jest, Taro 4 + React 18 + TypeScript, React/Vite, Vitest, companion browser.

---

## File Map

Create or modify only these feature files, preserving unrelated dirty worktree changes:

- Backend: `server/src/entities/user.entity.ts`, `server/src/modules/user/dto/update-profile.dto.ts`, `server/src/modules/user/dto/update-preferences.dto.ts`, `server/src/modules/user/user.service.ts`, `server/src/modules/user/user.controller.ts`, `server/src/modules/user/user.module.ts`, `server/src/modules/admin/admin-user.controller.ts`, `server/src/modules/admin/admin-user.service.ts`, `server/src/modules/admin/admin-user.module.ts`, `server/src/modules/admin/dto/*`, `server/src/common/guards/admin.guard.ts`, `server/src/common/decorators/admin.decorator.ts`, `server/src/app.module.ts`, and focused `*.spec.ts` files beside the services/guards.
- Miniapp: `src/services/api.ts`, `src/types.ts`, `src/pages/profile/index.tsx`, `src/pages/profile/index.scss`, `src/pages/settings/index.tsx`, `src/pages/settings/index.scss`, and a new `src/pages/profile-edit/index.tsx` plus config/style files if the profile form needs its own route.
- Management console: new `manage/package.json`, `manage/index.html`, `manage/tsconfig.json`, `manage/vite.config.ts`, `manage/src/main.tsx`, `manage/src/App.tsx`, `manage/src/api.ts`, `manage/src/types.ts`, `manage/src/styles.css`, `manage/src/components/StatCard.tsx`, `manage/src/components/UserFilters.tsx`, `manage/src/components/UserTable.tsx`, `manage/src/pages/Login.tsx`, `manage/src/pages/Dashboard.tsx`, `manage/src/pages/UserDetail.tsx`, and `manage/src/tests/*.test.tsx`.
- Documentation: update the project README only after the implementation works, with exact commands for `server` and `manage`.

## Task 1: Lock the backend contract with failing tests

**Files:**
- Create: `server/src/modules/user/user.service.spec.ts`
- Create: `server/src/modules/admin/admin-user.service.spec.ts`
- Create: `server/src/common/guards/admin.guard.spec.ts`

- [ ] **Step 1: Write the self-service profile tests first.**

Cover the real `UserService` with an in-memory repository double whose methods implement `findOne`, `update`, and `save`:

```ts
it('updates only editable profile fields and returns the refreshed profile', async () => {
  const result = await service.updateProfile(7, {
    nickname: '削球手',
    city: '南阳',
    style: '削球',
    level: 2,
  });

  expect(repo.update).toHaveBeenCalledWith(7, {
    nickname: '削球手', city: '南阳', style: '削球', level: 2,
  });
  expect(result.id).toBe(7);
});
```

Also assert empty nickname is rejected by DTO validation and profile output includes `city`, `style`, `level`, `role`, `status`, and preferences without exposing `openid`.

- [ ] **Step 2: Write admin service tests that fail before the module exists.**

Cover keyword/status/level/city pagination, overview counts, detail lookup, status update, role update, and admin note update. Assert that status and role updates call `repo.update` and never delete related records.

- [ ] **Step 3: Write admin guard tests first.**

Assert unauthenticated execution is rejected, a normal user receives `ForbiddenException`, an active admin is allowed, and a disabled admin is rejected. Use a fake `UserService.findById` so the guard test is isolated from TypeORM.

- [ ] **Step 4: Run the focused tests and verify the expected red state.**

Run from `server/`:

```bash
npm test -- --runInBand src/modules/user/user.service.spec.ts src/modules/admin/admin-user.service.spec.ts src/common/guards/admin.guard.spec.ts
```

Expected: the new tests fail because the new fields, admin service, and guard do not exist yet. Fix test setup errors before implementation; do not weaken assertions.

## Task 2: Implement user fields, self-service API, and account enforcement

**Files:**
- Modify: `server/src/entities/user.entity.ts`
- Modify: `server/src/modules/user/dto/update-profile.dto.ts`
- Create: `server/src/modules/user/dto/update-preferences.dto.ts`
- Modify: `server/src/modules/user/user.service.ts`
- Modify: `server/src/modules/user/user.controller.ts`
- Modify: `server/src/modules/user/user.module.ts`
- Modify: `server/src/common/guards/jwt-auth.guard.ts`

- [ ] **Step 1: Add persisted fields with safe defaults.**

Add `role` (`user`/`admin`), `status` (`active`/`disabled`), `lastActiveAt`, `adminNote`, `remindMatch`, `remindSignIn`, and `showActivity` to `User`. Keep existing `nickname`, `avatarUrl`, `style`, `city`, `level`, and statistics. Use nullable columns where an existing SQLite database may contain no value and defaults for booleans/enums.

- [ ] **Step 2: Expand DTO validation.**

Allow only `nickname`, `avatarUrl`, `style`, `city`, and numeric `level` 1-4 for self-editing. Trim strings in the service, reject blank nickname, and never accept `role`, `status`, points, wins, or totals from this endpoint. Add a preferences DTO with booleans for `remindMatch`, `remindSignIn`, and `showActivity`.

- [ ] **Step 3: Return a stable self-service profile contract.**

Update `getProfile` to return the current profile, stats, preferences, and achievements while omitting `openid`, `unionid`, `adminNote`, and other private fields. Add `updatePreferences` and a small `getUserSummary` helper used by the admin service.

- [ ] **Step 4: Enforce disabled accounts centrally.**

Update `JwtAuthGuard` to load the authenticated user after JWT verification. Set `request.user` from the database-backed user record, update `lastActiveAt` for active users, and throw `UnauthorizedException('账号已停用')` for disabled users. Preserve `@Public()` behavior and existing 401 messages.

- [ ] **Step 5: Add controller endpoints and run the red tests again.**

Add `PATCH /api/user/preferences` and connect DTOs. Run:

```bash
npm test -- --runInBand src/modules/user/user.service.spec.ts
```

Expected: self-service tests pass; admin tests remain red because Task 3 is not implemented yet.

## Task 3: Implement database-backed admin API and permissions

**Files:**
- Create: `server/src/common/decorators/admin.decorator.ts`
- Create: `server/src/common/guards/admin.guard.ts`
- Create: `server/src/modules/admin/admin-user.module.ts`
- Create: `server/src/modules/admin/admin-user.service.ts`
- Create: `server/src/modules/admin/admin-user.controller.ts`
- Create: `server/src/modules/admin/dto/user-list-query.dto.ts`
- Create: `server/src/modules/admin/dto/update-user-status.dto.ts`
- Create: `server/src/modules/admin/dto/update-user-role.dto.ts`
- Create: `server/src/modules/admin/dto/update-user-note.dto.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Implement the database-backed admin guard.**

The guard must read `request.user.sub`, call `UserService.findById`, require `status === 'active'` and `role === 'admin'`, then attach the fresh user to `request.user`. It must never trust a role sent by the browser or only trust a stale JWT claim.

- [ ] **Step 2: Implement query and mutation DTOs.**

Use `class-validator` for `page >= 1`, `pageSize` between 1 and 100, `level` between 1 and 4, statuses `active|disabled`, roles `user|admin`, and non-empty note/status values. Normalize keyword and city before querying.

- [ ] **Step 3: Implement the service methods.**

Add `getOverview`, `listUsers`, `getUserDetail`, `updateStatus`, `updateRole`, and `updateNote`. Use TypeORM query builder for optional filters and pagination. Return `items`, `page`, `pageSize`, `total`, and `totalPages`; use explicit field projections to avoid returning `openid` or secrets. Detail output includes stats and bounded recent activity summaries.

- [ ] **Step 4: Implement controller routes under `/api/admin/users` and `/api/admin/overview`.**

Apply the admin guard to the controller class, use `@CurrentUser()` for the acting admin, and reject self-demotion/self-disable with a `BadRequestException`. Register `AdminUserModule` in `AppModule`.

- [ ] **Step 5: Update login token data without making it authoritative.**

Include `role` and `status` in the login response's sanitized user object for UI hints, but keep the database-backed guard authoritative. Existing development login must continue to create or update a normal active user.

- [ ] **Step 6: Run backend tests and build.**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: focused user/admin tests pass, existing court tests remain green, and Nest compiles without TypeScript errors.

## Task 4: Add miniapp profile editing and preferences UI

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/types.ts`
- Modify: `src/pages/profile/index.tsx`
- Modify: `src/pages/profile/index.scss`
- Modify: `src/pages/settings/index.tsx`
- Modify: `src/pages/settings/index.scss`
- Create: `src/pages/profile-edit/index.tsx`
- Create: `src/pages/profile-edit/index.scss`
- Create: `src/pages/profile-edit/index.config.ts`
- Modify: `src/app.config.ts`

- [ ] **Step 1: Add API and type contracts before UI wiring.**

Add `getUserPreferences`, `updateUserPreferences`, `updateUserProfile`, and typed `UserProfile` fields for city/style/level/role/status/preferences. Keep `request` handling of 401 and network errors intact.

- [ ] **Step 2: Build the profile edit page.**

Use a compact form with nickname, city, style picker, level picker, and save/cancel controls. Validate nickname locally, show a loading state during save, preserve the previous value on failure, and return to profile after success with a toast.

- [ ] **Step 3: Update profile page.**

Show real avatar when available, city/style metadata, account status, and an “编辑资料” action. Preserve existing achievement/stat cards and routes. If the API fails, retain current fallback profile without showing a false success state.

- [ ] **Step 4: Update settings page.**

Load preferences on show, bind switches to persisted values, add privacy/activity visibility, and implement logout by clearing token then navigating to the login/home state. Disabled users see a clear account-disabled state and no mutation controls.

- [ ] **Step 5: Build the H5 app and run the browser smoke check.**

Run the existing H5 watch server and verify `/pages/profile/index` and `/pages/profile-edit/index` render without runtime errors. Use companion to edit a nickname, reload, and verify the updated value remains visible.

## Task 5: Create the protected `manage/` console skeleton

**Files:**
- Create: `manage/package.json`
- Create: `manage/index.html`
- Create: `manage/tsconfig.json`
- Create: `manage/vite.config.ts`
- Create: `manage/src/main.tsx`
- Create: `manage/src/App.tsx`
- Create: `manage/src/api.ts`
- Create: `manage/src/types.ts`
- Create: `manage/src/styles.css`
- Create: `manage/src/pages/Login.tsx`
- Create: `manage/src/tests/api.test.ts`

- [ ] **Step 1: Add the manage app package and scripts.**

Use React 18, Vite, TypeScript, Vitest, and Testing Library. Add scripts `dev`, `build`, and `test`. Configure Vite to proxy `/api` to `http://localhost:3017` during development and serve the app from `manage/`.

- [ ] **Step 2: Write API client tests before the client.**

Test that a 401 clears the token and returns to login, a 403 produces an explicit no-permission error, query parameters are encoded, and mutation methods send JSON bodies. Run `npm test` in `manage/` and verify the tests fail because `api.ts` is not implemented.

- [ ] **Step 3: Implement typed API client and app shell.**

Store only the JWT in session storage, provide `login`, `getOverview`, `listUsers`, `getUserDetail`, `updateUserStatus`, `updateUserRole`, and `updateUserNote`, and render `Login` until a token exists. Keep all API responses typed and surface network errors as user-facing state.

- [ ] **Step 4: Add the visual system.**

Use a desktop-first layout with a narrow navigation rail, top header, white content surface, orange primary action, dark ink text, muted green status, and red destructive actions. Keep tables dense and scannable, avoid nested cards, and support a single-column layout below 900px.

## Task 6: Implement manage dashboard, user list, and detail workflows

**Files:**
- Create: `manage/src/components/StatCard.tsx`
- Create: `manage/src/components/UserFilters.tsx`
- Create: `manage/src/components/UserTable.tsx`
- Create: `manage/src/pages/Dashboard.tsx`
- Create: `manage/src/pages/UserDetail.tsx`
- Create: `manage/src/tests/user-management.test.tsx`
- Modify: `manage/src/App.tsx`
- Modify: `manage/src/styles.css`

- [ ] **Step 1: Write UI tests for the core workflow.**

Cover overview stat rendering, keyword/status filtering, opening a user detail view, confirmation before disabling, successful status refresh, and 403 display. Use a small in-memory API fixture, not broad DOM snapshots.

- [ ] **Step 2: Implement overview and filters.**

Render four stats, a searchable/filterable toolbar, loading/empty/error states, and paginated users. Preserve search/filter values when a request fails and expose a retry action.

- [ ] **Step 3: Implement table and detail view.**

Render nickname/avatar, level, city, role, status, last active time, and action controls. Detail view displays profile/stat/activity sections and allows status, role, and note changes. Destructive or privilege-changing actions use a confirmation dialog and update only after a successful API response.

- [ ] **Step 4: Run manage tests and production build.**

Run:

```bash
cd manage
npm test -- --run
npm run build
```

Expected: UI tests pass and Vite outputs a production bundle without TypeScript errors.

## Task 7: End-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `manage/src/*` only if browser verification finds a UI defect

- [ ] **Step 1: Start the backend and both frontends.**

Run the Nest server on port 3017, the existing Taro H5 app on port 10086, and the manage Vite server on its configured port. Confirm the backend uses the development SQLite database and development login remains explicitly enabled.

- [ ] **Step 2: Verify user flows in companion.**

Open the miniapp profile route, edit a profile field, toggle a preference, log out, and confirm the page handles a disabled account response without a crash.

- [ ] **Step 3: Verify admin flows in companion.**

Open `manage/`, log in with a development admin fixture, search/filter users, open details, update a note, disable and restore a user, and verify the table refreshes. Attempt the same route with a normal user token and confirm 403/no-permission UI.

- [ ] **Step 4: Run final verification commands.**

```bash
cd server && npm test -- --runInBand && npm run build
cd ../manage && npm test -- --run && npm run build
cd .. && git diff --check
```

Expected: backend tests/build and manage tests/build pass; browser flows complete; unrelated dirty files remain untouched.

- [ ] **Step 5: Update README with exact local commands.**

Document `cd server && npm run start:dev`, `cd manage && npm run dev`, the Taro H5 command, the development login behavior, and the admin route. Do not document real credentials or production secrets.
