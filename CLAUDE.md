# whoop-up — Claude Code Guide

## Project Overview

`whoop-up` is a TypeScript CLI tool that fetches, analyzes, and visualizes health data from the WHOOP API v2. It is published to npm and installed globally: `npm install -g whoop-up`.

**Origin:** Built on top of [whoop-cli](https://github.com/xonika9/whoop-cli) by xonika9. Extended with:
- Trend analysis, health insights, full dashboard, interactive HTML charts
- Retry logic, `--days` shorthand, summary averages, per-minute rate limit awareness

---

## Architecture

```
src/
├── index.ts              Entry point — loads .env, runs Commander program
├── cli.ts                All CLI commands (Commander.js)
├── api/
│   ├── endpoints.ts      Base URL, named endpoint paths, byId helpers
│   └── client.ts         All API functions + retry logic + pagination
├── auth/
│   ├── oauth.ts          OAuth 2.0 login/logout/status/refresh
│   └── tokens.ts         Token storage at ~/.whoop-up/tokens.json
├── charts/
│   └── generator.ts      HTML chart generation (ApexCharts, opens in browser)
├── types/
│   └── whoop.ts          All TypeScript interfaces matching the WHOOP API schema
└── utils/
    ├── date.ts           Date helpers, WHOOP day boundary (4am cutoff)
    ├── format.ts         CLI output formatting, summary stats computation
    ├── analysis.ts       Trend analysis, health insights generation
    └── errors.ts         WhoopError class, ExitCode enum, handleError()
```

**Build output:** `dist/` (compiled JS + `.d.ts` + sourcemaps)
**Binary:** `dist/index.js` — wired to `whoop` via `package.json` `bin` field

---

## WHOOP API v2

**Base URL:** `https://api.prod.whoop.com/developer/v2`
**Auth:** OAuth 2.0 Authorization Code flow
**Token URL:** `https://api.prod.whoop.com/oauth/oauth2/token`

### Endpoints we use

| Endpoint | Function |
|---|---|
| `GET /user/profile/basic` | `getProfile()` |
| `GET /user/measurement/body` | `getBody()` |
| `GET /activity/sleep` | `getSleep()` |
| `GET /activity/sleep/{id}` | `getSleepById(id)` |
| `GET /recovery` | `getRecovery()` |
| `GET /cycle` | `getCycle()` |
| `GET /cycle/{id}` | `getCycleById(id)` |
| `GET /cycle/{id}/sleep` | `getSleepForCycle(cycleId)` |
| `GET /cycle/{id}/recovery` | `getRecoveryForCycle(cycleId)` |
| `GET /activity/workout` | `getWorkout()` |
| `GET /activity/workout/{id}` | `getWorkoutById(id)` |
| `DELETE /user/access` | Called by `logout()` to revoke on WHOOP server |

### Endpoints NOT used (in spec but unimplemented)
- `GET /v1/activity-mapping/{activityV1Id}` — maps legacy v1 activity IDs to v2 UUIDs (migration utility, low priority)

### Pagination
All collection endpoints support: `limit` (max 25), `start`, `end`, `nextToken`.
`fetchAll()` in `client.ts` handles multi-page fetching with a 50-page safety cap.

### Rate limiting
The client retries on HTTP `{429, 500, 502, 503, 504}` with exponential backoff starting at 1s, max 3 retries.

**API rate limits (enforced by WHOOP):**
- **100 requests per minute** ← the binding constraint
- 10,000 requests per day

**During tests and development — always respect the per-minute limit:**
- Tests must use pure in-memory mocks/fixtures — never call the live API
- Avoid running multiple `--all` fetches in quick succession in scripts
- If writing a script that loops over multiple commands, add a delay between calls
- The `fetchAll()` 50-page safety cap helps stay within daily limits, but the minute limit is the one that bites in practice

---

## Critical Type System Rules

### `score_state` is always checked before accessing `score`

Every scored record (`WhoopSleep`, `WhoopRecovery`, `WhoopWorkout`, `WhoopCycle`) has:
```typescript
score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE'
score?: <ScoreType>  // ONLY present when score_state === 'SCORED'
```

**Always filter before accessing `score`:**
```typescript
// Correct
const scored = records.filter(r => r.score_state === 'SCORED' && r.score != null);
const value = scored[0].score!.hrv_rmssd_milli;

// Wrong — will crash on PENDING_SCORE records
const value = records[0].score.hrv_rmssd_milli;
```

This pattern is applied consistently throughout `format.ts` and `analysis.ts`.

### `WhoopCycle` does NOT have a `recovery` field

The WHOOP API `/v2/cycle` response does **not** embed recovery data. Recovery is a separate resource linked by `cycle_id`. Use `getRecoveryForCycle(cycleId)` or the `/v2/recovery` collection endpoint.

### `WhoopSleep.id` is a UUID string, not a number

The API returns sleep IDs as UUID strings (e.g. `"ecfc6a15-4661-442f-a9a4-f160dd7afae8"`). Cycle IDs are integers.

### Optional score subfields

Some score fields are only present on WHOOP 4.0+ hardware:
- `RecoveryScore.spo2_percentage` — optional
- `RecoveryScore.skin_temp_celsius` — optional

Some sleep score fields may be absent if WHOOP has insufficient data:
- `SleepScore.sleep_performance_percentage` — optional
- `SleepScore.sleep_consistency_percentage` — optional
- `SleepScore.sleep_efficiency_percentage` — optional

Always use `?.` or null checks for these.

---

## Key Design Decisions

### Default date range is last 7 days (not today)
Unlike the original `whoopskill_v2`, all data commands default to `--days 7`. This matches the Python skill's behavior and produces more useful results by default.

### WHOOP day boundary = 4am
WHOOP considers a new "day" to start at 4:00 AM. `getWhoopDay()` in `date.ts` handles this — calls before 4am still reference the previous calendar day.

### Token storage at `~/.whoop-up/tokens.json`
Permissions: directory `0700`, file `0600`. Tokens auto-refresh 15 minutes before expiry (`REFRESH_BUFFER_SECONDS = 900`).

### Logout revokes server-side
`logout()` calls `DELETE /v2/user/access` before clearing the local token file. If the server call fails (expired token, network error), it still clears locally and logs a note — never leaves user in a broken state.

### No circular imports: auth ↔ client
`client.ts` imports from `auth/tokens.ts`. `auth/oauth.ts` must NOT import from `client.ts`. The revoke call in `oauth.ts` is implemented as a raw `fetch()` to avoid the cycle.

### Charts use CDN ApexCharts
`charts/generator.ts` produces self-contained HTML files referencing `https://cdn.jsdelivr.net/npm/apexcharts@3`. No local chart dependencies. Files are written to `os.tmpdir()` and opened with the `open` package, or saved with `--output`.

---

## CLI Commands Reference

```bash
# Auth
whoop auth login
whoop auth logout        # revokes on WHOOP server + clears local tokens
whoop auth status
whoop auth refresh

# Data collection (all support: -n/--days, -s/--start, -e/--end, -d/--date, -l/--limit, -a/--all, -p/--pretty)
whoop sleep [options]
whoop recovery [options]
whoop workout [options]
whoop cycle [options]
whoop profile
whoop body

# Multi-day summary with averages (HRV, RHR, sleep%, sleep hours, strain)
whoop summary [-n days] [-s start] [-e end] [-c/--color] [--json]

# Trend analysis — days must be 7, 14, or 30
whoop trends [-n 7|14|30] [--json]

# AI-style insights
whoop insights [-n days] [--json]

# Full terminal dashboard with today's data and 7-day trends
whoop dashboard [--json]

# HTML charts — opens in browser
whoop chart <sleep|recovery|strain|hrv|dashboard> [-n days] [-o output.html]

# By-ID lookups
whoop get <sleep|workout|cycle> <id>
whoop cycle-sleep <cycleId>       # sleep linked to a cycle
whoop cycle-recovery <cycleId>    # recovery linked to a cycle
```

---

## Development Workflow

```bash
# Install and build
npm install        # also runs 'prepare' → 'npm run build'

# Development (run without building)
npm run dev -- sleep --days 7

# Build TypeScript → dist/
npm run build

# Test locally as installed CLI
npm install -g .
whoop --help

# One-shot run (compiled)
node dist/index.js summary --color
```

### Environment variables (copy from `.env.example`)
```
WHOOP_CLIENT_ID=...
WHOOP_CLIENT_SECRET=...
WHOOP_REDIRECT_URI=http://localhost:9876/callback
```

Place in `.env` at project root — loaded by `dotenv` at startup.

---

## Publishing to npm

```bash
# First-time login
npm login

# Publish (prepare hook auto-builds)
npm publish --access public

# Users install with:
npm install -g whoop-up
```

Version is set in `package.json`. Bump it before each publish.

---

## Adding a New Feature — Checklist

1. **New endpoint?** Add to `src/api/endpoints.ts` (`ENDPOINTS` or `byId`), implement in `src/api/client.ts`, wire up in `src/cli.ts`
2. **New type?** Add to `src/types/whoop.ts`. If it has a score, use `ScoreState` + optional `score?`
3. **New CLI command?** Add in `src/cli.ts` before the root flags block
4. **New chart?** Add to `src/charts/generator.ts`, add `case` to the `chart` command in `cli.ts`
5. **Always run:** `npm run build` — zero TypeScript errors required before committing

---

## File Ownership Map

| What you want to change | File to edit |
|---|---|
| API endpoint URLs | `src/api/endpoints.ts` |
| Retry logic, pagination, API auth | `src/api/client.ts` |
| OAuth login/logout/token refresh | `src/auth/oauth.ts` |
| Token storage location/format | `src/auth/tokens.ts` |
| TypeScript types matching API | `src/types/whoop.ts` |
| CLI commands and options | `src/cli.ts` |
| Terminal output formatting | `src/utils/format.ts` |
| Trend/insight calculations | `src/utils/analysis.ts` |
| Date helpers, WHOOP day boundary | `src/utils/date.ts` |
| Error codes and handling | `src/utils/errors.ts` |
| HTML chart generation | `src/charts/generator.ts` |
| Science-backed health reference | `references/health_analysis.md` |

---

## Known Constraints

- `limit` max is **25** per page (enforced by WHOOP API — sending higher values is silently capped)
- `trends` command only accepts 7, 14, or 30 days (enforced in CLI; `analyzeTrends()` itself accepts any number)
- Token expiry buffer is 15 minutes — cron jobs should call `auth refresh` before running to ensure a fresh token
- `sport_id` on workouts is deprecated and will stop appearing after 09/01/2025 — use `sport_name`
- `v1_id` on sleep/workout records is deprecated and will stop appearing after 09/01/2025
- SpO2 and skin temperature only appear for WHOOP 4.0+ hardware users — always check for `null`
