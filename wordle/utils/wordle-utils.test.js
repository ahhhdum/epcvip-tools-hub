/**
 * Tests for Wordle Client Utility Functions
 *
 * Run from server/: npm test -- --testPathPattern=wordle-utils
 * Or: node --experimental-vm-modules node_modules/jest/bin/jest.js ../wordle/utils/wordle-utils.test.js
 */

import {
  formatTime,
  computeBestKnownState,
  countFilledRows,
  calculateDateFromDailyNumber,
  formatDateForDisplay,
} from './wordle-utils.js';

describe('formatTime', () => {
  it('formats zero correctly', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds with zero padding', () => {
    expect(formatTime(5000)).toBe('0:05');
  });

  it('formats seconds without padding when >= 10', () => {
    expect(formatTime(15000)).toBe('0:15');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(65000)).toBe('1:05');
  });

  it('formats large times', () => {
    expect(formatTime(600000)).toBe('10:00');
  });

  it('handles 59 seconds correctly', () => {
    expect(formatTime(59000)).toBe('0:59');
  });

  it('handles exactly 1 minute', () => {
    expect(formatTime(60000)).toBe('1:00');
  });
});

describe('computeBestKnownState', () => {
  it('returns empty state for empty array', () => {
    expect(computeBestKnownState([])).toEqual(['', '', '', '', '']);
  });

  it('returns empty state for null rows', () => {
    expect(computeBestKnownState([null, null])).toEqual(['', '', '', '', '']);
  });

  it('returns empty state for undefined rows', () => {
    expect(computeBestKnownState([undefined, undefined])).toEqual(['', '', '', '', '']);
  });

  it('correct takes priority over present', () => {
    const results = [
      ['present', 'absent', 'absent', 'absent', 'absent'],
      ['correct', 'absent', 'absent', 'absent', 'absent'],
    ];
    expect(computeBestKnownState(results)[0]).toBe('correct');
  });

  it('present is preserved when no correct', () => {
    const results = [['present', 'absent', 'absent', 'absent', 'absent']];
    expect(computeBestKnownState(results)[0]).toBe('present');
  });

  it('absent does not upgrade state', () => {
    const results = [
      ['present', 'absent', 'absent', 'absent', 'absent'],
      ['absent', 'absent', 'absent', 'absent', 'absent'],
    ];
    expect(computeBestKnownState(results)[0]).toBe('present');
  });

  it('handles all correct', () => {
    const results = [['correct', 'correct', 'correct', 'correct', 'correct']];
    expect(computeBestKnownState(results)).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('handles mixed results across multiple guesses', () => {
    const results = [
      ['absent', 'present', 'absent', 'absent', 'absent'],
      ['absent', 'absent', 'correct', 'absent', 'present'],
      ['correct', 'absent', 'correct', 'present', 'absent'],
    ];
    expect(computeBestKnownState(results)).toEqual([
      'correct',
      'present',
      'correct',
      'present',
      'present',
    ]);
  });
});

describe('countFilledRows', () => {
  it('returns 0 for empty array', () => {
    expect(countFilledRows([])).toBe(0);
  });

  it('counts non-empty rows', () => {
    const results = [
      ['correct', 'absent', 'absent', 'absent', 'absent'],
      ['present', 'present', 'absent', 'absent', 'absent'],
      null,
    ];
    expect(countFilledRows(results)).toBe(2);
  });

  it('ignores null and undefined rows', () => {
    const results = [null, undefined, [], null];
    expect(countFilledRows(results)).toBe(0);
  });

  it('ignores empty arrays', () => {
    const results = [[], [], []];
    expect(countFilledRows(results)).toBe(0);
  });

  it('counts all 6 filled rows', () => {
    const results = [
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b', 'c', 'd', 'e'],
    ];
    expect(countFilledRows(results)).toBe(6);
  });
});

describe('calculateDateFromDailyNumber', () => {
  it('returns epoch date for daily 1', () => {
    expect(calculateDateFromDailyNumber(1)).toBe('2024-01-01');
  });

  it('returns next day for daily 2', () => {
    expect(calculateDateFromDailyNumber(2)).toBe('2024-01-02');
  });

  it('handles end of year correctly', () => {
    expect(calculateDateFromDailyNumber(365)).toBe('2024-12-30');
    expect(calculateDateFromDailyNumber(366)).toBe('2024-12-31'); // 2024 is a leap year
  });

  it('handles year rollover', () => {
    expect(calculateDateFromDailyNumber(367)).toBe('2025-01-01');
  });

  it('handles large daily numbers', () => {
    // Daily 731 should be 2026-01-01 (2 years from epoch)
    expect(calculateDateFromDailyNumber(731)).toBe('2025-12-31');
    expect(calculateDateFromDailyNumber(732)).toBe('2026-01-01');
  });
});

describe('formatDateForDisplay', () => {
  it('formats arbitrary dates with weekday', () => {
    // January 15, 2024 was a Monday
    const result = formatDateForDisplay('2024-01-15');
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
  });

  it('formats different days of week', () => {
    // January 1, 2024 was a Monday
    expect(formatDateForDisplay('2024-01-01')).toMatch(/Mon/);
    // January 7, 2024 was a Sunday
    expect(formatDateForDisplay('2024-01-07')).toMatch(/Sun/);
  });

  // Note: "Yesterday" test is time-dependent, so we test the format consistency
  it('returns string format for non-yesterday dates', () => {
    const result = formatDateForDisplay('2024-06-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
