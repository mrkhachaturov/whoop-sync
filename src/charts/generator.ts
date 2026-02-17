import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import open from 'open';
import type { WhoopSleep, WhoopRecovery, WhoopCycle, WhoopWorkout } from '../types/whoop.js';

const DARK_THEME = `
  body { margin: 0; background: #1a1a2e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  h1 { color: #a78bfa; margin: 0 0 8px; font-size: 1.5rem; }
  .subtitle { color: #6b7280; font-size: 0.875rem; margin-bottom: 24px; }
  .chart-wrap { background: #16213e; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
  .stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: #0f3460; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-label { font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .stat-value { font-size: 1.5rem; font-weight: 700; }
  .green { color: #34d399; }
  .yellow { color: #fbbf24; }
  .red { color: #f87171; }
  .blue { color: #60a5fa; }
  .purple { color: #a78bfa; }
  .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
`;

const APEXCHARTS_CDN = '<script src="https://cdn.jsdelivr.net/npm/apexcharts@3"></script>';

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — whoop-sync</title>
${APEXCHARTS_CDN}
<style>${DARK_THEME}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function movingAvg(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return avg(slice);
  });
}

// ─── Sleep Chart ─────────────────────────────────────────────────────────────

export function buildSleepChart(records: WhoopSleep[]): string {
  const main = records.filter(s => !s.nap).slice(0, 30).reverse();
  if (main.length === 0) return '<p style="color:#9ca3af;padding:20px">No sleep data available.</p>';

  const dates = main.map(s => s.start.split('T')[0]);
  const perf = main.map(s => s.score?.sleep_performance_percentage ?? 0);
  const deep = main.map(s => Math.round((s.score?.stage_summary?.total_slow_wave_sleep_time_milli ?? 0) / 60000));
  const rem = main.map(s => Math.round((s.score?.stage_summary?.total_rem_sleep_time_milli ?? 0) / 60000));
  const light = main.map(s => Math.round((s.score?.stage_summary?.total_light_sleep_time_milli ?? 0) / 60000));

  const avgPerf = avg(perf).toFixed(1);
  const avgDeep = avg(deep).toFixed(0);
  const avgRem = avg(rem).toFixed(0);

  return `
<div class="container">
  <h1>😴 Sleep Analysis</h1>
  <p class="subtitle">Last ${main.length} nights</p>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-label">Avg Performance</div><div class="stat-value purple">${avgPerf}%</div></div>
    <div class="stat-card"><div class="stat-label">Avg Deep Sleep</div><div class="stat-value blue">${avgDeep}m</div></div>
    <div class="stat-card"><div class="stat-label">Avg REM</div><div class="stat-value green">${avgRem}m</div></div>
  </div>
  <div class="chart-wrap"><div id="perf-chart"></div></div>
  <div class="chart-wrap"><div id="stage-chart"></div></div>
</div>
<script>
const dates = ${JSON.stringify(dates)};
new ApexCharts(document.getElementById('perf-chart'), {
  chart: { type: 'area', height: 200, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [{ name: 'Sleep Performance %', data: ${JSON.stringify(perf)} }],
  xaxis: { categories: dates, labels: { style: { colors: '#9ca3af' } } },
  yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af' }, formatter: v => v + '%' } },
  colors: ['#a78bfa'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth', width: 2 },
  title: { text: 'Sleep Performance', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
}).render();

new ApexCharts(document.getElementById('stage-chart'), {
  chart: { type: 'bar', height: 250, stacked: true, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [
    { name: 'Deep (SWS)', data: ${JSON.stringify(deep)} },
    { name: 'REM', data: ${JSON.stringify(rem)} },
    { name: 'Light', data: ${JSON.stringify(light)} },
  ],
  xaxis: { categories: dates, labels: { style: { colors: '#9ca3af' } } },
  yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: v => v + 'm' } },
  colors: ['#3b82f6', '#8b5cf6', '#6b7280'],
  title: { text: 'Sleep Stages (minutes)', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
  legend: { labels: { colors: '#9ca3af' } },
}).render();
</script>`;
}

// ─── Recovery Chart ───────────────────────────────────────────────────────────

