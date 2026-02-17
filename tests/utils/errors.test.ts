import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WhoopError, ExitCode } from '../../src/utils/errors.js';

describe('ExitCode', () => {
  it('has correct values', () => {
    assert.equal(ExitCode.SUCCESS, 0);
    assert.equal(ExitCode.GENERAL_ERROR, 1);
    assert.equal(ExitCode.AUTH_ERROR, 2);
    assert.equal(ExitCode.RATE_LIMIT, 3);
    assert.equal(ExitCode.NETWORK_ERROR, 4);
  });
});

describe('WhoopError', () => {
  it('stores message, code, and statusCode', () => {
    const err = new WhoopError('test', ExitCode.AUTH_ERROR, 401);
    assert.equal(err.message, 'test');
    assert.equal(err.code, ExitCode.AUTH_ERROR);
    assert.equal(err.statusCode, 401);
    assert.equal(err.name, 'WhoopError');
  });

  it('works without statusCode', () => {
    const err = new WhoopError('msg', ExitCode.GENERAL_ERROR);
    assert.equal(err.statusCode, undefined);
  });

  it('is instanceof Error', () => {
    const err = new WhoopError('msg', ExitCode.GENERAL_ERROR);
    assert.ok(err instanceof Error);
  });
});
