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
