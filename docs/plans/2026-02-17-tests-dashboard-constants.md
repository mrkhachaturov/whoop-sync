# Tests, Dashboard Command, and Constants Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `src/utils/constants.ts` (extract health thresholds), a text-based `dashboard` CLI command, and a full test suite (5 files, ~33 tests) to whoop-sync.

**Architecture:** Sequential — constants first (pure refactor, no behavior change), then dashboard (uses constants), then tests (cover everything including dashboard). Tests use Node.js built-in `node:test` with `tsx` as runner — no new dependencies.

**Tech Stack:** TypeScript, Node.js `node:test` + `node:assert/strict`, `tsx` (already in devDependencies)

---

## Task 1: Create `src/utils/constants.ts`

**Files:**
- Create: `src/utils/constants.ts`

**Step 1: Create the file**

```typescript
// src/utils/constants.ts

// Recovery zones (percentage thresholds)
export const RECOVERY_GREEN = 67;
export const RECOVERY_YELLOW = 34;

// Sleep performance thresholds
export const SLEEP_PERF_GREEN = 85;
export const SLEEP_PERF_YELLOW = 70;

// Sleep efficiency target
export const SLEEP_EFFICIENCY_TARGET = 85;

// HRV deviation thresholds (multipliers vs average)
export const HRV_LOW_MULTIPLIER = 0.8;
export const HRV_HIGH_MULTIPLIER = 1.1;

// REM sleep target percentage
export const REM_SLEEP_MIN_PCT = 15;

// Sleep debt thresholds (hours)
export const SLEEP_DEBT_CRITICAL = 2;
export const SLEEP_DEBT_WARNING = 1;

// Optimal strain targets by recovery zone
export const STRAIN_OPTIMAL_GREEN = 14;
export const STRAIN_OPTIMAL_YELLOW = 10;
export const STRAIN_OPTIMAL_RED = 6;

// Strain deviation tolerance
export const STRAIN_TOLERANCE = 2;
export const STRAIN_COLOR_TOLERANCE = 4;
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: Zero TypeScript errors.

---

## Task 2: Update `src/utils/format.ts` to use constants

**Files:**
- Modify: `src/utils/format.ts`

**Step 1: Add imports at top of file**

After the existing import on line 1, add:

```typescript
import {
  RECOVERY_GREEN, RECOVERY_YELLOW,
  SLEEP_PERF_GREEN, SLEEP_PERF_YELLOW,
  STRAIN_OPTIMAL_GREEN, STRAIN_OPTIMAL_YELLOW, STRAIN_OPTIMAL_RED,
  STRAIN_TOLERANCE, STRAIN_COLOR_TOLERANCE,
} from './constants.js';
```

**Step 2: Replace hardcoded literals in `formatSummaryColor`**

Find and replace:
```typescript
    const icon = statusIcon(r.recovery_score, 67, 34);
```
With:
```typescript
    const icon = statusIcon(r.recovery_score, RECOVERY_GREEN, RECOVERY_YELLOW);
```

Find and replace:
```typescript
    const icon = statusIcon(perf, 85, 70);
```
With:
```typescript
    const icon = statusIcon(perf, SLEEP_PERF_GREEN, SLEEP_PERF_YELLOW);
```

Find and replace:
```typescript
    const optimal = recoveryScore >= 67 ? 14 : recoveryScore >= 34 ? 10 : 6;
    const diff = Math.abs(c.strain - optimal);
    const icon = diff <= 2 ? '🟢' : diff <= 4 ? '🟡' : '🔴';
```
With:
```typescript
    const optimal = recoveryScore >= RECOVERY_GREEN ? STRAIN_OPTIMAL_GREEN : recoveryScore >= RECOVERY_YELLOW ? STRAIN_OPTIMAL_YELLOW : STRAIN_OPTIMAL_RED;
    const diff = Math.abs(c.strain - optimal);
    const icon = diff <= STRAIN_TOLERANCE ? '🟢' : diff <= STRAIN_COLOR_TOLERANCE ? '🟡' : '🔴';
```

**Step 3: Replace hardcoded literals in `formatSummaryStats`**

Find and replace:
```typescript
    const icon = color ? (stats.avgRecovery >= 67 ? '🟢' : stats.avgRecovery >= 34 ? '🟡' : '🔴') : '💚';
```
With:
```typescript
    const icon = color ? (stats.avgRecovery >= RECOVERY_GREEN ? '🟢' : stats.avgRecovery >= RECOVERY_YELLOW ? '🟡' : '🔴') : '💚';
```

Find and replace:
```typescript
    const icon = color ? (stats.avgSleepPerf >= 85 ? '🟢' : stats.avgSleepPerf >= 70 ? '🟡' : '🔴') : '😴';
