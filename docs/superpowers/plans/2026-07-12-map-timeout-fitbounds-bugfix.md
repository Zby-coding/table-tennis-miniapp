# Map Timeout And FitBounds Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the mini-program home map from emitting location timeout and Tencent map `lat` errors while keeping all valid venue markers at their real coordinates.

**Architecture:** Keep the map controlled by a validated, stable marker list and a stable initial center. Remove timeout-as-error behavior from optional location acquisition, and make network loading fall back without blocking map rendering. Verify both source and generated `dist` artifacts before handing off to WeChat DevTools.

**Tech Stack:** Taro 4, React, WeChat Mini Program map, TypeScript, NestJS API.

---

### Task 1: Reproduce and trace the two error paths

**Files:**
- Inspect: `src/pages/index/index.tsx`
- Inspect: `src/services/api.ts`
- Inspect: `dist/pages/index/index.js`

- [ ] **Step 1: Confirm current triggers**

Run:
```powershell
rg -n "Promise\.race|location timeout|includePoints|fitBounds|markers|latitude|longitude|setTimeout" src/pages/index/index.tsx src/services/api.ts dist/pages/index/index.js
```

Expected: the location race contains a rejected `location timeout`, and the map receives markers after asynchronous data replacement.

- [ ] **Step 2: Confirm marker data invariants**

Run:
```powershell
rg -n "lat:|lng:|latitude:|longitude:" src/pages/index/index.tsx
```

Expected: every marker passed to the map is derived from `isValidCoord(court.lat, court.lng)` and no display offset is present.

### Task 2: Make location acquisition non-erroring and bounded

**Files:**
- Modify: `src/pages/index/index.tsx:104-121`

- [ ] **Step 1: Replace rejected timeout race with a silent fallback**

Use a timeout promise that resolves to `null`, then use the city default when location is unavailable:

```ts
const getLocation = useCallback(async () => {
  try {
    const res = await Promise.race([
      Taro.getLocation({ type: 'gcj02' }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    const loc = res && isValidCoord(res.latitude, res.longitude)
      ? { lat: Number(res.latitude), lng: Number(res.longitude) }
      : DEFAULT_LOCATION;
    setUserLocation(loc);
    return loc;
  } catch {
    setUserLocation(DEFAULT_LOCATION);
    return DEFAULT_LOCATION;
  }
}, []);
```

- [ ] **Step 2: Run the type/build check**

Run:
```powershell
npm run build:weapp:direct
```

Expected: build succeeds and no `location timeout` string remains in `dist/pages/index/index.js`.

### Task 3: Stabilize the map marker update path

**Files:**
- Modify: `src/pages/index/index.tsx:210-243, 278-296`

- [ ] **Step 1: Keep the map center stable during data refresh**

Use a stable center derived from the city default or the first valid city point, and do not bind it to every asynchronous court list change. Keep marker objects limited to valid finite coordinates and numeric IDs.

- [ ] **Step 2: Remove map properties that cause implicit bounds fitting**

Keep the map controlled by `latitude`, `longitude`, and `scale`; do not add `includePoints`, `fitBounds`, or any empty/undefined point entry. Preserve real `latitude/longitude` values without offsets.

- [ ] **Step 3: Add a regression guard in marker construction**

Ensure the final marker list is filtered after normalization:

```ts
const markers = useMemo(() => courts
  .map(normalizeCourt)
  .filter((court) => Number.isFinite(court.id) && isValidCoord(court.lat, court.lng))
  .map((court) => ({
    id: court.id,
    latitude: court.lat,
    longitude: court.lng,
    // existing visual/callout fields remain unchanged
  })), [courts]);
```

### Task 4: Build and validate generated mini-program output

**Files:**
- Regenerate: `dist/pages/index/index.js`
- Regenerate: `dist/pages/index/index.json`

- [ ] **Step 1: Build the mini-program**

Run:
```powershell
npm run build:weapp:direct
```

Expected: exit code 0 and `dist/app.json` exists for `project.config.json`'s `miniprogramRoot`.

- [ ] **Step 2: Scan generated output for regressions**

Run:
```powershell
rg -n "location timeout|includePoints|fitBounds|displayLat|displayLng|new Map" src/pages/index/index.tsx dist/pages/index/index.js
```

Expected: no matches.

- [ ] **Step 3: Validate backend data independently**

With the backend on port 3017, run:
```powershell
Invoke-RestMethod "http://localhost:3017/api/courts/nearby?lat=32.9864&lng=112.5349&radius=150000"
```

Expected: response code is 0, data is an array, and every returned court has finite `lat` and `lng`.

- [ ] **Step 4: Verify the worktree diff**

Run:
```powershell
git diff --check
```

Expected: no whitespace errors in source changes.
