/**
 * Tests for Wordle Game Logic Module
 *
 * Run from server/: npm test -- --testPathPattern=game-logic
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateResult,
  isWinningResult,
  isOutOfGuesses,
  countCorrectLetters,
  calculateScore,
  normalizeGuess,
  validateWord,
  handleRejection,
  checkGameOver,
  getRemainingGuesses,
  GameLogic,
  WORD_LENGTH,
  MAX_GUESSES,
} from './game-logic.js';

describe('Game Logic Module', () => {
  describe('calculateResult', () => {
    it('marks all correct for exact match', () => {
      expect(calculateResult('CRANE', 'CRANE')).toEqual([
        'correct',
        'correct',
        'correct',
        'correct',
        'correct',
      ]);
    });

    it('marks all absent for no matching letters', () => {
      expect(calculateResult('AUDIO', 'SYMPHONY'.slice(0, 5))).toEqual([
        'absent',
        'absent',
        'absent',
        'absent',
        'absent',
      ]);
    });

    it('marks present for letter in wrong position', () => {
      // CRANE vs CLEAR: C correct, L absent, E present, A present, R present
      const result = calculateResult('CRANE', 'CLEAR');
      expect(result[0]).toBe('correct'); // C
      expect(result[1]).toBe('present'); // R is in CLEAR
      expect(result[2]).toBe('present'); // A is in CLEAR
    });

    it('handles repeated letters - correct takes priority', () => {
      // SLEEP vs CREEP: only one E should be present, one correct
      const result = calculateResult('SLEEP', 'CREEP');
      expect(result[2]).toBe('correct'); // E at position 2
      expect(result[3]).toBe('correct'); // E at position 3
      expect(result[4]).toBe('correct'); // P at position 4
    });

    it('handles repeated letters - limits to target count', () => {
      // EERIE vs SPEED: target has 2 Es, guess has 3 Es
      const result = calculateResult('EERIE', 'SPEED');
      const eCount = result.filter((r, i) => 'EERIE'[i] === 'E' && r !== 'absent').length;
      expect(eCount).toBeLessThanOrEqual(2); // Can't mark more Es than in target
    });

    it('classic wordle case: AROSE vs RENAL', () => {
      const result = calculateResult('AROSE', 'RENAL');
      expect(result[0]).toBe('present'); // A in RENAL
      expect(result[1]).toBe('present'); // R in RENAL
      expect(result[2]).toBe('absent'); // O not in RENAL
      expect(result[3]).toBe('absent'); // S not in RENAL
      expect(result[4]).toBe('present'); // E in RENAL
    });
  });

  describe('isWinningResult', () => {
    it('returns true for all correct', () => {
      expect(isWinningResult(['correct', 'correct', 'correct', 'correct', 'correct'])).toBe(true);
    });

    it('returns false for any present', () => {
      expect(isWinningResult(['correct', 'correct', 'present', 'correct', 'correct'])).toBe(false);
    });

    it('returns false for any absent', () => {
      expect(isWinningResult(['correct', 'correct', 'absent', 'correct', 'correct'])).toBe(false);
    });
  });

  describe('isOutOfGuesses', () => {
    it('returns false for 0-5 guesses', () => {
      for (let i = 0; i < 6; i++) {
        expect(isOutOfGuesses(i)).toBe(false);
      }
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
      expect(countCorrectLetters(['absent', 'absent', 'absent', 'absent', 'absent'])).toBe(0);
    });

    it('counts all correct', () => {
      expect(countCorrectLetters(['correct', 'correct', 'correct', 'correct', 'correct'])).toBe(5);
    });

    it('counts mixed results', () => {
      expect(countCorrectLetters(['correct', 'present', 'absent', 'correct', 'present'])).toBe(2);
    });
  });

  describe('calculateScore', () => {
    it('calculates max score for 1 guess instant solve', () => {
      // (7-1)*100 + 60 = 660
      expect(calculateScore(1, 0)).toBe(660);
    });

    it('calculates score for 6 guesses with no time bonus', () => {
      // (7-6)*100 + 0 = 100
      expect(calculateScore(6, 60000)).toBe(100);
    });

    it('gives no time bonus for slow solves', () => {
      expect(calculateScore(3, 120000)).toBe(400); // Just guess bonus
    });

    it('calculates partial time bonus', () => {
      // (7-2)*100 + (60000-30000)/1000 = 500 + 30 = 530
      expect(calculateScore(2, 30000)).toBe(530);
    });
  });

  describe('normalizeGuess', () => {
    it('converts lowercase to uppercase', () => {
      expect(normalizeGuess('crane')).toBe('CRANE');
    });

    it('keeps uppercase as is', () => {
      expect(normalizeGuess('CRANE')).toBe('CRANE');
    });

    it('handles mixed case', () => {
      expect(normalizeGuess('CrAnE')).toBe('CRANE');
    });
  });

  describe('validateWord', () => {
    const dictionary = new Set(['CRANE', 'SLATE', 'AUDIO', 'RAISE']);

    it('rejects words wrong length', () => {
      expect(validateWord('CAT', dictionary)).toEqual({ valid: false, reason: 'wrong-length' });
      expect(validateWord('CRANES', dictionary)).toEqual({ valid: false, reason: 'wrong-length' });
    });

    it('rejects words not in dictionary', () => {
      expect(validateWord('ZZZZZ', dictionary)).toEqual({
        valid: false,
        reason: 'not-in-dictionary',
      });
    });

    it('accepts valid words', () => {
      expect(validateWord('CRANE', dictionary)).toEqual({ valid: true });
      expect(validateWord('SLATE', dictionary)).toEqual({ valid: true });
    });
  });

  describe('handleRejection', () => {
    it('returns reject on first rejection of new word', () => {
      expect(handleRejection('ZZZZZ', null, 0)).toEqual({
        action: 'reject',
        count: 1,
        lastRejected: 'ZZZZZ',
      });
    });

    it('returns warn on second rejection of same word', () => {
      expect(handleRejection('ZZZZZ', 'ZZZZZ', 1)).toEqual({
        action: 'warn',
        count: 2,
        lastRejected: 'ZZZZZ',
      });
    });

    it('returns force-submit on third rejection of same word', () => {
      expect(handleRejection('ZZZZZ', 'ZZZZZ', 2)).toEqual({
        action: 'force-submit',
        count: 0,
        lastRejected: null,
      });
    });

    it('resets count when word changes', () => {
      expect(handleRejection('YYYYY', 'ZZZZZ', 2)).toEqual({
        action: 'reject',
        count: 1,
        lastRejected: 'YYYYY',
      });
    });
  });

  describe('checkGameOver', () => {
    it('returns won when last result is all correct', () => {
      const result = ['correct', 'correct', 'correct', 'correct', 'correct'];
      expect(checkGameOver(['CRANE'], result)).toEqual({ gameOver: true, won: true });
    });

    it('returns loss when out of guesses', () => {
      const guesses = ['A', 'B', 'C', 'D', 'E', 'F'];
      const result = ['absent', 'absent', 'absent', 'absent', 'absent'];
      expect(checkGameOver(guesses, result)).toEqual({ gameOver: true, won: false });
    });

    it('returns not over when guesses remaining and not won', () => {
      const result = ['correct', 'absent', 'absent', 'absent', 'absent'];
      expect(checkGameOver(['CRANE'], result)).toEqual({ gameOver: false, won: false });
    });
  });

  describe('getRemainingGuesses', () => {
    it('returns 6 for 0 guesses', () => {
      expect(getRemainingGuesses(0)).toBe(6);
    });

    it('returns 0 for 6 guesses', () => {
      expect(getRemainingGuesses(6)).toBe(0);
    });

    it('returns 0 for more than 6 guesses', () => {
      expect(getRemainingGuesses(10)).toBe(0);
    });
  });

  describe('constants', () => {
    it('has correct WORD_LENGTH', () => {
      expect(WORD_LENGTH).toBe(5);
    });

    it('has correct MAX_GUESSES', () => {
      expect(MAX_GUESSES).toBe(6);
    });
  });
});

describe('GameLogic class', () => {
  let logic;

  beforeEach(() => {
    logic = new GameLogic();
  });

  describe('updateKeyboardState', () => {
    it('sets initial state', () => {
      logic.updateKeyboardState('A', 'absent');
      expect(logic.keyboardState.get('A')).toBe('absent');
    });

    it('upgrades absent to present', () => {
      logic.updateKeyboardState('A', 'absent');
      logic.updateKeyboardState('A', 'present');
      expect(logic.keyboardState.get('A')).toBe('present');
    });

    it('upgrades present to correct', () => {
      logic.updateKeyboardState('A', 'present');
      logic.updateKeyboardState('A', 'correct');
      expect(logic.keyboardState.get('A')).toBe('correct');
    });

    it('does not downgrade correct', () => {
      logic.updateKeyboardState('A', 'correct');
      logic.updateKeyboardState('A', 'present');
      expect(logic.keyboardState.get('A')).toBe('correct');
    });

    it('does not downgrade present to absent', () => {
      logic.updateKeyboardState('A', 'present');
      logic.updateKeyboardState('A', 'absent');
      expect(logic.keyboardState.get('A')).toBe('present');
    });
  });

  describe('updateKeyboardFromGuess', () => {
    it('updates all letters from guess', () => {
      const result = ['correct', 'present', 'absent', 'absent', 'correct'];
      logic.updateKeyboardFromGuess('CRANE', result);

      expect(logic.keyboardState.get('C')).toBe('correct');
      expect(logic.keyboardState.get('R')).toBe('present');
      expect(logic.keyboardState.get('A')).toBe('absent');
      expect(logic.keyboardState.get('N')).toBe('absent');
      expect(logic.keyboardState.get('E')).toBe('correct');
    });
  });

  describe('resetKeyboard', () => {
    it('clears all state', () => {
      logic.updateKeyboardState('A', 'correct');
      logic.updateKeyboardState('B', 'present');
      logic.resetKeyboard();
      expect(logic.keyboardState.size).toBe(0);
    });
  });

  describe('getLetterState', () => {
    it('returns state for known letter', () => {
      logic.updateKeyboardState('A', 'correct');
      expect(logic.getLetterState('A')).toBe('correct');
    });

    it('returns undefined for unknown letter', () => {
      expect(logic.getLetterState('Z')).toBeUndefined();
    });

    it('handles lowercase input', () => {
      logic.updateKeyboardState('A', 'present');
      expect(logic.getLetterState('a')).toBe('present');
    });
  });
});