```
With:
```typescript
    const icon = color ? (stats.avgSleepPerf >= SLEEP_PERF_GREEN ? '🟢' : stats.avgSleepPerf >= SLEEP_PERF_YELLOW ? '🟡' : '🔴') : '😴';
```

**Step 4: Verify it compiles**

Run: `npm run build`
Expected: Zero TypeScript errors.

**Step 5: Commit**

```bash
git add src/utils/constants.ts src/utils/format.ts
git commit -m "refactor: extract health thresholds into constants.ts"
```

---

## Task 3: Update `src/utils/analysis.ts` to use constants

**Files:**
- Modify: `src/utils/analysis.ts`

**Step 1: Add import at top of file**

After the existing import on line 1, add:

```typescript
import {
  RECOVERY_GREEN, RECOVERY_YELLOW,
  SLEEP_EFFICIENCY_TARGET,
  HRV_LOW_MULTIPLIER, HRV_HIGH_MULTIPLIER,
  REM_SLEEP_MIN_PCT,
  SLEEP_DEBT_CRITICAL, SLEEP_DEBT_WARNING,
  STRAIN_OPTIMAL_GREEN, STRAIN_OPTIMAL_YELLOW, STRAIN_OPTIMAL_RED,
  STRAIN_TOLERANCE,
} from './constants.js';
```

**Step 2: Replace literals in `generateInsights`**

Replace each hardcoded literal:

| Find | Replace with |
|---|---|
| `today.recovery_score >= 67` | `today.recovery_score >= RECOVERY_GREEN` |
| `today.recovery_score >= 34` | `today.recovery_score >= RECOVERY_YELLOW` |
| `today.hrv_rmssd_milli < avgHrv * 0.8` | `today.hrv_rmssd_milli < avgHrv * HRV_LOW_MULTIPLIER` |
| `today.hrv_rmssd_milli > avgHrv * 1.1` | `today.hrv_rmssd_milli > avgHrv * HRV_HIGH_MULTIPLIER` |
| `if (sleepDebt > 2)` | `if (sleepDebt > SLEEP_DEBT_CRITICAL)` |
| `else if (sleepDebt > 1)` | `else if (sleepDebt > SLEEP_DEBT_WARNING)` |
| `todaySleep.sleep_efficiency_percentage < 85` | `todaySleep.sleep_efficiency_percentage < SLEEP_EFFICIENCY_TARGET` |
| `if (remPct > 0 && remPct < 15)` | `if (remPct > 0 && remPct < REM_SLEEP_MIN_PCT)` |

In the strain section, replace:
```typescript
    const optimalStrain = today.recovery_score >= 67 ? 14
      : today.recovery_score >= 34 ? 10
      : 6;

    const remaining = optimalStrain - todayCycle.strain;
    if (remaining > 2) {
```
With:
```typescript
    const optimalStrain = today.recovery_score >= RECOVERY_GREEN ? STRAIN_OPTIMAL_GREEN
      : today.recovery_score >= RECOVERY_YELLOW ? STRAIN_OPTIMAL_YELLOW
      : STRAIN_OPTIMAL_RED;

    const remaining = optimalStrain - todayCycle.strain;
    if (remaining > STRAIN_TOLERANCE) {
```

And replace:
```typescript
    } else if (todayCycle.strain > optimalStrain + 2) {
```
With:
```typescript
    } else if (todayCycle.strain > optimalStrain + STRAIN_TOLERANCE) {
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Zero TypeScript errors.

**Step 4: Commit**

```bash
git add src/utils/analysis.ts
git commit -m "refactor: use constants in analysis.ts"
```

---

## Task 4: Add `formatDashboard` to `src/utils/format.ts`

**Files:**
- Modify: `src/utils/format.ts`

**Step 1: Add `TrendData` import**

Update the import at the top from:
```typescript
import type { WhoopData, WhoopSleep, WhoopRecovery, WhoopCycle } from '../types/whoop.js';
```
To:
```typescript
import type { WhoopData, WhoopSleep, WhoopRecovery, WhoopCycle } from '../types/whoop.js';
import type { TrendData } from './analysis.js';
```

**Step 2: Append `DashboardData` interface and `formatDashboard` function at the end of the file**

```typescript
export interface DashboardData {
  today: WhoopData;
  recoveryHistory: WhoopRecovery[];
  sleepHistory: WhoopSleep[];
  cycleHistory: WhoopCycle[];
  trends: TrendData;
}

export function formatDashboard(d: DashboardData): string {
  const lines: string[] = [];
  const { today, trends } = d;

  // Pre-compute scored records
  const scoredRecovery = today.recovery?.filter(r => r.score_state === 'SCORED' && r.score != null);
  const scoredSleep = today.sleep?.filter(s => s.score_state === 'SCORED' && s.score != null && !s.nap);
  const scoredCycle = today.cycle?.filter(c => c.score_state === 'SCORED' && c.score != null);
  const scoredWorkout = today.workout?.filter(w => w.score_state === 'SCORED' && w.score != null);

  // Header
  const name = today.profile ? `${today.profile.first_name} ${today.profile.last_name}` : '';
  lines.push(`📅 ${today.date}${name ? ` | ${name}` : ''}`);
  lines.push('');

  // Recovery
  lines.push('── Recovery ──────────────────────────');
  if (scoredRecovery?.length) {
    const r = scoredRecovery[0].score!;
    const icon = r.recovery_score >= RECOVERY_GREEN ? '🟢' : r.recovery_score >= RECOVERY_YELLOW ? '🟡' : '🔴';
    const hrvAvg = trends.hrv?.avg ?? 0;
    const rhrAvg = trends.rhr?.avg ?? 0;
    const hrvDelta = hrvAvg > 0 ? ` (${r.hrv_rmssd_milli > hrvAvg ? '↑' : r.hrv_rmssd_milli < hrvAvg ? '↓' : '→'} vs ${hrvAvg.toFixed(0)} avg)` : '';
    const rhrDelta = rhrAvg > 0 ? ` (${r.resting_heart_rate < rhrAvg ? '↓' : r.resting_heart_rate > rhrAvg ? '↑' : '→'} vs ${rhrAvg.toFixed(0)} avg)` : '';
    lines.push(`${icon} ${r.recovery_score}% | HRV: ${r.hrv_rmssd_milli.toFixed(0)}ms${hrvDelta} | RHR: ${r.resting_heart_rate}bpm${rhrDelta}`);
    const extras: string[] = [];
    if (r.spo2_percentage != null) extras.push(`SpO2: ${r.spo2_percentage}%`);
    if (r.skin_temp_celsius != null) extras.push(`Skin: ${r.skin_temp_celsius.toFixed(1)}°C`);
    if (scoredSleep?.length && scoredSleep[0].score!.respiratory_rate != null) {
      extras.push(`Resp: ${scoredSleep[0].score!.respiratory_rate!.toFixed(1)}/min`);
    }
    if (extras.length) lines.push(`   ${extras.join(' | ')}`);
  } else {
    lines.push('   No recovery data');
  }
  lines.push('');

  // Sleep
  lines.push('── Sleep ─────────────────────────────');
  if (scoredSleep?.length) {
    const s = scoredSleep[0].score!;
    const ss = s.stage_summary;
    const totalSleepMs = ss.total_in_bed_time_milli - ss.total_awake_time_milli;
    const totalH = (ss.total_in_bed_time_milli / 3600000).toFixed(1);
    const deepH = (ss.total_slow_wave_sleep_time_milli / 3600000).toFixed(1);
    const remH = (ss.total_rem_sleep_time_milli / 3600000).toFixed(1);
    const lightH = (ss.total_light_sleep_time_milli / 3600000).toFixed(1);
    const deepPct = totalSleepMs > 0 ? Math.round((ss.total_slow_wave_sleep_time_milli / totalSleepMs) * 100) : 0;
    const remPct = totalSleepMs > 0 ? Math.round((ss.total_rem_sleep_time_milli / totalSleepMs) * 100) : 0;
    lines.push(`😴 ${s.sleep_performance_percentage?.toFixed(0) ?? 'N/A'}% | ${totalH}h total | Efficiency: ${s.sleep_efficiency_percentage?.toFixed(0) ?? 'N/A'}%`);
    lines.push(`   Deep: ${deepH}h (${deepPct}%) | REM: ${remH}h (${remPct}%) | Light: ${lightH}h`);
    lines.push(`   Disturbances: ${ss.disturbance_count} | Consistency: ${s.sleep_consistency_percentage?.toFixed(0) ?? 'N/A'}%`);
    const sn = s.sleep_needed;
    const debtH = (sn.need_from_sleep_debt_milli / 3600000).toFixed(1);
    const needTonightMs = sn.baseline_milli + sn.need_from_sleep_debt_milli + sn.need_from_recent_strain_milli + sn.need_from_recent_nap_milli;
    const needH = (needTonightMs / 3600000).toFixed(1);
    lines.push(`   💤 Sleep debt: ${debtH}h | Need tonight: ${needH}h`);
  } else {
    lines.push('   No sleep data');
  }
  lines.push('');

  // Strain
  lines.push('── Strain ────────────────────────────');
  if (scoredCycle?.length) {
    const c = scoredCycle[0].score!;
    const recoveryScore = scoredRecovery?.[0]?.score?.recovery_score ?? 50;
    const optimal = recoveryScore >= RECOVERY_GREEN ? STRAIN_OPTIMAL_GREEN : recoveryScore >= RECOVERY_YELLOW ? STRAIN_OPTIMAL_YELLOW : STRAIN_OPTIMAL_RED;
    lines.push(`🔥 ${c.strain.toFixed(1)} / ${optimal} optimal | ${(c.kilojoule / 4.184).toFixed(0)} cal`);
  }
  if (scoredWorkout?.length) {
    for (const w of scoredWorkout) {
      const sc = w.score!;
      const ms = new Date(w.end).getTime() - new Date(w.start).getTime();
      const min = Math.round(ms / 60000);
      const dur = min >= 60 ? `${Math.floor(min / 60)}h${min % 60}m` : `${min}min`;
      lines.push(`   ${w.sport_name} (strain ${sc.strain.toFixed(1)}, ${dur})`);
    }
  } else if (!scoredCycle?.length) {
    lines.push('   No strain data');
  }
  lines.push('');

  // 7-Day Trends
  lines.push('── 7-Day Trends ──────────────────────');
  const arrow = (t: 'up' | 'down' | 'stable') => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  if (trends.hrv) {
    const oldest = trends.hrv.values[trends.hrv.values.length - 1];
    lines.push(`   HRV:      ${oldest?.toFixed(0) ?? '?'} → ${trends.hrv.current.toFixed(0)}ms ${arrow(trends.hrv.trend)}  (range ${trends.hrv.min.toFixed(0)}-${trends.hrv.max.toFixed(0)})`);
  }
  if (trends.rhr) {
    const oldest = trends.rhr.values[trends.rhr.values.length - 1];
    lines.push(`   RHR:      ${oldest ?? '?'} → ${trends.rhr.current}bpm ${arrow(trends.rhr.trend)}  (range ${trends.rhr.min}-${trends.rhr.max})`);
  }
  if (trends.recovery) {
    const oldest = trends.recovery.values[trends.recovery.values.length - 1];
    lines.push(`   Recovery: ${oldest ?? '?'} → ${trends.recovery.current}% ${arrow(trends.recovery.trend)}`);
  }
  if (trends.sleepHours) {
    const oldest = trends.sleepHours.values[trends.sleepHours.values.length - 1];
    lines.push(`   Sleep:    ${oldest?.toFixed(1) ?? '?'} → ${trends.sleepHours.current.toFixed(1)}h ${arrow(trends.sleepHours.trend)}`);
  }
  if (trends.strain) {
    lines.push(`   Strain:   ${trends.strain.avg.toFixed(1)} avg (range ${trends.strain.min.toFixed(1)}-${trends.strain.max.toFixed(1)})`);
  }

  return lines.join('\n');
}
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Zero TypeScript errors.

---

## Task 5: Add `dashboard` command to `src/cli.ts` and update `CLAUDE.md`

**Files:**
- Modify: `src/cli.ts`
- Modify: `CLAUDE.md`

**Step 1: Add `formatDashboard` to the format.ts import in cli.ts**

Find the existing import block:
```typescript
import {
  formatPretty,
  formatSummaryColor,
  formatSummaryStats,
  computeSummaryStats,
} from './utils/format.js';
```

Replace with:
```typescript
import {
  formatPretty,
  formatSummaryColor,
  formatSummaryStats,
  computeSummaryStats,
  formatDashboard,
} from './utils/format.js';
```

**Step 2: Add the `dashboard` command to `src/cli.ts`**

Insert the following block between the `// ─── Insights` block and the `// ─── Charts` block (i.e., after the `insights` command closes around line 232, before the chart command):

```typescript
// ─── Dashboard ────────────────────────────────────────────────────────────────

program
  .command('dashboard')
  .description('Full health dashboard with today\'s data and 7-day trends')
  .option('--json', 'Output raw JSON instead of formatted text')
  .action(async (options: { json?: boolean }) => {
    try {
      const todayRange = getDaysRange(1);
      const historyRange = getDaysRange(7);

      const [todayData, recoveryHistory, sleepHistory, cycleHistory] = await Promise.all([
        fetchData(['profile', 'recovery', 'sleep', 'cycle', 'workout'], todayRange, { limit: 25, all: true }),
        getRecovery(historyRange, true),
        getSleep(historyRange, true),
        getCycle(historyRange, true),
      ]);

      if (options.json) {
        console.log(JSON.stringify({ today: todayData, recoveryHistory, sleepHistory, cycleHistory }, null, 2));
        return;
      }

      const trends = analyzeTrends(recoveryHistory, sleepHistory, cycleHistory, 7);
      console.log(formatDashboard({ today: todayData, recoveryHistory, sleepHistory, cycleHistory, trends }));
    } catch (error) {
      handleError(error);
    }
  });
```

**Step 3: Add `dashboard` to the CLI Commands Reference in `CLAUDE.md`**

Find the section:
```
# AI-style insights
whoop-sync insights [-n days] [--json]
```

Add after it:
```
# Full terminal dashboard with today's data and 7-day trends
whoop-sync dashboard [--json]
```

**Step 4: Verify it compiles**

Run: `npm run build`
Expected: Zero TypeScript errors.

**Step 5: Commit**

```bash
git add src/utils/format.ts src/cli.ts CLAUDE.md
git commit -m "feat: add dashboard command and formatDashboard"
```

---

## Task 6: Add test script to `package.json`

**Files:**
- Modify: `package.json`

**Step 1: Add the test script**

Find:
```json
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prepare": "npm run build"
  },
```

Replace with:
```json
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prepare": "npm run build",
    "test": "tsx --test tests/**/*.test.ts"
  },
```

**Step 2: Create the test directory structure**

```bash
mkdir -p tests/utils tests/cli
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test script"
```

---

## Task 7: `tests/utils/errors.test.ts`

**Files:**
- Create: `tests/utils/errors.test.ts`

**Step 1: Create the file**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WhoopError, ExitCode } from '../../src/utils/errors.js';

describe('ExitCode', () => {
  it('has correct values', () => {
    assert.equal(ExitCode.SUCCESS, 0);
    assert.equal(ExitCode.GENERAL_ERROR, 1);
    assert.equal(ExitCode.AUTH_ERROR, 2);
    assert.equal(ExitCode.RATE_LIMIT, 3);
    assert.equal(ExitCode.NETWORK_ERROR, 4);
  });
});

describe('WhoopError', () => {
  it('stores message, code, and statusCode', () => {
    const err = new WhoopError('test', ExitCode.AUTH_ERROR, 401);
    assert.equal(err.message, 'test');
    assert.equal(err.code, ExitCode.AUTH_ERROR);
    assert.equal(err.statusCode, 401);
    assert.equal(err.name, 'WhoopError');
  });

  it('works without statusCode', () => {
    const err = new WhoopError('msg', ExitCode.GENERAL_ERROR);
    assert.equal(err.statusCode, undefined);
  });

  it('is instanceof Error', () => {
    const err = new WhoopError('msg', ExitCode.GENERAL_ERROR);
    assert.ok(err instanceof Error);
  });
});
```

**Step 2: Run the test**

Run: `npm test`
Expected: 3 tests pass, 0 fail.

**Step 3: Commit**

```bash
git add tests/utils/errors.test.ts
git commit -m "test: add errors.test.ts"
```

---

## Task 8: `tests/utils/date.test.ts`

**Files:**
- Create: `tests/utils/date.test.ts`

**Step 1: Create the file**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getWhoopDay, validateISODate, getDaysAgo, getDateRange, formatDate, nowISO } from '../../src/utils/date.js';

describe('getWhoopDay', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    const result = getWhoopDay();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns previous day for local time before 4am', () => {
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const result = getWhoopDay(d.toISOString());
    const expected = new Date(d);
    expected.setDate(expected.getDate() - 1);
    assert.equal(result, formatDate(expected));
  });

  it('returns same day for local time at or after 4am', () => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    const result = getWhoopDay(d.toISOString());
    assert.equal(result, formatDate(d));
  });
});

describe('validateISODate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    assert.equal(validateISODate('2024-03-15'), true);
  });

  it('rejects invalid format', () => {
    assert.equal(validateISODate('03-15-2024'), false);
    assert.equal(validateISODate('2024/03/15'), false);
    assert.equal(validateISODate('not-a-date'), false);
  });

  it('rejects month 13', () => {
    assert.equal(validateISODate('2024-13-01'), false);
  });
});

describe('getDaysAgo', () => {
  it('returns a date N days in the past', () => {
    const result = getDaysAgo(7);
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    assert.equal(result, formatDate(expected));
  });
});

describe('getDateRange', () => {
  it('returns start/end ISO strings', () => {
    const range = getDateRange('2024-03-15');
    assert.ok(range.start.includes('T'));
    assert.ok(range.end.includes('T'));
    const start = new Date(range.start);
    const end = new Date(range.end);
    assert.ok(end.getTime() > start.getTime());
  });
});

describe('nowISO', () => {
  it('returns a valid ISO string', () => {
    const result = nowISO();
    assert.ok(!isNaN(new Date(result).getTime()));
  });
});
```

**Step 2: Run the tests**

Run: `npm test`
Expected: All tests pass (errors + date = 8 total).

**Step 3: Commit**

```bash
git add tests/utils/date.test.ts
git commit -m "test: add date.test.ts"
```

---

## Task 9: `tests/utils/analysis.test.ts`

**Files:**
- Create: `tests/utils/analysis.test.ts`

**Important fixture notes:**
- `WhoopSleep.id` is a UUID string (not a number) — per OpenAPI spec
- `WhoopRecovery.sleep_id` is a UUID string
- `WhoopCycle` has **no** `recovery` field — whoop-cli's fixtures are wrong here
- All records need `score_state: 'SCORED'` for whoop-sync's filtering to pick them up

**Step 1: Create the file**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTrends, generateInsights } from '../../src/utils/analysis.js';
import type { WhoopRecovery, WhoopSleep, WhoopCycle } from '../../src/types/whoop.js';

