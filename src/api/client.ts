import { getValidTokens } from '../auth/tokens.js';
import { BASE_URL, ENDPOINTS, byId } from './endpoints.js';
import { WhoopError, ExitCode } from '../utils/errors.js';
import type {
  WhoopProfile,
  WhoopBody,
  WhoopSleep,
  WhoopRecovery,
  WhoopWorkout,
  WhoopCycle,
  ApiResponse,
  QueryParams,
  CombinedOutput,
  DataType,
} from '../types/whoop.js';
import { getDaysRange, getDateRange, nowISO } from '../utils/date.js';

const USER_AGENT = 'whoop-sync/1.0';
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const MAX_PAGES = 50;

async function request<T>(endpoint: string, params?: QueryParams): Promise<T> {
  const tokens = await getValidTokens();

  const url = new URL(BASE_URL + endpoint);
  if (params?.start) url.searchParams.set('start', params.start);
  if (params?.end) url.searchParams.set('end', params.end);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.nextToken) url.searchParams.set('nextToken', params.nextToken);

  let backoff = 1000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    if (RETRY_CODES.has(response.status) && attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      backoff *= 2;
      continue;
    }

    if (response.status === 401) {
      throw new WhoopError('Authentication failed', ExitCode.AUTH_ERROR, 401);
    }
    if (response.status === 429) {
      throw new WhoopError('Rate limit exceeded — try again later', ExitCode.RATE_LIMIT, 429);
    }
    throw new WhoopError(`API request failed`, ExitCode.GENERAL_ERROR, response.status);
  }

  throw new WhoopError('API request failed after retries', ExitCode.GENERAL_ERROR);
}

async function requestDelete(endpoint: string): Promise<void> {
  const tokens = await getValidTokens();

  const response = await fetch(BASE_URL + endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new WhoopError(`DELETE request failed`, ExitCode.GENERAL_ERROR, response.status);
  }
}

async function fetchAll<T>(
  endpoint: string,
  params: QueryParams,
  fetchAllPages: boolean
): Promise<T[]> {
  const results: T[] = [];
  let nextToken: string | undefined;
  let pages = 0;

  do {
    if (pages >= MAX_PAGES) {
      console.error(`Warning: pagination cap (${MAX_PAGES} pages) reached for ${endpoint}`);
      break;
    }
    const response = await request<ApiResponse<T>>(endpoint, { ...params, nextToken });
    results.push(...response.records);
    nextToken = fetchAllPages ? response.next_token : undefined;
    pages++;
  } while (nextToken);

  return results;
}

// ─── Collection endpoints ─────────────────────────────────────────────────────

export async function getProfile(): Promise<WhoopProfile> {
  return request<WhoopProfile>(ENDPOINTS.profile);
}

export async function getBody(): Promise<WhoopBody> {
  return request<WhoopBody>(ENDPOINTS.body);
}

export async function getSleep(params: QueryParams = {}, all = true): Promise<WhoopSleep[]> {
  return fetchAll<WhoopSleep>(ENDPOINTS.sleep, { limit: 25, ...params }, all);
}

export async function getRecovery(params: QueryParams = {}, all = true): Promise<WhoopRecovery[]> {
  return fetchAll<WhoopRecovery>(ENDPOINTS.recovery, { limit: 25, ...params }, all);
}

export async function getWorkout(params: QueryParams = {}, all = true): Promise<WhoopWorkout[]> {
  return fetchAll<WhoopWorkout>(ENDPOINTS.workout, { limit: 25, ...params }, all);
}

export async function getCycle(params: QueryParams = {}, all = true): Promise<WhoopCycle[]> {
  return fetchAll<WhoopCycle>(ENDPOINTS.cycle, { limit: 25, ...params }, all);
}

// ─── By-ID endpoints ──────────────────────────────────────────────────────────

export async function getSleepById(id: string): Promise<WhoopSleep> {
  return request<WhoopSleep>(byId.sleep(id));
}

export async function getWorkoutById(id: string): Promise<WhoopWorkout> {
  return request<WhoopWorkout>(byId.workout(id));
}

export async function getCycleById(id: number): Promise<WhoopCycle> {
  return request<WhoopCycle>(byId.cycle(id));
}

// ─── Cycle sub-resource endpoints ─────────────────────────────────────────────

export async function getSleepForCycle(cycleId: number): Promise<WhoopSleep> {
  return request<WhoopSleep>(byId.cycleSleep(cycleId));
}

export async function getRecoveryForCycle(cycleId: number): Promise<WhoopRecovery> {
  return request<WhoopRecovery>(byId.cycleRecovery(cycleId));
}

// ─── Revoke access ────────────────────────────────────────────────────────────

export async function revokeAccess(): Promise<void> {
  return requestDelete(ENDPOINTS.revokeAccess);
}

// ─── Composite helpers ────────────────────────────────────────────────────────

export async function fetchData(
  types: DataType[],
  rangeParams: QueryParams,
  options: { limit?: number; all?: boolean } = {}
): Promise<CombinedOutput> {
  const params: QueryParams = { ...rangeParams, limit: options.limit ?? 25 };
  const fetchAllPages = options.all ?? true;

  const output: CombinedOutput = {
    date: new Date().toISOString().split('T')[0],
    fetched_at: nowISO(),
  };

  const fetchers: Record<DataType, () => Promise<void>> = {
    profile: async () => { output.profile = await getProfile(); },
    body: async () => { output.body = await getBody(); },
    sleep: async () => { output.sleep = await getSleep(params, fetchAllPages); },
    recovery: async () => { output.recovery = await getRecovery(params, fetchAllPages); },
    workout: async () => { output.workout = await getWorkout(params, fetchAllPages); },
    cycle: async () => { output.cycle = await getCycle(params, fetchAllPages); },
  };

  await Promise.all(types.map((type) => fetchers[type]()));

  return output;
}

export function buildRangeParams(options: {
  days?: number;
  start?: string;
  end?: string;
  date?: string;
}): QueryParams {
  if (options.start || options.end) {
    return {
      start: options.start ? options.start + 'T00:00:00.000Z' : undefined,
      end: options.end ? options.end + 'T23:59:59.999Z' : undefined,
    };
  }
  if (options.date) {
    // Use WHOOP day boundaries (4am–4am) for a single date
    return getDateRange(options.date);
  }
  // Default: last N days
  return getDaysRange(options.days ?? 7);
}
