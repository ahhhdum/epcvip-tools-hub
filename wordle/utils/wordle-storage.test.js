/**
 * Tests for Wordle Storage Module
 *
 * Run from server/: npm test -- --testPathPattern=wordle-storage
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  saveSession,
  clearSession,
  getSession,
  saveDailyProgress,
  getDailyProgress,
  clearDailyProgress,
  SESSION_STORAGE_KEY,
  SESSION_MAX_AGE_MS,
  DAILY_PROGRESS_KEY,
} from './wordle-storage.js';

// Mock localStorage
let store = {};
const localStorageMock = {
  getItem: jest.fn((key) => store[key] || null),
  setItem: jest.fn((key, value) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
  }),
  clear: () => {
    store = {};
  },
};

// Mock console methods to suppress output during tests
const consoleMock = {
  log: jest.fn(),
  warn: jest.fn(),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'console', {
  value: { ...console, log: consoleMock.log, warn: consoleMock.warn },
});

beforeEach(() => {
  store = {}; // Reset the store
  jest.clearAllMocks();
});

describe('Session Storage', () => {
  describe('saveSession', () => {
    it('saves session to localStorage', () => {
      saveSession('ABC123', 'wp1_123');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        SESSION_STORAGE_KEY,
        expect.stringContaining('ABC123')
      );
    });

    it('includes roomCode, playerId, and savedAt', () => {
      saveSession('XYZ789', 'wp2_456');

      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedData.roomCode).toBe('XYZ789');
      expect(savedData.playerId).toBe('wp2_456');
      expect(savedData.savedAt).toBeDefined();
      expect(typeof savedData.savedAt).toBe('number');
    });
  });

  describe('clearSession', () => {
    it('removes session from localStorage', () => {
      saveSession('ABC123', 'wp1_123');
      clearSession();

      expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });
  });

  describe('getSession', () => {
    it('returns session when valid', () => {
      const now = Date.now();
      const session = { roomCode: 'ABC123', playerId: 'wp1_123', savedAt: now };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      const result = getSession();

      expect(result).toEqual(session);
    });

    it('returns null when no session exists', () => {
      const result = getSession();

      expect(result).toBeNull();
    });

    it('returns null and clears when session expired', () => {
      const expiredTime = Date.now() - SESSION_MAX_AGE_MS - 1000;
      const session = { roomCode: 'ABC123', playerId: 'wp1_123', savedAt: expiredTime };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      const result = getSession();

      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });

    it('returns session when just under expiry', () => {
      const almostExpired = Date.now() - SESSION_MAX_AGE_MS + 1000;
      const session = { roomCode: 'ABC123', playerId: 'wp1_123', savedAt: almostExpired };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      const result = getSession();

      expect(result).toEqual(session);
    });
  });
});

describe('Daily Progress Storage', () => {
  const testEmail = 'test@example.com';
  const testProgress = {
    dailyNumber: 100,
    guesses: ['CRANE', 'SLATE'],
    guessResults: [
      ['absent', 'absent', 'correct', 'absent', 'present'],
      ['correct', 'absent', 'correct', 'absent', 'present'],
    ],
  };

  describe('saveDailyProgress', () => {
    it('saves progress keyed by email and dailyNumber', () => {
      saveDailyProgress(testProgress, testEmail);

      const expectedKey = `${DAILY_PROGRESS_KEY}_${testEmail}_100`;
      expect(localStorage.setItem).toHaveBeenCalledWith(expectedKey, expect.any(String));
    });

    it('includes savedAt timestamp', () => {
      saveDailyProgress(testProgress, testEmail);

      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedData.savedAt).toBeDefined();
      expect(savedData.guesses).toEqual(testProgress.guesses);
    });

    it('does nothing when progress is null', () => {
      saveDailyProgress(null, testEmail);

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('does nothing when email is null', () => {
      saveDailyProgress(testProgress, null);

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('does nothing when email is empty string', () => {
      saveDailyProgress(testProgress, '');

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getDailyProgress', () => {
    it('retrieves saved progress', () => {
      const key = `${DAILY_PROGRESS_KEY}_${testEmail}_100`;
      const savedProgress = { ...testProgress, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(savedProgress));

      const result = getDailyProgress(100, testEmail);

      expect(result).toEqual(savedProgress);
    });

    it('returns null when no progress exists', () => {
      const result = getDailyProgress(100, testEmail);

      expect(result).toBeNull();
    });

    it('returns null when email is null', () => {
      const result = getDailyProgress(100, null);

      expect(result).toBeNull();
    });
  });

  describe('clearDailyProgress', () => {
    it('removes progress for specific daily', () => {
      const key = `${DAILY_PROGRESS_KEY}_${testEmail}_100`;
      localStorage.setItem(key, JSON.stringify(testProgress));

      clearDailyProgress(100, testEmail);

      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('does nothing when email is null', () => {
      clearDailyProgress(100, null);

      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('email separation', () => {
    it('keeps progress separate per user', () => {
      const email1 = 'user1@test.com';
      const email2 = 'user2@test.com';
      const progress1 = { ...testProgress, guesses: ['FIRST'] };
      const progress2 = { ...testProgress, guesses: ['SECOND'] };

      saveDailyProgress(progress1, email1);
      saveDailyProgress(progress2, email2);

      const key1 = `${DAILY_PROGRESS_KEY}_${email1}_100`;
      const key2 = `${DAILY_PROGRESS_KEY}_${email2}_100`;

      localStorage.setItem(key1, JSON.stringify({ ...progress1, savedAt: Date.now() }));
      localStorage.setItem(key2, JSON.stringify({ ...progress2, savedAt: Date.now() }));

      const result1 = getDailyProgress(100, email1);
      const result2 = getDailyProgress(100, email2);

      expect(result1.guesses).toEqual(['FIRST']);
      expect(result2.guesses).toEqual(['SECOND']);
    });
  });
});

describe('Constants', () => {
  it('SESSION_STORAGE_KEY is correct', () => {
    expect(SESSION_STORAGE_KEY).toBe('wordle_session');
  });

  it('SESSION_MAX_AGE_MS is 2 minutes', () => {
    expect(SESSION_MAX_AGE_MS).toBe(120000);
  });

  it('DAILY_PROGRESS_KEY is correct', () => {
    expect(DAILY_PROGRESS_KEY).toBe('wordle_daily_progress');
  });
});