function makeRecovery(score: number, hrv: number, rhr: number, date: string): WhoopRecovery {
  return {
    cycle_id: 1,
    sleep_id: 'sleep-uuid-1',
    user_id: 1,
    created_at: date,
    updated_at: date,
    score_state: 'SCORED',
    score: {
      recovery_score: score,
      resting_heart_rate: rhr,
      hrv_rmssd_milli: hrv,
      spo2_percentage: 98,
      skin_temp_celsius: 33,
      user_calibrating: false,
    },
  };
}

function makeSleep(perf: number, totalMs: number, date: string): WhoopSleep {
  return {
    id: 'sleep-uuid-1',
    user_id: 1,
    created_at: date,
    updated_at: date,
    start: date,
    end: date,
    timezone_offset: '+00:00',
    nap: false,
    score_state: 'SCORED',
    score: {
      sleep_performance_percentage: perf,
      sleep_efficiency_percentage: 90,
      sleep_consistency_percentage: 80,
      respiratory_rate: 15,
      sleep_needed: {
        baseline_milli: 28800000,
        need_from_sleep_debt_milli: 0,
        need_from_recent_strain_milli: 0,
        need_from_recent_nap_milli: 0,
      },
      stage_summary: {
        total_in_bed_time_milli: totalMs,
        total_awake_time_milli: 3600000,
        total_no_data_time_milli: 0,
        total_slow_wave_sleep_time_milli: totalMs * 0.2,
        total_rem_sleep_time_milli: totalMs * 0.2,
        total_light_sleep_time_milli: totalMs * 0.4,
        disturbance_count: 2,
        sleep_cycle_count: 4,
      },
    },
  };
}

