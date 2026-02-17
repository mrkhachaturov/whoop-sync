---
name: whoop-up
description: >
  WHOOP CLI for health data, trends, insights, dashboards, and interactive charts.
  Use when user asks about WHOOP data, health metrics, recovery, HRV,
  sleep, strain, workouts, or wants to fetch/analyze/visualize WHOOP data.
  Also use when user says "whoop", "recovery score", "sleep score",
  "daily strain", "heart rate variability", "resting heart rate",
  "health dashboard", "health trends", "show me a chart", "health chart",
  or wants a daily health summary.
  Trigger on: "show my recovery", "how did I sleep", "fetch my WHOOP data",
  "health insights", "trend analysis", "visualize my health", "whoop chart".
---

# whoop-up

Fetch, analyze, and visualize WHOOP health metrics via CLI: sleep, recovery, HRV, strain, workouts, and interactive charts.

Install: `npm install -g whoop-up`

## Quick start

```bash
whoop summary --color                            # color-coded daily snapshot
whoop dashboard                                  # full dashboard + 7-day trends
whoop trends --days 14                           # 14-day trend analysis
whoop chart dashboard -n 30 -o /tmp/whoop.html  # interactive HTML chart
```

## Commands

| Command | Description | Default output |
| --- | --- | --- |
| `sleep` | Sleep stages, efficiency, respiratory rate | JSON |
| `recovery` | Recovery score, HRV, RHR, SpO2, skin temp | JSON |
| `workout` | Workouts with strain, HR zones, calories | JSON |
| `cycle` | Daily strain, calories | JSON |
| `profile` | User info (name, email) | JSON |
| `body` | Height, weight, max HR | JSON |
| `summary` | Multi-day health snapshot with averages | Pretty |
| `dashboard` | Full terminal dashboard with 7-day trends | Pretty |
| `trends` | Multi-day averages with trend arrows ↑↓→ | Pretty |
| `insights` | Health recommendations | Pretty |
| `chart <type>` | Interactive HTML chart (opens browser) | HTML file |
| `get <type> <id>` | Fetch single record by ID | JSON |
| `cycle-sleep <id>` | Sleep linked to a cycle | JSON |
| `cycle-recovery <id>` | Recovery linked to a cycle | JSON |

Chart types: `sleep` · `recovery` · `strain` · `hrv` · `dashboard`
Get types: `sleep` (UUID string) · `workout` (UUID string) · `cycle` (integer)

## Flags

| Flag | Applies to | Description |
| --- | --- | --- |
| `-n, --days <number>` | data + analysis | Days of history (default: 7) |
| `-d, --date <date>` | data | Specific date (YYYY-MM-DD) |
| `-s, --start <date>` | data | Range start |
| `-e, --end <date>` | data | Range end |
| `-l, --limit <n>` | data | Max results per page (max: 25) |
| `-a, --all` | data | Fetch all pages |
| `-p, --pretty` | data | Human-readable output |
| `-c, --color` | summary | Color-coded status indicators |
| `--json` | dashboard, trends, insights | Raw JSON output |
| `-o, --output <file>` | chart | Save HTML to file instead of opening browser |
| `--sleep/--recovery/--workout/--cycle/--profile/--body` | global | Select data types |

## Key behaviors

- Data commands → JSON by default; add `--pretty` for formatted output
- Analysis commands → pretty by default; add `--json` for raw data
- WHOOP day boundary is **4:00 AM**, not midnight
- Tokens stored at `~/.whoop-up/tokens.json`, auto-refresh 15 min before expiry
- `trends --days` only accepts **7, 14, or 30**
- `chart` commands open browser automatically; use `-o file.html` to save instead
- `get sleep <id>` — id is a UUID string; `get cycle <id>` — id is an integer
- Rate limits: **100 req/min**, 10,000 req/day — avoid rapid repeated calls

## Answering questions

| User asks | Command |
| --- | --- |
| "How did I sleep last night?" | `whoop dashboard --json` |
| "What's my recovery today?" | `whoop summary --color` |
| "Show me my health overview" | `whoop dashboard` |
| "How are my trends this week?" | `whoop trends --days 7 --json` |
| "Analyze last 30 days" | `whoop trends --days 30 --json` |
| "What are my health insights?" | `whoop insights` |
| "Show me a chart / visualize my health" | `whoop chart dashboard -n 30 -o /tmp/whoop.html` |
| "Show HRV chart" | `whoop chart hrv -n 30 -o /tmp/whoop-hrv.html` |
| "Is my HRV improving?" | `whoop trends --days 14 --json` |
| "How much did I train this week?" | `whoop workout -n 7 --pretty` |
| "What was my sleep on 2026-01-15?" | `whoop sleep -d 2026-01-15 --pretty` |
| "Show all data for last month" | `whoop --sleep --recovery --cycle --workout -n 30 --pretty` |

