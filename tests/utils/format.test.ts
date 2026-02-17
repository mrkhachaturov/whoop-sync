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
