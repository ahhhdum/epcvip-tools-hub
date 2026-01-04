/**
 * Tests for Wordle Guess Validation Service
 */

import {
  validateGuess,
  isWinningResult,
  isOutOfGuesses,
  countCorrectLetters,
  calculateScore,
  normalizeGuess,
  LetterResult,
} from './wordle-validator';

describe('validateGuess', () => {
  it('returns all correct for exact match', () => {
    const result = validateGuess('CRANE', 'CRANE');
    expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('returns all absent for no matches', () => {
    const result = validateGuess('QUICK', 'FLAME');
    expect(result).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('marks correct position as correct, not present', () => {
    const result = validateGuess('CRANE', 'CRATE');
    expect(result).toEqual(['correct', 'correct', 'correct', 'absent', 'correct']);
  });

  it('marks present letters in wrong position', () => {
    const result = validateGuess('STARE', 'REATS');
    // S: present (S is at position 4 in REATS)
    // T: present (T is at position 3 in REATS)
    // A: correct (A is at position 2 in both!)
    // R: present (R is at position 0 in REATS)
    // E: present (E is at position 1 in REATS)
    expect(result).toEqual(['present', 'present', 'correct', 'present', 'present']);
  });

  it('handles duplicate letters correctly - only marks available', () => {
    // Target: APPLE (has 2 P's)
    // Guess: PEPPER (has 3 P's, 2 E's)
    const result = validateGuess('PEPPR', 'APPLE');
    // P at 0: present (A is at 0 in APPLE, but P exists at 1,2)
    // E at 1: absent (E is at 4 in APPLE, but we're at 1)
    // P at 2: correct (matches P at 2 in APPLE)
    // P at 3: present (P at 1 still available)
    // R at 4: absent
    expect(result[2]).toBe('correct'); // Middle P matches
  });

  it('handles repeated letters - correct takes priority over present', () => {
    // Target: HELLO (has 2 L's at positions 2,3)
    // Guess: LLAMA
    const result = validateGuess('LLAMA', 'HELLO');
    // L at 0: present (L exists in HELLO at 2,3)
    // L at 1: present (second L still available at 3)
    // A at 2: absent (A not in HELLO)
    // M at 3: absent (M not in HELLO)
    // A at 4: absent (A not in HELLO)
    expect(result).toEqual(['present', 'present', 'absent', 'absent', 'absent']);
  });

  it('handles edge case with all same letter', () => {
    const result = validateGuess('AAAAA', 'AXXXX');
    // Only first A should be correct, rest absent
    expect(result).toEqual(['correct', 'absent', 'absent', 'absent', 'absent']);
  });

  it('classic wordle case: AROSE vs RENAL', () => {
    const result = validateGuess('AROSE', 'RENAL');
    // A: present (in RENAL at position 3)
    // R: present (in RENAL at position 0)
    // O: absent
    // S: absent
    // E: present (in RENAL at position 1)
    expect(result).toEqual(['present', 'present', 'absent', 'absent', 'present']);
  });
});

describe('isWinningResult', () => {
  it('returns true when all correct', () => {
    const result: LetterResult[] = ['correct', 'correct', 'correct', 'correct', 'correct'];
    expect(isWinningResult(result)).toBe(true);
  });

  it('returns false when any present', () => {
    const result: LetterResult[] = ['correct', 'correct', 'present', 'correct', 'correct'];
    expect(isWinningResult(result)).toBe(false);
  });

  it('returns false when any absent', () => {
    const result: LetterResult[] = ['correct', 'correct', 'correct', 'correct', 'absent'];
    expect(isWinningResult(result)).toBe(false);
  });
});

describe('isOutOfGuesses', () => {
  it('returns false for guesses 1-5', () => {
    expect(isOutOfGuesses(1)).toBe(false);
    expect(isOutOfGuesses(5)).toBe(false);
  });

  it('returns true for 6 guesses', () => {
    expect(isOutOfGuesses(6)).toBe(true);
  });

  it('returns true for more than 6 guesses', () => {
    expect(isOutOfGuesses(7)).toBe(true);
  });
});

describe('countCorrectLetters', () => {
  it('counts zero correct', () => {
    const result: LetterResult[] = ['absent', 'present', 'absent', 'present', 'absent'];
    expect(countCorrectLetters(result)).toBe(0);
  });

  it('counts all correct', () => {
    const result: LetterResult[] = ['correct', 'correct', 'correct', 'correct', 'correct'];
    expect(countCorrectLetters(result)).toBe(5);
  });

  it('counts mixed results', () => {
    const result: LetterResult[] = ['correct', 'present', 'correct', 'absent', 'correct'];
    expect(countCorrectLetters(result)).toBe(3);
  });
});

describe('calculateScore', () => {
  it('calculates max score for 1 guess instant solve', () => {
    // 1 guess: (7-1) * 100 = 600
    // 0ms time: 60000 / 1000 = 60
    // Total: 660
    const score = calculateScore(1, 0);
    expect(score).toBe(660);
  });

  it('calculates score for 6 guesses slow solve', () => {
    // 6 guesses: (7-6) * 100 = 100
    // 60000ms time: (60000 - 60000) / 1000 = 0
    // Total: 100
    const score = calculateScore(6, 60000);
    expect(score).toBe(100);
  });

  it('gives no time bonus for slow solves', () => {
    // 3 guesses: (7-3) * 100 = 400
    // 90000ms (1.5 min): no time bonus (past threshold)
    // Total: 400
    const score = calculateScore(3, 90000);
    expect(score).toBe(400);
  });

  it('calculates partial time bonus', () => {
    // 2 guesses: (7-2) * 100 = 500
    // 30000ms (30s): (60000 - 30000) / 1000 = 30
    // Total: 530
    const score = calculateScore(2, 30000);
    expect(score).toBe(530);
  });
});

describe('normalizeGuess', () => {
  it('converts lowercase to uppercase', () => {
    expect(normalizeGuess('hello')).toBe('HELLO');
  });

  it('keeps uppercase as is', () => {
    expect(normalizeGuess('WORLD')).toBe('WORLD');
  });

  it('handles mixed case', () => {
    expect(normalizeGuess('HeLLo')).toBe('HELLO');
  });
});
