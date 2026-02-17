import { Command } from 'commander';
import { login, logout, status as authStatus, refresh as authRefresh } from './auth/oauth.js';
import {
  fetchData,
  getRecovery,
  getSleep,
  getCycle,
  getWorkout,
  getSleepById,
  getWorkoutById,
  getCycleById,
  getSleepForCycle,
  getRecoveryForCycle,
  buildRangeParams,
} from './api/client.js';
import { validateISODate, getDaysAgo, getDaysRange } from './utils/date.js';
import { handleError, WhoopError, ExitCode } from './utils/errors.js';
import {
  formatPretty,
  formatSummaryColor,
  formatSummaryStats,
  computeSummaryStats,
  formatDashboard,
} from './utils/format.js';
import { analyzeTrends, generateInsights, formatTrends, formatInsights } from './utils/analysis.js';
import {
  buildSleepChart,
  buildRecoveryChart,
  buildStrainChart,
  buildHrvChart,
  buildDashboard,
  openChart,
} from './charts/generator.js';
import type { DataType, WhoopData, QueryParams } from './types/whoop.js';

export const program = new Command();

function outputJson(data: WhoopData, pretty: boolean): void {
  console.log(pretty ? formatPretty(data) : JSON.stringify(data, null, 2));
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

program
  .name('whoop-sync')
  .description('Pro CLI for WHOOP health data — fetch, analyze, and visualize')
  .version('1.0.0');

program
  .command('auth')
  .description('Manage authentication')
  .argument('<action>', 'login, logout, status, or refresh')
  .action(async (action: string) => {
    try {
      switch (action) {
        case 'login': await login(); break;
        case 'logout': await logout(); break;
        case 'status': authStatus(); break;
        case 'refresh': await authRefresh(); break;
        default:
          throw new WhoopError(
            `Unknown auth action: ${action}. Use: login, logout, status, refresh`,
            ExitCode.GENERAL_ERROR
          );
      }
    } catch (error) {
      handleError(error);
    }
  });

// ─── Data commands ────────────────────────────────────────────────────────────

interface DataOptions {
  days?: string;
  date?: string;
  start?: string;
  end?: string;
  limit?: string;
  all?: boolean;
  pretty?: boolean;
}

function resolveRange(options: DataOptions): QueryParams {
  if (options.date) {
    if (!validateISODate(options.date)) {
      throw new WhoopError('Invalid date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
    }
  }
  if (options.start && !validateISODate(options.start)) {
    throw new WhoopError('Invalid --start date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
  }
  if (options.end && !validateISODate(options.end)) {
    throw new WhoopError('Invalid --end date format. Use YYYY-MM-DD', ExitCode.GENERAL_ERROR);
  }

  return buildRangeParams({
    days: options.days ? parseInt(options.days, 10) : 7,
    date: options.date,
    start: options.start,
    end: options.end,
  });
}

function addDataCommand(name: string, description: string, dataType: DataType): void {
  program
    .command(name)
    .description(description)
    .option('-n, --days <number>', 'Number of days to fetch (default: 7)')
    .option('-d, --date <date>', 'Specific date in ISO format (YYYY-MM-DD)')
    .option('-s, --start <date>', 'Start date for range query')
    .option('-e, --end <date>', 'End date for range query')
    .option('-l, --limit <number>', 'Max results per page', '25')
    .option('-a, --all', 'Fetch all pages')
    .option('-p, --pretty', 'Human-readable output')
    .action(async (options: DataOptions) => {
      try {
        const range = resolveRange(options);
        const result = await fetchData([dataType], range, {
          limit: options.limit ? parseInt(options.limit, 10) : 25,
          all: options.all ?? true,
        });
        outputJson(result, options.pretty ?? false);
      } catch (error) {
        handleError(error);
      }
    });
}

addDataCommand('sleep', 'Get sleep data (default: last 7 days)', 'sleep');
addDataCommand('recovery', 'Get recovery data (default: last 7 days)', 'recovery');
addDataCommand('workout', 'Get workout data (default: last 7 days)', 'workout');
addDataCommand('cycle', 'Get cycle/strain data (default: last 7 days)', 'cycle');
addDataCommand('profile', 'Get user profile', 'profile');
addDataCommand('body', 'Get body measurements', 'body');

// ─── Summary ──────────────────────────────────────────────────────────────────

program
  .command('summary')
  .description('Multi-day health summary with averages (HRV, RHR, sleep%, strain)')
  .option('-n, --days <number>', 'Number of days to summarize', '7')
  .option('-s, --start <date>', 'Start date for range query')
  .option('-e, --end <date>', 'End date for range query')
  .option('-c, --color', 'Color-coded output with status indicators')
  .option('--json', 'Output raw JSON')
  .action(async (options: { days?: string; start?: string; end?: string; color?: boolean; json?: boolean }) => {
    try {
      const days = parseInt(options.days ?? '7', 10);
      const range = options.start || options.end
        ? {
            start: options.start ? options.start + 'T00:00:00.000Z' : undefined,
            end: options.end ? options.end + 'T23:59:59.999Z' : undefined,
          }
        : getDaysRange(days);

      const [recovery, sleep, cycle] = await Promise.all([
        getRecovery(range, true),
        getSleep(range, true),
        getCycle(range, true),
      ]);

      const stats = computeSummaryStats(sleep, recovery, cycle, days);

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(formatSummaryStats(stats, options.color));
    } catch (error) {
      handleError(error);
    }
  });

// ─── Trends ───────────────────────────────────────────────────────────────────

program
  .command('trends')
  .description('Show trends over time (7/14/30 days)')
  .option('-n, --days <number>', 'Number of days to analyze (7, 14, or 30)', '7')
  .option('--json', 'Output raw JSON instead of formatted text')
  .action(async (options: { days?: string; json?: boolean }) => {
    try {
      const days = parseInt(options.days ?? '7', 10);
      if (![7, 14, 30].includes(days)) {
        throw new WhoopError('Days must be 7, 14, or 30', ExitCode.GENERAL_ERROR);
      }

      const startDate = getDaysAgo(days);
      const params = {
        start: startDate + 'T00:00:00.000Z',
        end: new Date().toISOString(),
        limit: 50,
      };

      const [recovery, sleep, cycle] = await Promise.all([
        getRecovery(params, true),
        getSleep(params, true),
        getCycle(params, true),
      ]);

      const trends = analyzeTrends(recovery, sleep, cycle, days);
      console.log(formatTrends(trends, !options.json));
    } catch (error) {
      handleError(error);
    }
  });

// ─── Insights ─────────────────────────────────────────────────────────────────

program
  .command('insights')
  .description('AI-style health insights and recommendations')
  .option('-n, --days <number>', 'Days of history to analyze', '7')
  .option('--json', 'Output raw JSON instead of formatted text')
  .action(async (options: { days?: string; json?: boolean }) => {
    try {
      const days = parseInt(options.days ?? '7', 10);
      const range = getDaysRange(days);

      const [recovery, sleep, cycle, workout] = await Promise.all([
        getRecovery(range, true),
        getSleep(range, true),
        getCycle(range, true),
        getWorkout(range, true),
      ]);

      const insights = generateInsights(recovery, sleep, cycle, workout);
      console.log(formatInsights(insights, !options.json));
    } catch (error) {
      handleError(error);
    }
  });

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

// ─── Charts ───────────────────────────────────────────────────────────────────

program
  .command('chart')
  .description('Generate interactive HTML chart and open in browser')
  .argument('<type>', 'Chart type: sleep | recovery | strain | hrv | dashboard')
  .option('-n, --days <number>', 'Number of days of data to chart', '30')
  .option('-o, --output <file>', 'Save to file instead of opening in browser')
  .action(async (type: string, options: { days?: string; output?: string }) => {
    try {
      const days = parseInt(options.days ?? '30', 10);
      const range = getDaysRange(days);
      const validTypes = ['sleep', 'recovery', 'strain', 'hrv', 'dashboard'];

      if (!validTypes.includes(type)) {
        throw new WhoopError(
          `Unknown chart type: ${type}. Use: ${validTypes.join(', ')}`,
          ExitCode.GENERAL_ERROR
        );
      }

      let body: string;
      let title: string;

      switch (type) {
        case 'sleep': {
          const data = await getSleep(range, true);
          body = buildSleepChart(data);
          title = 'Sleep Analysis';
          break;
        }
        case 'recovery': {
          const data = await getRecovery(range, true);
          body = buildRecoveryChart(data);
          title = 'Recovery Analysis';
          break;
        }
        case 'strain': {
          const data = await getCycle(range, true);
          body = buildStrainChart(data);
          title = 'Strain Analysis';
          break;
        }
        case 'hrv': {
          const data = await getRecovery(range, true);
          body = buildHrvChart(data);
          title = 'HRV Trends';
          break;
        }
        case 'dashboard': {
          const [sleep, recovery, cycle, workout] = await Promise.all([
            getSleep(range, true),
            getRecovery(range, true),
            getCycle(range, true),
            getWorkout(range, true),
          ]);
          body = buildDashboard(sleep, recovery, cycle, workout);
          title = 'Health Dashboard';
          break;
        }
        default:
          throw new WhoopError(`Unknown chart type: ${type}`, ExitCode.GENERAL_ERROR);
      }

      await openChart(title, body, options.output);
    } catch (error) {
      handleError(error);
    }
  });

// ─── By-ID lookup commands ────────────────────────────────────────────────────

program
  .command('get')
  .description('Fetch a single record by ID')
  .argument('<type>', 'Record type: sleep | workout | cycle')
  .argument('<id>', 'Record ID (UUID for sleep/workout, integer for cycle)')
  .action(async (type: string, id: string) => {
    try {
      let result: unknown;
      switch (type) {
        case 'sleep':
          result = await getSleepById(id);
          break;
        case 'workout':
          result = await getWorkoutById(id);
          break;
        case 'cycle':
          result = await getCycleById(parseInt(id, 10));
          break;
        default:
          throw new WhoopError(`Unknown type: ${type}. Use: sleep, workout, cycle`, ExitCode.GENERAL_ERROR);
      }
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ─── Cycle sub-resource commands ──────────────────────────────────────────────

program
  .command('cycle-sleep')
  .description('Get the sleep record linked to a specific cycle ID')
  .argument('<cycleId>', 'Cycle ID (integer)')
  .action(async (cycleId: string) => {
    try {
      const result = await getSleepForCycle(parseInt(cycleId, 10));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('cycle-recovery')
  .description('Get the recovery record linked to a specific cycle ID')
  .argument('<cycleId>', 'Cycle ID (integer)')
  .action(async (cycleId: string) => {
    try {
      const result = await getRecoveryForCycle(parseInt(cycleId, 10));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ─── Root flags (select multiple types) ──────────────────────────────────────

program
  .option('-n, --days <number>', 'Number of days to fetch (default: 7)')
  .option('-d, --date <date>', 'Date in ISO format (YYYY-MM-DD)')
  .option('-s, --start <date>', 'Start date')
  .option('-e, --end <date>', 'End date')
  .option('-l, --limit <number>', 'Max results per page', '25')
  .option('-a, --all', 'Fetch all pages')
  .option('-p, --pretty', 'Human-readable output')
  .option('--sleep', 'Include sleep data')
  .option('--recovery', 'Include recovery data')
  .option('--workout', 'Include workout data')
  .option('--cycle', 'Include cycle data')
  .option('--profile', 'Include profile data')
  .option('--body', 'Include body measurements')
  .action(async (options) => {
    try {
      const types: DataType[] = [];
      if (options.sleep) types.push('sleep');
      if (options.recovery) types.push('recovery');
      if (options.workout) types.push('workout');
      if (options.cycle) types.push('cycle');
      if (options.profile) types.push('profile');
      if (options.body) types.push('body');

      if (types.length === 0) {
        program.help();
        return;
      }

      const range = resolveRange(options);
      const result = await fetchData(types, range, {
        limit: options.limit ? parseInt(options.limit, 10) : 25,
        all: options.all ?? true,
      });

      outputJson(result, options.pretty ?? false);
    } catch (error) {
      handleError(error);
    }
  });
