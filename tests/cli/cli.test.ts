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

  it('trends --help shows valid days options in description', async () => {
    // Note: '--days 5' cannot be tested directly because Commander.js intercepts
    // the root-level '--days' option before subcommand option parsing.
    // The days validation is covered at unit level; here we verify the help text.
    const { stdout, exitCode } = await run('trends', '--help');
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('7, 14, or 30'));
  });
});