## Key metrics

- **Recovery** (0–100%): Green ≥67%, Yellow 34–66%, Red <34%
- **Strain** (0–21): Daily exertion. Optimal target: Green day ~14, Yellow ~10, Red ~6
- **HRV** (ms): Higher = better recovery. Track vs personal baseline, not population norms
- **RHR** (bpm): Lower = better fitness. Rising RHR signals fatigue or illness
- **Sleep Performance** (%): Actual sleep vs. sleep needed. Green ≥85%, Yellow ≥70%
- **Sleep Efficiency** (%): Time asleep / time in bed. Target ≥85%
- **SpO2** (%): Blood oxygen. Normal 95–100%. Values <94% warrant attention
- **Skin temp** (°C): Deviation from personal baseline — elevation may signal illness

## Health analysis

When the user asks about health, trends, or wants deeper interpretation, use `references/health_analysis.md` for:
- Science-backed interpretation of HRV, RHR, sleep stages, recovery, strain, SpO2
- Normal ranges by age and fitness level
- Pattern detection (sleep debt, overtraining signals, day-of-week effects)
- Actionable recommendations based on data
- Red flags that suggest medical consultation

### Analysis workflow
1. **Status** — `whoop summary --color` (today's snapshot)
2. **Trends** — `whoop trends --days 14 --json` (direction of key metrics)
3. **Patterns** — correlate: late workouts → poor sleep, high strain → low HRV next day
4. **Insights** — `whoop insights` (automated recommendations)
5. **Flags** — RHR rising >5 bpm, HRV <80% of 7-day average, SpO2 <94%

Always include: *"This is not medical advice."*

## God mode: composite commands for deep insights

**Best single command for LLM analysis:**
```bash
whoop dashboard --json
```
Most data-dense: today's full snapshot (profile + recovery + sleep + cycle + workout) plus 7-day arrays of recovery, sleep, and cycle history — all in one JSON blob.

**Full daily picture (formatted for human reading):**
```bash
whoop dashboard        # today + 7-day terminal dashboard
whoop insights         # health recommendations
```

**30-day deep dive (maximum historical context):**
```bash
whoop trends --days 30 --json
whoop sleep -n 30 --all --pretty
whoop recovery -n 30 --all --pretty
whoop workout -n 30 --all --pretty
```

**Visual analysis (save charts to files):**
```bash
whoop chart dashboard -n 30 -o /tmp/whoop-dashboard.html
whoop chart hrv -n 90 -o /tmp/whoop-hrv.html
whoop chart sleep -n 30 -o /tmp/whoop-sleep.html
whoop chart recovery -n 30 -o /tmp/whoop-recovery.html
```

**Drill into a specific record (use IDs from `dashboard --json` output):**
```bash
whoop get sleep <uuid>          # full detail for one sleep record
whoop get cycle <id>            # full detail for one day's cycle
whoop cycle-sleep <cycleId>     # sleep linked to that cycle
whoop cycle-recovery <cycleId>  # recovery linked to that cycle
```

**Recommended god mode workflow:**
1. `whoop dashboard --json` — current state + 7-day history
2. `whoop trends --days 30 --json` — 30-day trend context
3. `whoop --sleep --recovery --workout --cycle -n 30 --all` — raw data for all key metrics
4. Feed all JSON to LLM: correlate HRV↔sleep, recovery↔strain, sleep duration↔workout performance
5. `whoop chart dashboard -n 30 -o /tmp/whoop.html` — visual confirmation

## Example output

`whoop summary --color`:
```
📊 7-Day Summary

🔴 Avg Recovery:  31.5%
💓 Avg HRV:       124.4ms
❤️  Avg RHR:       56.1bpm
🔴 Avg Sleep:     44.8% | 4.0h
🔥 Avg Strain:    6.8
```

`whoop dashboard`:
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

`whoop insights`:
```
💡 Insights & Recommendations

🔴 Red Recovery
   Recovery at 13% — body needs rest.
   → Prioritize rest, hydration, and sleep tonight.

🔴 Significant Sleep Debt
   You have 2.1 hours of accumulated sleep debt.
   → Try to get to bed 30-60 min earlier for the next few days.
```

## References

- `references/health_analysis.md` — science-backed health data interpretation guide
