import type { WhoopData, WhoopSleep, WhoopRecovery, WhoopCycle } from '../types/whoop.js';
import type { TrendData } from './analysis.js';
import {
  RECOVERY_GREEN, RECOVERY_YELLOW,
  SLEEP_PERF_GREEN, SLEEP_PERF_YELLOW,
  STRAIN_OPTIMAL_GREEN, STRAIN_OPTIMAL_YELLOW, STRAIN_OPTIMAL_RED,
  STRAIN_TOLERANCE, STRAIN_COLOR_TOLERANCE,
} from './constants.js';

export function formatPretty(data: WhoopData): string {
  const lines: string[] = [];
  lines.push(`📅 ${data.date}`);
  lines.push('');

  if (data.profile) {
    lines.push(`👤 ${data.profile.first_name} ${data.profile.last_name}`);
  }

  if (data.body) {
    const b = data.body;
    lines.push(`📏 ${b.height_meter}m | ${b.weight_kilogram}kg | Max HR: ${b.max_heart_rate}`);
  }

  const scoredRecovery = data.recovery?.filter(r => r.score_state === 'SCORED' && r.score != null);
  if (scoredRecovery?.length) {
    const r = scoredRecovery[0].score!;
    lines.push(`💚 Recovery: ${r.recovery_score}% | HRV: ${r.hrv_rmssd_milli.toFixed(1)}ms | RHR: ${r.resting_heart_rate}bpm`);
    if (r.spo2_percentage != null) lines.push(`   SpO2: ${r.spo2_percentage}% | Skin temp: ${r.skin_temp_celsius?.toFixed(1)}°C`);
  }

  const scoredSleep = data.sleep?.filter(s => s.score_state === 'SCORED' && s.score != null && !s.nap);
  if (scoredSleep?.length) {
    const s = scoredSleep[0].score!;
    const hours = (s.stage_summary.total_in_bed_time_milli / 3600000).toFixed(1);
    lines.push(`😴 Sleep: ${s.sleep_performance_percentage?.toFixed(0) ?? 'N/A'}% | ${hours}h | Efficiency: ${s.sleep_efficiency_percentage?.toFixed(0) ?? 'N/A'}%`);
    lines.push(`   REM: ${(s.stage_summary.total_rem_sleep_time_milli / 60000).toFixed(0)}min | Deep: ${(s.stage_summary.total_slow_wave_sleep_time_milli / 60000).toFixed(0)}min`);
  }

  const scoredWorkout = data.workout?.filter(w => w.score_state === 'SCORED' && w.score != null);
  if (scoredWorkout?.length) {
    lines.push(`🏋️ Workouts:`);
    for (const w of scoredWorkout) {
      const sc = w.score!;
      lines.push(`   ${w.sport_name}: Strain ${sc.strain.toFixed(1)} | Avg HR: ${sc.average_heart_rate} | ${(sc.kilojoule / 4.184).toFixed(0)} cal`);
    }
  }

  const scoredCycle = data.cycle?.filter(c => c.score_state === 'SCORED' && c.score != null);
  if (scoredCycle?.length) {
    const c = scoredCycle[0].score!;
    lines.push(`🔄 Day strain: ${c.strain.toFixed(1)} | ${(c.kilojoule / 4.184).toFixed(0)} cal | Avg HR: ${c.average_heart_rate}`);
  }

  return lines.join('\n');
}

export interface SummaryStats {
  days: number;
  avgSleepPerf: number | null;
  avgSleepHours: number | null;
  avgHrv: number | null;
  avgRhr: number | null;
  avgRecovery: number | null;
  avgStrain: number | null;
}

export function computeSummaryStats(
  sleep: WhoopSleep[],
  recovery: WhoopRecovery[],
  cycle: WhoopCycle[],
  days: number
): SummaryStats {
  const mainSleep = sleep.filter(s => s.score_state === 'SCORED' && s.score != null && !s.nap);
  const scoredRecovery = recovery.filter(r => r.score_state === 'SCORED' && r.score != null);
  const scoredCycle = cycle.filter(c => c.score_state === 'SCORED' && c.score != null);

  const sleepPerfs = mainSleep
    .filter(s => s.score!.sleep_performance_percentage != null)
    .map(s => s.score!.sleep_performance_percentage!);

  const sleepHours = mainSleep
    .filter(s => s.score!.stage_summary != null)
    .map(s => {
      const { total_in_bed_time_milli, total_awake_time_milli } = s.score!.stage_summary;
      return (total_in_bed_time_milli - total_awake_time_milli) / 3600000;
    });

  const hrvValues = scoredRecovery.map(r => r.score!.hrv_rmssd_milli);
  const rhrValues = scoredRecovery.map(r => r.score!.resting_heart_rate);
  const recoveryScores = scoredRecovery.map(r => r.score!.recovery_score);
  const strainValues = scoredCycle.map(c => c.score!.strain);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return {
    days,
    avgSleepPerf: avg(sleepPerfs),
    avgSleepHours: avg(sleepHours),
    avgHrv: avg(hrvValues),
    avgRhr: avg(rhrValues),
    avgRecovery: avg(recoveryScores),
    avgStrain: avg(strainValues),
  };
}

