# whoop-up — Full Command Reference

← [Back to README](../README.md)

---

## Auth commands

### `auth login`

OAuth 2.0 authorization code flow. Opens browser; paste the callback URL when prompted.

```bash
whoop auth login
```

### `auth logout`

Revokes access on the WHOOP server, then clears `~/.whoop-up/tokens.json`.

```bash
whoop auth logout
```

### `auth status`

Reports token expiry without refreshing.

```bash
whoop auth status
```

Output:
```json
{
  "authenticated": true,
  "expires_at": 1771365212,
  "expires_in_seconds": 2515,
  "expires_in_human": "41 minutes",
  "needs_refresh": false
}
```

### `auth refresh`

Forces a token refresh using the stored refresh token.

```bash
whoop auth refresh
```

---

## Data commands

All data commands output JSON by default. Add `--pretty` for formatted output.

### Shared flags

| Flag | Description |
| --- | --- |
| `-n, --days <number>` | Days of history (default: 7) |
| `-d, --date <date>` | Specific date (YYYY-MM-DD) |
| `-s, --start <date>` | Range start date |
| `-e, --end <date>` | Range end date |
| `-l, --limit <n>` | Max results per page (max: 25) |
| `-a, --all` | Fetch all pages (pagination) |
| `-p, --pretty` | Human-readable formatted output |

### `sleep`

Sleep stages, efficiency, respiratory rate, disturbances.

```bash
whoop sleep --days 7 --pretty
```

Output:
```json
{
  "id": "5d225f07-8722-4dcf-be52-528e2500bad3",
  "cycle_id": 1317587415,
  "user_id": 30398164,
  "created_at": "2026-02-17T20:02:32.740Z",
  "updated_at": "2026-02-17T20:02:32.740Z",
  "start": "2026-02-17T07:53:40.180Z",
  "end": "2026-02-17T09:55:23.330Z",
  "timezone_offset": "+03:00",
  "nap": false,
  "score_state": "SCORED",
  "score": {
    "stage_summary": {
      "total_in_bed_time_milli": 7303150,
      "total_awake_time_milli": 65010,
      "total_no_data_time_milli": 0,
      "total_light_sleep_time_milli": 1532980,
      "total_slow_wave_sleep_time_milli": 3543080,
      "total_rem_sleep_time_milli": 2162080,
      "sleep_cycle_count": 1,
      "disturbance_count": 1
    },
    "sleep_needed": {
      "baseline_milli": 27086925,
      "need_from_sleep_debt_milli": 7668000,
      "need_from_recent_strain_milli": 214511,
      "need_from_recent_nap_milli": 0
    },
    "respiratory_rate": 15.566406,
    "sleep_performance_percentage": 27,
    "sleep_consistency_percentage": 66,
    "sleep_efficiency_percentage": 99.587234
  }
}
```

### `recovery`

Recovery score, HRV (rMSSD), resting heart rate, SpO2, skin temperature.

```bash
whoop recovery --days 1 --pretty
```

Output:
```json
{
  "cycle_id": 1317587415,
  "sleep_id": "5d225f07-8722-4dcf-be52-528e2500bad3",
  "user_id": 30398164,
  "created_at": "2026-02-17T20:02:32.740Z",
  "updated_at": "2026-02-17T20:02:32.740Z",
  "score_state": "SCORED",
  "score": {
    "user_calibrating": false,
    "recovery_score": 13,
    "resting_heart_rate": 60,
    "hrv_rmssd_milli": 128.51297,
    "spo2_percentage": 96,
    "skin_temp_celsius": 33.145668
  }
}
```

Raw JSON (default):
```bash
whoop recovery --days 1
```

```json
{
  "cycle_id": 1317587415,
  "sleep_id": "5d225f07-8722-4dcf-be52-528e2500bad3",
  "user_id": 30398164,
  "created_at": "2026-02-17T20:02:32.740Z",
  "updated_at": "2026-02-17T20:02:32.740Z",
  "score_state": "SCORED",
  "score": {
    "user_calibrating": false,
    "recovery_score": 13,
    "resting_heart_rate": 60,
    "hrv_rmssd_milli": 128.51297,
    "spo2_percentage": 96,
    "skin_temp_celsius": 33.145668
  }
}
```

### `workout`

Workouts with sport name, strain, heart rate zones, calorie burn.

```bash
whoop workout --days 7 --pretty
```

Output:
```json
{
  "id": "f9cf878c-d24a-4ccc-b96f-7d767d8ab6fa",
  "user_id": 30398164,
  "created_at": "2026-02-14T21:28:33.338Z",
  "updated_at": "2026-02-14T21:28:37.938Z",
  "start": "2026-02-14T20:52:30.700Z",
  "end": "2026-02-14T21:08:59.690Z",
  "timezone_offset": "+03:00",
  "sport_name": "walking",
  "score_state": "SCORED",
  "score": {
    "strain": 6.788185,
    "average_heart_rate": 132,
    "max_heart_rate": 153,
    "kilojoule": 768.7695,
    "percent_recorded": 1,
    "distance_meter": null,
    "altitude_gain_meter": null,
    "altitude_change_meter": null,
    "zone_durations": {
      "zone_zero_milli": 0,
      "zone_one_milli": 259990,
      "zone_two_milli": 520000,
      "zone_three_milli": 209000,
      "zone_four_milli": 0,
      "zone_five_milli": 0
    }
  }
}
```

