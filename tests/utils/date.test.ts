import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getWhoopDay, validateISODate, getDaysAgo, getDateRange, formatDate, nowISO } from '../../src/utils/date.js';

describe('getWhoopDay', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    const result = getWhoopDay();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns previous day for local time before 4am', () => {
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const result = getWhoopDay(d.toISOString());
    const expected = new Date(d);
    expected.setDate(expected.getDate() - 1);
    assert.equal(result, formatDate(expected));
  });

  it('returns same day for local time at or after 4am', () => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    const result = getWhoopDay(d.toISOString());
    assert.equal(result, formatDate(d));
  });
});

describe('validateISODate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    assert.equal(validateISODate('2024-03-15'), true);
  });

  it('rejects invalid format', () => {
    assert.equal(validateISODate('03-15-2024'), false);
    assert.equal(validateISODate('2024/03/15'), false);
    assert.equal(validateISODate('not-a-date'), false);
  });

  it('rejects month 13', () => {
    assert.equal(validateISODate('2024-13-01'), false);
  });
});

describe('getDaysAgo', () => {
  it('returns a date N days in the past', () => {
    const result = getDaysAgo(7);
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    assert.equal(result, formatDate(expected));
  });
});

describe('getDateRange', () => {
  it('returns start/end ISO strings', () => {
    const range = getDateRange('2024-03-15');
    assert.ok(range.start.includes('T'));
    assert.ok(range.end.includes('T'));
    const start = new Date(range.start);
    const end = new Date(range.end);
    assert.ok(end.getTime() > start.getTime());
  });
});

describe('nowISO', () => {
  it('returns a valid ISO string', () => {
    const result = nowISO();
    assert.ok(!isNaN(new Date(result).getTime()));
  });
});