export function formatSummary(data: WhoopData): string {
  const parts: string[] = [];

  const scoredRecovery = data.recovery?.filter(r => r.score_state === 'SCORED' && r.score != null);
  if (scoredRecovery?.length) {
    const r = scoredRecovery[0].score!;
    parts.push(`Recovery: ${r.recovery_score}%`);
    parts.push(`HRV: ${r.hrv_rmssd_milli.toFixed(0)}ms`);
    parts.push(`RHR: ${r.resting_heart_rate}`);
  }

  const scoredSleep = data.sleep?.filter(s => s.score_state === 'SCORED' && s.score != null && !s.nap);
  if (scoredSleep?.length) {
    const perf = scoredSleep[0].score!.sleep_performance_percentage;
    if (perf != null) parts.push(`Sleep: ${perf}%`);
  }

  const scoredCycle = data.cycle?.filter(c => c.score_state === 'SCORED' && c.score != null);
  if (scoredCycle?.length) {
    parts.push(`Strain: ${scoredCycle[0].score!.strain.toFixed(1)}`);
  }

  const scoredWorkout = data.workout?.filter(w => w.score_state === 'SCORED');
  if (scoredWorkout?.length) {
    parts.push(`Workouts: ${scoredWorkout.length}`);
  }

  return parts.length ? `${data.date} | ${parts.join(' | ')}` : `${data.date} | No data`;
}

function statusIcon(value: number, green: number, yellow: number, invert = false): string {
  if (invert) {
    return value <= green ? '🟢' : value <= yellow ? '🟡' : '🔴';
  }
  return value >= green ? '🟢' : value >= yellow ? '🟡' : '🔴';
}

export function formatSummaryColor(data: WhoopData): string {
  const lines: string[] = [`📅 ${data.date}`];

  const scoredRecovery = data.recovery?.filter(r => r.score_state === 'SCORED' && r.score != null);
  if (scoredRecovery?.length) {
    const r = scoredRecovery[0].score!;
    const icon = statusIcon(r.recovery_score, RECOVERY_GREEN, RECOVERY_YELLOW);
    lines.push(`${icon} Recovery: ${r.recovery_score}% | HRV: ${r.hrv_rmssd_milli.toFixed(0)}ms | RHR: ${r.resting_heart_rate}bpm`);
  }

  const scoredSleep = data.sleep?.filter(s => s.score_state === 'SCORED' && s.score != null && !s.nap);
  if (scoredSleep?.length) {
    const s = scoredSleep[0].score!;
    const perf = s.sleep_performance_percentage ?? 0;
    const icon = statusIcon(perf, SLEEP_PERF_GREEN, SLEEP_PERF_YELLOW);
    const hours = (s.stage_summary.total_in_bed_time_milli / 3600000).toFixed(1);
    lines.push(`${icon} Sleep: ${perf.toFixed(0)}% | ${hours}h | Efficiency: ${s.sleep_efficiency_percentage?.toFixed(0) ?? 'N/A'}%`);
  }

  const scoredCycle = data.cycle?.filter(c => c.score_state === 'SCORED' && c.score != null);
  if (scoredCycle?.length) {
    const c = scoredCycle[0].score!;
    const recoveryScore = scoredRecovery?.[0]?.score?.recovery_score ?? 50;
    const optimal = recoveryScore >= RECOVERY_GREEN ? STRAIN_OPTIMAL_GREEN : recoveryScore >= RECOVERY_YELLOW ? STRAIN_OPTIMAL_YELLOW : STRAIN_OPTIMAL_RED;
    const diff = Math.abs(c.strain - optimal);
    const icon = diff <= STRAIN_TOLERANCE ? '🟢' : diff <= STRAIN_COLOR_TOLERANCE ? '🟡' : '🔴';
    lines.push(`${icon} Strain: ${c.strain.toFixed(1)} (optimal: ~${optimal}) | ${(c.kilojoule / 4.184).toFixed(0)} cal`);
  }

  const scoredWorkout = data.workout?.filter(w => w.score_state === 'SCORED');
  if (scoredWorkout?.length) {
    lines.push(`🏋️ Workouts: ${scoredWorkout.length} | ${scoredWorkout.map(w => w.sport_name).join(', ')}`);
  }

  return lines.join('\n');
}

export function formatSummaryStats(stats: SummaryStats, color = false): string {
  const lines: string[] = [`📊 ${stats.days}-Day Summary`];
  lines.push('');

  const fmt = (v: number | null, decimals = 0, unit = '') =>
    v != null ? `${v.toFixed(decimals)}${unit}` : 'N/A';

  if (stats.avgRecovery != null) {
    const icon = color ? (stats.avgRecovery >= RECOVERY_GREEN ? '🟢' : stats.avgRecovery >= RECOVERY_YELLOW ? '🟡' : '🔴') : '💚';
    lines.push(`${icon} Avg Recovery:  ${fmt(stats.avgRecovery, 1, '%')}`);
  }
  if (stats.avgHrv != null) {
    lines.push(`💓 Avg HRV:       ${fmt(stats.avgHrv, 1, 'ms')}`);
  }
  if (stats.avgRhr != null) {
    lines.push(`❤️  Avg RHR:       ${fmt(stats.avgRhr, 1, 'bpm')}`);
  }
  if (stats.avgSleepPerf != null) {
    const icon = color ? (stats.avgSleepPerf >= SLEEP_PERF_GREEN ? '🟢' : stats.avgSleepPerf >= SLEEP_PERF_YELLOW ? '🟡' : '🔴') : '😴';
    lines.push(`${icon} Avg Sleep:     ${fmt(stats.avgSleepPerf, 1, '%')} | ${fmt(stats.avgSleepHours, 1, 'h')}`);
  }
  if (stats.avgStrain != null) {
    lines.push(`🔥 Avg Strain:    ${fmt(stats.avgStrain, 1)}`);
  }

  return lines.join('\n');
}

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