function makeCycle(strain: number, date: string): WhoopCycle {
  return {
    id: 1,
    user_id: 1,
    created_at: date,
    updated_at: date,
    start: date,
    end: date,
    timezone_offset: '+00:00',
    score_state: 'SCORED',
    score: { strain, kilojoule: 5000, average_heart_rate: 70, max_heart_rate: 150 },
  };
}

describe('analyzeTrends', () => {
  it('calculates avg/min/max for recovery', () => {
    const recoveries = [
      makeRecovery(80, 90, 50, '2024-03-15'),
      makeRecovery(60, 70, 55, '2024-03-14'),
      makeRecovery(70, 80, 52, '2024-03-13'),
    ];
    const result = analyzeTrends(recoveries, [], [], 7);
    assert.ok(result.recovery);
    assert.equal(result.recovery.avg, 70);
    assert.equal(result.recovery.min, 60);
    assert.equal(result.recovery.max, 80);
  });

  it('returns null stats for empty arrays', () => {
    const result = analyzeTrends([], [], [], 7);
    assert.equal(result.recovery, null);
    assert.equal(result.hrv, null);
    assert.equal(result.strain, null);
  });

  it('handles single record (trend is stable)', () => {
    const result = analyzeTrends(
      [makeRecovery(75, 85, 52, '2024-03-15')],
      [],
      [],
      7,
    );
    assert.ok(result.recovery);
    assert.equal(result.recovery.avg, 75);
    assert.equal(result.recovery.trend, 'stable');
  });
});

