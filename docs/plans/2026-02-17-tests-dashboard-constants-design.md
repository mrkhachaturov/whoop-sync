# Design: Tests, Dashboard Command, and Constants — whoop-sync

**Date:** 2026-02-17
**Approach:** Sequential (A) — constants → dashboard → tests

---

## Context

`whoop-sync` is a TypeScript CLI for WHOOP API v2 data. A reference project (`whoop-cli`) exists with:
- A test suite (5 files, ~30 tests, Node.js built-in `node:test`)
- A `utils/constants.ts` extracting health thresholds
- A `dashboard` CLI command (text-based terminal dashboard with 7-day trends)

`whoop-sync` has neither tests nor these two features. This plan adds all three, in dependency order.

---

## Step 1 — `src/utils/constants.ts`

Extract all hardcoded health thresholds from `format.ts` and `analysis.ts` into a new constants file. No behavior changes — purely a refactor.

**Constants to extract:**

| Constant | Value | Source |
|---|---|---|
| `RECOVERY_GREEN` | 67 | format.ts:142, analysis.ts:133 |
| `RECOVERY_YELLOW` | 34 | format.ts:142, analysis.ts:141 |
| `SLEEP_PERF_GREEN` | 85 | format.ts:150 |
| `SLEEP_PERF_YELLOW` | 70 | format.ts:150 |
| `SLEEP_EFFICIENCY_TARGET` | 85 | analysis.ts:203 |
| `STRAIN_OPTIMAL_GREEN` | 14 | format.ts:159, analysis.ts:229 |
| `STRAIN_OPTIMAL_YELLOW` | 10 | format.ts:159, analysis.ts:230 |
| `STRAIN_OPTIMAL_RED` | 6 | format.ts:159, analysis.ts:230 |
| `STRAIN_TOLERANCE` | 2 | format.ts:161 |
| `STRAIN_COLOR_TOLERANCE` | 4 | format.ts:161 |
| `HRV_LOW_MULTIPLIER` | 0.8 | analysis.ts:164 |
| `HRV_HIGH_MULTIPLIER` | 1.1 | analysis.ts:172 |
| `REM_SLEEP_MIN_PCT` | 15 | analysis.ts:217 |
| `SLEEP_DEBT_CRITICAL` | 2 | analysis.ts:185 |
| `SLEEP_DEBT_WARNING` | 1 | analysis.ts:193 |

**Files modified:** `src/utils/format.ts`, `src/utils/analysis.ts` (add import, replace literals)

---

## Step 2 — `dashboard` CLI Command

A text-based terminal dashboard for today's health data + 7-day trend comparison. Different from `chart dashboard` (which generates HTML). Command:

```
whoop-sync dashboard [-d/--date <date>] [--json]
```

### `src/utils/format.ts` additions

Add `DashboardData` interface:
```typescript
export interface DashboardData {
  today: WhoopData;
  recoveryHistory: WhoopRecovery[];
  sleepHistory: WhoopSleep[];
  cycleHistory: WhoopCycle[];
  trends: TrendData;
}
```

Add `formatDashboard(d: DashboardData): string` — ported from whoop-cli, adapted for whoop-sync:
- Uses `score_state === 'SCORED'` filtering (whoop-sync pattern)
- Imports constants from `constants.ts`
- Layout: Recovery → Sleep → Strain → 7-Day Trends sections

### `src/cli.ts` additions

New `dashboard` command before the root flags block:
- Fetches today's data (`profile`, `recovery`, `sleep`, `cycle`, `workout`) + 7-day history in parallel
- Calls `analyzeTrends()` → `formatDashboard()`
- `--json` outputs raw `{ today, recoveryHistory, sleepHistory, cycleHistory }` JSON

### `CLAUDE.md` update

Add `whoop-sync dashboard` to the CLI Commands Reference section.

---

## Step 3 — Test Suite

**Framework:** Node.js built-in `node:test` + `node:assert/strict` — no new dependencies
**Runner:** `tsx --test tests/**/*.test.ts`

### `package.json` change

Add to `scripts`:
```json
"test": "tsx --test tests/**/*.test.ts"
```

### Test files

#### `tests/utils/errors.test.ts` (3 tests)
Direct port from whoop-cli. Tests:
- `ExitCode` enum values (0–4)
- `WhoopError` stores message, code, statusCode correctly
- `WhoopError` is instanceof Error