export function buildRecoveryChart(records: WhoopRecovery[]): string {
  const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-30);
  if (sorted.length === 0) return '<p style="color:#9ca3af;padding:20px">No recovery data available.</p>';

  const dates = sorted.map(r => r.created_at.split('T')[0]);
  const recovScores = sorted.map(r => r.score?.recovery_score ?? 0);
  const hrv = sorted.map(r => parseFloat((r.score?.hrv_rmssd_milli ?? 0).toFixed(1)));
  const rhr = sorted.map(r => r.score?.resting_heart_rate ?? 0);

  const avgRec = avg(recovScores).toFixed(1);
  const avgHrv = avg(hrv).toFixed(1);
  const avgRhr = avg(rhr).toFixed(1);

  const recColor = (v: number) => v >= 67 ? '#34d399' : v >= 34 ? '#fbbf24' : '#f87171';
  const barColors = recovScores.map(recColor);

  return `
<div class="container">
  <h1>💚 Recovery Analysis</h1>
  <p class="subtitle">Last ${sorted.length} days</p>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-label">Avg Recovery</div><div class="stat-value ${avg(recovScores) >= 67 ? 'green' : avg(recovScores) >= 34 ? 'yellow' : 'red'}">${avgRec}%</div></div>
    <div class="stat-card"><div class="stat-label">Avg HRV</div><div class="stat-value blue">${avgHrv}ms</div></div>
    <div class="stat-card"><div class="stat-label">Avg RHR</div><div class="stat-value purple">${avgRhr}bpm</div></div>
  </div>
  <div class="chart-wrap"><div id="rec-chart"></div></div>
  <div class="chart-wrap"><div id="hrv-rhr-chart"></div></div>
</div>
<script>
new ApexCharts(document.getElementById('rec-chart'), {
  chart: { type: 'bar', height: 220, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [{ name: 'Recovery %', data: ${JSON.stringify(recovScores)} }],
  xaxis: { categories: ${JSON.stringify(dates)}, labels: { style: { colors: '#9ca3af' } } },
  yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af' }, formatter: v => v + '%' } },
  colors: [${barColors.map(c => `'${c}'`).join(',')}],
  plotOptions: { bar: { distributed: true, borderRadius: 4 } },
  legend: { show: false },
  title: { text: 'Daily Recovery Score', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
}).render();

new ApexCharts(document.getElementById('hrv-rhr-chart'), {
  chart: { type: 'line', height: 220, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [
    { name: 'HRV (ms)', data: ${JSON.stringify(hrv)} },
    { name: 'RHR (bpm)', data: ${JSON.stringify(rhr)} },
  ],
  xaxis: { categories: ${JSON.stringify(dates)}, labels: { style: { colors: '#9ca3af' } } },
  yaxis: { labels: { style: { colors: '#9ca3af' } } },
  colors: ['#60a5fa', '#f87171'],
  stroke: { curve: 'smooth', width: 2 },
  title: { text: 'HRV & Resting Heart Rate', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
  legend: { labels: { colors: '#9ca3af' } },
}).render();
</script>`;
}

// ─── Strain Chart ─────────────────────────────────────────────────────────────

export function buildStrainChart(records: WhoopCycle[]): string {
  const sorted = [...records].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(-30);
  if (sorted.length === 0) return '<p style="color:#9ca3af;padding:20px">No strain data available.</p>';

  const dates = sorted.map(c => c.start.split('T')[0]);
  const strain = sorted.map(c => parseFloat((c.score?.strain ?? 0).toFixed(2)));
  const cals = sorted.map(c => Math.round((c.score?.kilojoule ?? 0) / 4.184));

  const avgStr = avg(strain).toFixed(1);
  const avgCal = avg(cals).toFixed(0);

  return `
<div class="container">
  <h1>🔥 Strain Analysis</h1>
  <p class="subtitle">Last ${sorted.length} days</p>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-label">Avg Strain</div><div class="stat-value yellow">${avgStr}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Calories</div><div class="stat-value red">${avgCal} kcal</div></div>
  </div>
  <div class="chart-wrap"><div id="strain-chart"></div></div>
</div>
<script>
new ApexCharts(document.getElementById('strain-chart'), {
  chart: { type: 'bar', height: 280, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [
    { name: 'Strain', data: ${JSON.stringify(strain)}, type: 'bar' },
    { name: 'Calories (kcal)', data: ${JSON.stringify(cals)}, type: 'line' },
  ],
  xaxis: { categories: ${JSON.stringify(dates)}, labels: { style: { colors: '#9ca3af' } } },
  yaxis: [
    { labels: { style: { colors: '#9ca3af' }, formatter: v => v.toFixed(1) }, max: 21 },
    { opposite: true, labels: { style: { colors: '#9ca3af' } } },
  ],
  colors: ['#fbbf24', '#f87171'],
  stroke: { curve: 'smooth', width: [0, 2] },
  plotOptions: { bar: { borderRadius: 4 } },
  title: { text: 'Daily Strain & Calories', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
  legend: { labels: { colors: '#9ca3af' } },
}).render();
</script>`;
}