describe('generateInsights', () => {
  it('produces green recovery insight for high score', () => {
    const insights = generateInsights(
      [makeRecovery(80, 90, 50, '2024-03-15')],
      [],
      [],
      [],
    );
    const rec = insights.find(i => i.category === 'recovery');
    assert.ok(rec);
    assert.equal(rec.level, 'good');
  });

  it('produces red recovery insight for low score', () => {
    const insights = generateInsights(
      [makeRecovery(20, 40, 65, '2024-03-15')],
      [],
      [],
      [],
    );
    const rec = insights.find(i => i.category === 'recovery');
    assert.ok(rec);
    assert.equal(rec.level, 'critical');
  });

  it('returns empty array for no data', () => {
    const insights = generateInsights([], [], [], []);
    assert.equal(insights.length, 0);
  });

  it('detects HRV below baseline', () => {
    const recoveries = [
      makeRecovery(50, 30, 55, '2024-03-15'),
      makeRecovery(50, 80, 55, '2024-03-14'),
      makeRecovery(50, 80, 55, '2024-03-13'),
      makeRecovery(50, 80, 55, '2024-03-12'),
      makeRecovery(50, 80, 55, '2024-03-11'),
    ];
    const insights = generateInsights(recoveries, [], [], []);
    const hrv = insights.find(i => i.category === 'hrv');
    assert.ok(hrv);
    assert.equal(hrv.level, 'warning');
  });
});
```

**Step 2: Run the tests**

Run: `npm test`
Expected: All tests pass (errors + date + analysis = 15 total).

**Step 3: Commit**

```bash
git add tests/utils/analysis.test.ts
git commit -m "test: add analysis.test.ts"
```

---

## Task 10: `tests/utils/format.test.ts`

**Files:**
- Create: `tests/utils/format.test.ts`

**Step 1: Create the file**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPretty,
  formatSummary,
  formatSummaryColor,
  formatSummaryStats,
  formatDashboard,
} from '../../src/utils/format.js';
import { analyzeTrends } from '../../src/utils/analysis.js';
import type { WhoopData, WhoopRecovery, WhoopSleep, WhoopCycle } from '../../src/types/whoop.js';

function makeRecovery(overrides: Record<string, unknown> = {}): WhoopRecovery {
  return {
    cycle_id: 1,
    sleep_id: 'sleep-uuid-1',
    user_id: 1,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    score_state: 'SCORED',
    score: {
      recovery_score: 75,
      resting_heart_rate: 52,
      hrv_rmssd_milli: 85.5,
      spo2_percentage: 98,
      skin_temp_celsius: 33.2,
      user_calibrating: false,
      ...overrides,
    },
  };
}

function makeSleep(): WhoopSleep {
  return {
    id: 'sleep-uuid-1',
    user_id: 1,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    start: '2024-03-15T00:00:00Z',
    end: '2024-03-15T08:00:00Z',
    timezone_offset: '+00:00',
    nap: false,
    score_state: 'SCORED',
    score: {
      sleep_performance_percentage: 90,
      sleep_efficiency_percentage: 92.5,
      sleep_consistency_percentage: 80,
      respiratory_rate: 15.2,
      sleep_needed: {
        baseline_milli: 28800000,
        need_from_sleep_debt_milli: 3600000,
        need_from_recent_strain_milli: 0,
        need_from_recent_nap_milli: 0,
      },
      stage_summary: {
        total_in_bed_time_milli: 28800000,
        total_awake_time_milli: 3600000,
        total_no_data_time_milli: 0,
        total_slow_wave_sleep_time_milli: 5400000,
        total_rem_sleep_time_milli: 5400000,
        total_light_sleep_time_milli: 14400000,
        disturbance_count: 3,
        sleep_cycle_count: 4,
      },
    },
  };
}

function makeCycle(): WhoopCycle {
  return {
    id: 1,
    user_id: 1,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    start: '2024-03-15T04:00:00Z',
    end: '2024-03-16T04:00:00Z',
    timezone_offset: '+00:00',
    score_state: 'SCORED',
    score: { strain: 12.5, kilojoule: 8000, average_heart_rate: 72, max_heart_rate: 155 },
  };
}

function makeFullData(overrides: Partial<WhoopData> = {}): WhoopData {
  return {
    date: '2024-03-15',
    fetched_at: '2024-03-15T12:00:00Z',
    recovery: [makeRecovery()],
    sleep: [makeSleep()],
    cycle: [makeCycle()],
    workout: [{
      id: 'workout-uuid-1',
      user_id: 1,
      created_at: '2024-03-15T10:00:00Z',
      updated_at: '2024-03-15T10:00:00Z',
      start: '2024-03-15T07:00:00Z',
      end: '2024-03-15T08:00:00Z',
      timezone_offset: '+00:00',
      sport_id: 1,
      sport_name: 'Running',
      score_state: 'SCORED',
      score: {
        strain: 10.5,
        average_heart_rate: 145,
        max_heart_rate: 175,
        kilojoule: 2500,
      },
    }],
    ...overrides,
  };
}

describe('formatPretty', () => {
  it('includes all sections with full data', () => {
    const result = formatPretty(makeFullData());
    assert.ok(result.includes('Recovery: 75%'));
    assert.ok(result.includes('Sleep: 90%'));
    assert.ok(result.includes('Running'));
    assert.ok(result.includes('Day strain'));
  });

  it('handles empty data gracefully', () => {
    const result = formatPretty({ date: '2024-03-15', fetched_at: '2024-03-15T12:00:00Z' });
    assert.ok(result.includes('2024-03-15'));
    assert.ok(!result.includes('Recovery'));
  });

  it('shows SpO2 when value is 0 (null-check edge case)', () => {
    const data = makeFullData({ recovery: [makeRecovery({ spo2_percentage: 0 })] });
    const result = formatPretty(data);
    assert.ok(result.includes('SpO2: 0%'), 'SpO2 value of 0 should not be filtered out by falsy check');
  });

  it('does not show SpO2 when null', () => {
    const data = makeFullData({ recovery: [makeRecovery({ spo2_percentage: null })] });
    const result = formatPretty(data);
    assert.ok(!result.includes('SpO2'));
  });
});

describe('formatSummary', () => {
  it('returns single-line format', () => {
    const result = formatSummary(makeFullData());
    assert.ok(!result.includes('\n'));
    assert.ok(result.includes('Recovery: 75%'));
    assert.ok(result.includes('Sleep: 90%'));
    assert.ok(result.includes('Strain: 12.5'));
  });

  it('shows "No data" for empty data', () => {
    const result = formatSummary({ date: '2024-03-15', fetched_at: '2024-03-15T12:00:00Z' });
    assert.ok(result.includes('No data'));
  });
});

describe('formatSummaryColor', () => {
  it('shows green for high recovery', () => {
    const result = formatSummaryColor(makeFullData());
    assert.ok(result.includes('🟢'));
  });

  it('shows red for low recovery', () => {
    const data = makeFullData({ recovery: [makeRecovery({ recovery_score: 20 })] });
    const result = formatSummaryColor(data);
    assert.ok(result.includes('🔴'));
  });
});

describe('formatSummaryStats', () => {
  it('formats averages with correct labels', () => {
    const result = formatSummaryStats({
      days: 7,
      avgRecovery: 72.5,
      avgHrv: 85.3,
      avgRhr: 52.1,
      avgSleepPerf: 88.0,
      avgSleepHours: 7.5,
      avgStrain: 11.2,
    });
    assert.ok(result.includes('7-Day Summary'));
    assert.ok(result.includes('72.5%'));
    assert.ok(result.includes('85.3ms'));
    assert.ok(result.includes('88.0%'));
  });

  it('shows N/A for null values', () => {
    const result = formatSummaryStats({
      days: 7,
      avgRecovery: null,
      avgHrv: null,
      avgRhr: null,
      avgSleepPerf: null,
      avgSleepHours: null,
      avgStrain: null,
    });
    assert.ok(result.includes('7-Day Summary'));
    assert.ok(!result.includes('Recovery'));
  });
});

describe('formatDashboard', () => {
  it('includes all four sections', () => {
    const data = makeFullData();
    const trends = analyzeTrends(data.recovery!, data.sleep!, data.cycle!, 7);
    const result = formatDashboard({
      today: data,
      recoveryHistory: data.recovery!,
      sleepHistory: data.sleep!,
      cycleHistory: data.cycle!,
      trends,
    });
    assert.ok(result.includes('Recovery'));
    assert.ok(result.includes('Sleep'));
    assert.ok(result.includes('Strain'));
    assert.ok(result.includes('7-Day Trends'));
  });

  it('shows "No recovery data" when no scored recovery', () => {
    const data = makeFullData({ recovery: [] });
    const trends = analyzeTrends([], [], [], 7);
    const result = formatDashboard({
      today: data,
      recoveryHistory: [],
      sleepHistory: [],
      cycleHistory: [],
      trends,
    });
    assert.ok(result.includes('No recovery data'));
  });
});
```

