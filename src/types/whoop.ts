// ─── Shared ───────────────────────────────────────────────────────────────────

export type ScoreState = 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface WhoopProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface WhoopBody {
  height_meter: number;
  weight_kilogram: number;
  max_heart_rate: number;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export interface SleepStageSummary {
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_no_data_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
}

export interface SleepNeeded {
  baseline_milli: number;
  need_from_sleep_debt_milli: number;
  need_from_recent_strain_milli: number;
  need_from_recent_nap_milli: number;
}

export interface SleepScore {
  stage_summary: SleepStageSummary;
  sleep_needed: SleepNeeded;
  respiratory_rate?: number;
  sleep_performance_percentage?: number;
  sleep_consistency_percentage?: number;
  sleep_efficiency_percentage?: number;
}

export interface WhoopSleep {
  id: string;            // UUID
  cycle_id: number;
  v1_id?: number;        // deprecated, removed post 09/01/2025
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: ScoreState;
  score?: SleepScore;    // only present when score_state === 'SCORED'
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

export interface RecoveryScore {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage?: number;   // WHOOP 4.0+ only
  skin_temp_celsius?: number; // WHOOP 4.0+ only
}

export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: ScoreState;
  score?: RecoveryScore;  // only present when score_state === 'SCORED'
}

// ─── Workout ──────────────────────────────────────────────────────────────────

export interface ZoneDurations {
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
}

export interface WorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  zone_durations: ZoneDurations;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number; // net altitude change start→end
}

export interface WhoopWorkout {
  id: string;            // UUID
  v1_id?: number;        // deprecated, removed post 09/01/2025
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_id?: number;     // deprecated, removed post 09/01/2025
  sport_name: string;
  score_state: ScoreState;
  score?: WorkoutScore;  // only present when score_state === 'SCORED'
}

// ─── Cycle ────────────────────────────────────────────────────────────────────

export interface CycleScore {
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
}

export interface WhoopCycle {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string;          // absent if user is currently in this cycle
  timezone_offset: string;
  score_state: ScoreState;
  score?: CycleScore;    // only present when score_state === 'SCORED'
}

// ─── API primitives ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  records: T[];
  next_token?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// ─── CLI helpers ──────────────────────────────────────────────────────────────

export type DataType = 'profile' | 'body' | 'sleep' | 'recovery' | 'workout' | 'cycle';

export interface DateRange {
  start?: string;
  end?: string;
}

export interface QueryParams extends DateRange {
  limit?: number;
  nextToken?: string;
}

export interface CombinedOutput {
  profile?: WhoopProfile;
  body?: WhoopBody;
  sleep?: WhoopSleep[];
  recovery?: WhoopRecovery[];
  workout?: WhoopWorkout[];
  cycle?: WhoopCycle[];
  date: string;
  fetched_at: string;
}

export type WhoopData = CombinedOutput;