// ─── HRV Chart ────────────────────────────────────────────────────────────────

export function buildHrvChart(records: WhoopRecovery[]): string {
  const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-30);
  if (sorted.length === 0) return '<p style="color:#9ca3af;padding:20px">No HRV data available.</p>';

  const dates = sorted.map(r => r.created_at.split('T')[0]);
  const hrv = sorted.map(r => parseFloat((r.score?.hrv_rmssd_milli ?? 0).toFixed(1)));
  const ma7 = movingAvg(hrv, 7).map(v => parseFloat(v.toFixed(1)));

  const avgHrv = avg(hrv).toFixed(1);
  const latestHrv = hrv[hrv.length - 1]?.toFixed(1) ?? 'N/A';

  return `
<div class="container">
  <h1>💓 HRV Trends</h1>
  <p class="subtitle">Last ${sorted.length} days — with 7-day moving average</p>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-label">Avg HRV</div><div class="stat-value blue">${avgHrv}ms</div></div>
    <div class="stat-card"><div class="stat-label">Latest HRV</div><div class="stat-value purple">${latestHrv}ms</div></div>
  </div>
  <div class="chart-wrap"><div id="hrv-chart"></div></div>
</div>
<script>
new ApexCharts(document.getElementById('hrv-chart'), {
  chart: { type: 'line', height: 300, background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'dark' },
  series: [
    { name: 'Daily HRV', data: ${JSON.stringify(hrv)} },
    { name: '7-Day Avg', data: ${JSON.stringify(ma7)} },
  ],
  xaxis: { categories: ${JSON.stringify(dates)}, labels: { style: { colors: '#9ca3af' } } },
  yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: v => v + 'ms' } },
  colors: ['#60a5fa', '#a78bfa'],
  stroke: { curve: 'smooth', width: [1, 3], dashArray: [0, 4] },
  title: { text: 'Heart Rate Variability (RMSSD)', style: { color: '#e0e0e0' } },
  tooltip: { theme: 'dark' },
  legend: { labels: { colors: '#9ca3af' } },
  fill: { type: ['solid', 'solid'] },
}).render();
</script>`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function buildDashboard(
  sleep: WhoopSleep[],
  recovery: WhoopRecovery[],
  cycle: WhoopCycle[],
  _workout: WhoopWorkout[]
): string {
  const mainSleep = sleep.filter(s => !s.nap).slice(0, 30).reverse();
  const sortedRec = [...recovery].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-30);
  const sortedCycle = [...cycle].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(-30);

  const slDates = mainSleep.map(s => s.start.split('T')[0]);
  const slPerf = mainSleep.map(s => s.score?.sleep_performance_percentage ?? 0);

  const recDates = sortedRec.map(r => r.created_at.split('T')[0]);
  const recScores = sortedRec.map(r => r.score?.recovery_score ?? 0);
  const hrv = sortedRec.map(r => parseFloat((r.score?.hrv_rmssd_milli ?? 0).toFixed(1)));
  const rhr = sortedRec.map(r => r.score?.resting_heart_rate ?? 0);

  const stDates = sortedCycle.map(c => c.start.split('T')[0]);
  const strain = sortedCycle.map(c => parseFloat((c.score?.strain ?? 0).toFixed(2)));

  const ma7 = movingAvg(hrv, 7).map(v => parseFloat(v.toFixed(1)));

  const avgRec = avg(recScores).toFixed(1);
  const avgHrv = avg(hrv).toFixed(1);
  const avgRhr = avg(rhr).toFixed(1);
  const avgSlPerf = avg(slPerf).toFixed(1);
  const avgStr = avg(strain).toFixed(1);

  const recClass = avg(recScores) >= 67 ? 'green' : avg(recScores) >= 34 ? 'yellow' : 'red';
  const slClass = avg(slPerf) >= 85 ? 'green' : avg(slPerf) >= 70 ? 'yellow' : 'red';

  return `
<div class="container">
  <h1>📊 Health Dashboard</h1>
  <p class="subtitle">Last 30 days at a glance</p>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-label">Avg Recovery</div><div class="stat-value ${recClass}">${avgRec}%</div></div>
    <div class="stat-card"><div class="stat-label">Avg HRV</div><div class="stat-value blue">${avgHrv}ms</div></div>
    <div class="stat-card"><div class="stat-label">Avg RHR</div><div class="stat-value red">${avgRhr}bpm</div></div>
    <div class="stat-card"><div class="stat-label">Avg Sleep</div><div class="stat-value ${slClass}">${avgSlPerf}%</div></div>
    <div class="stat-card"><div class="stat-label">Avg Strain</div><div class="stat-value yellow">${avgStr}</div></div>
  </div>
  <div class="dashboard-grid">
    <div class="chart-wrap"><div id="d-rec"></div></div>
    <div class="chart-wrap"><div id="d-sleep"></div></div>
    <div class="chart-wrap"><div id="d-hrv"></div></div>
    <div class="chart-wrap"><div id="d-strain"></div></div>
  </div>
</div>
<script>
const opts = { chart: { background: 'transparent', toolbar: { show: false } }, theme: { mode: 'dark' }, tooltip: { theme: 'dark' } };

new ApexCharts(document.getElementById('d-rec'), { ...opts,
  chart: { ...opts.chart, type: 'bar', height: 200 },
  series: [{ name: 'Recovery %', data: ${JSON.stringify(recScores)} }],
  xaxis: { categories: ${JSON.stringify(recDates)}, labels: { show: false } },
  yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af' }, formatter: v => v + '%' } },
  colors: ['#34d399'], plotOptions: { bar: { borderRadius: 2 } },
  title: { text: 'Recovery', style: { color: '#e0e0e0' } },
}).render();

new ApexCharts(document.getElementById('d-sleep'), { ...opts,
  chart: { ...opts.chart, type: 'area', height: 200 },
  series: [{ name: 'Sleep %', data: ${JSON.stringify(slPerf)} }],
  xaxis: { categories: ${JSON.stringify(slDates)}, labels: { show: false } },
  yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af' }, formatter: v => v + '%' } },
  colors: ['#a78bfa'], stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  title: { text: 'Sleep Performance', style: { color: '#e0e0e0' } },
}).render();

new ApexCharts(document.getElementById('d-hrv'), { ...opts,
  chart: { ...opts.chart, type: 'line', height: 200 },
  series: [
    { name: 'HRV', data: ${JSON.stringify(hrv)} },
    { name: '7d Avg', data: ${JSON.stringify(ma7)} },
  ],
  xaxis: { categories: ${JSON.stringify(recDates)}, labels: { show: false } },
  yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: v => v + 'ms' } },
  colors: ['#60a5fa', '#a78bfa'], stroke: { curve: 'smooth', width: [1, 3], dashArray: [0, 4] },
  legend: { labels: { colors: '#9ca3af' } },
  title: { text: 'HRV (RMSSD)', style: { color: '#e0e0e0' } },
}).render();

new ApexCharts(document.getElementById('d-strain'), { ...opts,
  chart: { ...opts.chart, type: 'bar', height: 200 },
  series: [{ name: 'Strain', data: ${JSON.stringify(strain)} }],
  xaxis: { categories: ${JSON.stringify(stDates)}, labels: { show: false } },
  yaxis: { max: 21, labels: { style: { colors: '#9ca3af' }, formatter: v => v.toFixed(1) } },
  colors: ['#fbbf24'], plotOptions: { bar: { borderRadius: 2 } },
  title: { text: 'Daily Strain', style: { color: '#e0e0e0' } },
}).render();
</script>`;
}

// ─── File output ──────────────────────────────────────────────────────────────

export async function openChart(
  title: string,
  body: string,
  outputPath?: string
): Promise<void> {
  const html = htmlPage(title, body);
  const filePath = outputPath ?? join(tmpdir(), `whoop-sync-${Date.now()}.html`);

  writeFileSync(filePath, html, 'utf-8');

  if (!outputPath) {
    await open(filePath);
    console.log(`Chart opened in browser (${filePath})`);
  } else {
    console.log(`Chart saved to ${filePath}`);
  }
}