#### `tests/utils/date.test.ts` (5 tests)
Direct port from whoop-cli. Tests:
- `getWhoopDay()` returns YYYY-MM-DD format
- 4am boundary: before 4am → previous day
- 4am boundary: after 4am → same day
- `validateISODate()` accepts valid / rejects invalid formats and month 13
- `getDaysAgo(7)` returns correct date
- `getDateRange()` returns start/end ISO strings
- `nowISO()` returns valid ISO string

#### `tests/utils/analysis.test.ts` (7 tests)
Port from whoop-cli, with fixture adaptations:
- Add `score_state: 'SCORED'` to all recovery/sleep/cycle fixtures
- `WhoopSleep.id` → UUID string (e.g. `"sleep-1"`)
- `WhoopRecovery.sleep_id` → UUID string
- `WhoopCycle` — **no** `recovery` field (per OpenAPI spec; whoop-cli's fixtures are wrong here)

Tests:
- `analyzeTrends()` calculates avg/min/max for recovery, HRV, RHR
- Returns null stats for empty arrays
- Handles single record (trend = 'stable')
- `generateInsights()` produces good/warning/critical recovery insights
- `generateInsights()` returns empty array for no data
- `generateInsights()` detects HRV below baseline

#### `tests/utils/format.test.ts` (10 tests)
Port from whoop-cli + adapt + extend. Fixture adaptations:
- Add `score_state: 'SCORED'` to all record fixtures
- Sleep `id` → UUID string
- Recovery `sleep_id` → UUID string
- `WhoopCycle` → no `recovery` field
- `sleep_performance_percentage`, `sleep_efficiency_percentage` are optional — keep values present in fixtures but test null-safety

Tests:
- `formatPretty()` includes all sections with full data
- `formatPretty()` handles empty data gracefully
- `formatPretty()` shows SpO2 when value is 0 (null-check edge case)
- `formatPretty()` does not show SpO2 when null
- `formatSummary()` returns single-line format
- `formatSummary()` shows "No data" for empty data
- `formatSummaryColor()` shows green (🟢) for high recovery
- `formatSummaryColor()` shows red (🔴) for low recovery
- `formatDashboard()` includes all 4 sections (Recovery, Sleep, Strain, 7-Day Trends)
- `formatSummaryStats()` formats averages correctly (whoop-sync-specific)

#### `tests/cli/cli.test.ts` (3 tests)
Port from whoop-cli. Adapted:
- `--help` check asserts `dashboard` and `chart` commands appear (whoop-sync has both)

Tests:
- `--version` outputs package.json version
- `--help` exits with 0 and shows key commands (sleep, recovery, dashboard, chart)
- `trends --days 5` exits with non-zero and stderr contains "7, 14, or 30"

---

## Type System Notes (from OpenAPI spec)

These are confirmed by `/Volumes/storage/01_Projects/whoop/openapi.json`:
- `WhoopSleep.id` → `string` (UUID format)
- `WhoopRecovery.sleep_id` → `string` (UUID format)
- `WhoopCycle` has **no** `recovery` field — whoop-cli's test fixtures are incorrect
- `score_state` enum: `SCORED | PENDING_SCORE | UNSCORABLE` on all 4 record types
- Optional on `SleepScore`: `respiratory_rate`, `sleep_performance_percentage`, `sleep_consistency_percentage`, `sleep_efficiency_percentage`
- Optional on `RecoveryScore`: `spo2_percentage`, `skin_temp_celsius`

---

## File Changelist

| File | Change |
|---|---|
| `src/utils/constants.ts` | **New** — health thresholds |
| `src/utils/format.ts` | Import constants; add `DashboardData` + `formatDashboard()` |
| `src/utils/analysis.ts` | Import constants (replace inline literals) |
| `src/cli.ts` | Add `dashboard` command |
| `CLAUDE.md` | Document `dashboard` command |
| `package.json` | Add `"test"` script |
| `tests/utils/errors.test.ts` | **New** |
| `tests/utils/date.test.ts` | **New** |
| `tests/utils/analysis.test.ts` | **New** |
| `tests/utils/format.test.ts` | **New** |
| `tests/cli/cli.test.ts` | **New** |