**Step 2: Run the tests**

Run: `npm test`
Expected: All tests pass (errors + date + analysis + format = 25 total).

**Step 3: Commit**

```bash
git add tests/utils/format.test.ts
git commit -m "test: add format.test.ts"
```

---

## Task 11: `tests/cli/cli.test.ts`

**Files:**
- Create: `tests/cli/cli.test.ts`

Note: This test runs the CLI via `tsx src/index.ts` — no build required. `tsx` handles TypeScript directly.

**Step 1: Create the file**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const CLI = 'tsx';
const ENTRY = 'src/index.ts';

async function run(...args: string[]) {
  try {
    const { stdout, stderr } = await exec(CLI, [ENTRY, ...args], {
      cwd: process.cwd(),
      timeout: 15000,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code ?? 1 };
  }
}

describe('CLI', () => {
  it('--version outputs package.json version', async () => {
    const { stdout } = await run('--version');
    assert.ok(stdout.trim().includes(pkg.version), `Expected version ${pkg.version}, got: ${stdout.trim()}`);
  });

  it('--help exits with 0 and shows key commands', async () => {
    const { stdout, exitCode } = await run('--help');
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('sleep'));
    assert.ok(stdout.includes('recovery'));
    assert.ok(stdout.includes('dashboard'));
    assert.ok(stdout.includes('chart'));
  });

  it('trends --days 5 exits with non-zero and shows valid days message', async () => {
    const { exitCode, stderr } = await run('trends', '--days', '5');
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes('7, 14, or 30'));
  });
});
```

**Step 2: Run all tests**

Run: `npm test`
Expected: All 28 tests pass across 5 files.

**Step 3: Commit**

```bash
git add tests/cli/cli.test.ts
git commit -m "test: add cli.test.ts"
```

---

## Final verification

Run the full test suite one more time to confirm everything passes cleanly:

```bash
npm test
```

Expected output: 28 passing tests, 0 failures, across 5 test files.

Also confirm the build is still clean:

```bash
npm run build
```

Expected: Zero TypeScript errors.