### `cycle`

Daily physiological cycle: strain score, calorie burn.

```bash
whoop cycle --days 7 --pretty
```

### `profile`

User profile: name, email, user ID.

```bash
whoop profile
```

### `body`

Body measurements: height, weight, max heart rate.

```bash
whoop body
```

---

## Analysis commands

Analysis commands output pretty-printed text by default. Add `--json` for raw JSON.

### `summary`

Multi-day averages: recovery, HRV, RHR, sleep performance, sleep hours, strain.

```bash
whoop summary [-n days]
```

| Flag | Description |
| --- | --- |
| `-n, --days <number>` | Days to summarize (default: 7) |
| `-c, --color` | Add 🔴🟡🟢 color-coded indicators |
| `--json` | Raw JSON output |

`whoop summary --color`:
```
📊 7-Day Summary

🔴 Avg Recovery:  31.5%
💓 Avg HRV:       124.4ms
❤️  Avg RHR:       56.1bpm
🔴 Avg Sleep:     44.8% | 4.0h
🔥 Avg Strain:    6.8
```

### `dashboard`

Full terminal dashboard: today's recovery, sleep, strain + 7-day trend lines.

```bash
whoop dashboard [--json]
```

Output:
```
📅 2026-02-17 | Ruben Khachaturov

── Recovery ──────────────────────────
🔴 13% | HRV: 129ms (↑ vs 124 avg) | RHR: 60bpm (↑ vs 56 avg)
   SpO2: 96% | Skin: 33.1°C | Resp: 15.6/min

── Sleep ─────────────────────────────
😴 27% | 2.0h total | Efficiency: 100%
   Deep: 1.0h (49%) | REM: 0.6h (30%) | Light: 0.4h
   Disturbances: 1 | Consistency: 66%
   💤 Sleep debt: 2.1h | Need tonight: 9.7h

── Strain ────────────────────────────
🔥 4.1 / 6 optimal | 767 cal

── 7-Day Trends ──────────────────────
   HRV:      148 → 129ms ↓  (range 66-179)
   RHR:      49 → 60bpm ↑  (range 49-64)
   Recovery: 44 → 13% ↓
   Sleep:    4.6 → 2.0h ↓
   Strain:   6.8 avg (range 4.1-16.4)
```

### `trends`

Multi-day trend analysis with averages, ranges, and direction arrows ↑↓→.

```bash
whoop trends [-n 7|14|30] [--json]
```

`--days` only accepts **7, 14, or 30**.

`whoop trends --days 7`:
```
📊 7-Day Trends

💚 Recovery: 31.5% avg (5-85) ↓
💓 HRV: 124.4ms avg (66-179) ↓
❤️ RHR: 56.1bpm avg (49-64) ↑
😴 Sleep: 44.8% avg (25-78) ↓
🛏️ Hours: 4.3h avg (1.3-7.2) ↓
🔥 Strain: 6.8 avg (4.1-16.4) ↓
```

### `insights`

Health recommendations based on recent recovery, sleep, and strain patterns.

```bash
whoop insights [-n days] [--json]
```

Output:
```
💡 Insights & Recommendations

🔴 Red Recovery
   Recovery at 13% — body needs rest.
   → Prioritize rest, hydration, and sleep tonight.

🔴 Significant Sleep Debt
   You have 2.1 hours of accumulated sleep debt.
   → Try to get to bed 30-60 min earlier for the next few days.
```

---

## Chart commands

Interactive HTML charts using ApexCharts. Opens in browser by default.

```bash
whoop chart <type> [-n days] [-o output.html]
```

| Type | Description |
| --- | --- |
| `sleep` | Sleep performance and stage breakdown |
| `recovery` | Recovery score and HRV over time |
| `strain` | Daily strain and calorie burn |
| `hrv` | HRV trend |
| `dashboard` | Combined overview (recommended) |

| Flag | Description |
| --- | --- |
| `-n, --days <number>` | Days of history (default: 7) |
| `-o, --output <file>` | Save to file instead of opening browser |

Examples:
```bash
whoop chart dashboard -n 30 -o /tmp/whoop.html
whoop chart hrv -n 90 -o /tmp/whoop-hrv.html
```

---

## Lookup commands

Fetch a single record by ID. Get IDs from collection responses or `dashboard --json`.

### `get sleep <uuid>`

Full detail for one sleep record. ID is a UUID string.

```bash
whoop get sleep ecfc6a15-4661-442f-a9a4-f160dd7afae8
```

### `get workout <uuid>`

Full detail for one workout. ID is a UUID string.

```bash
whoop get workout <uuid>
```

### `get cycle <id>`

Full detail for one cycle. ID is an integer.

```bash
whoop get cycle 12345678
```

### `cycle-sleep <cycleId>`

Sleep record linked to a specific cycle (by integer cycle ID).

```bash
whoop cycle-sleep 12345678
```

### `cycle-recovery <cycleId>`

Recovery record linked to a specific cycle (by integer cycle ID).

```bash
whoop cycle-recovery 12345678
```

---

## Global flags

Combine data types in a single fetch:

```bash
whoop --sleep --recovery --workout --cycle --profile --body
```

Running `whoop` with no arguments fetches all data types.

---

## WHOOP day boundary

WHOOP considers a new day to start at **4:00 AM**, not midnight. Commands issued before 4 AM reference the previous calendar day.

---

← [Back to README](../README.md)
