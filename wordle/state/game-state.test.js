/**
 * Tests for Wordle Game State Module
 *
 * Run from server/: npm test -- --testPathPattern=game-state
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameState } from './game-state.js';

describe('GameState', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  describe('allPlayersReady computed property', () => {
    it('returns false when no players in room', () => {
      state.playersInRoom = [];
      expect(state.allPlayersReady).toBe(false);
    });

    it('returns false when some players not ready', () => {
      state.playersInRoom = [
        { id: '1', name: 'Alice', isReady: true },
        { id: '2', name: 'Bob', isReady: false },
      ];
      expect(state.allPlayersReady).toBe(false);
    });

    it('returns true when all players ready', () => {
      state.playersInRoom = [
        { id: '1', name: 'Alice', isReady: true },
        { id: '2', name: 'Bob', isReady: true },
      ];
      expect(state.allPlayersReady).toBe(true);
    });

    it('recomputes when player ready status changes', () => {
      state.playersInRoom = [
        { id: '1', name: 'Alice', isReady: true },
        { id: '2', name: 'Bob', isReady: false },
      ];
      expect(state.allPlayersReady).toBe(false);

      // Simulate player becoming ready
      state.setPlayerReady('2', true);
      expect(state.allPlayersReady).toBe(true);
    });
  });

  describe('isInRoom computed property', () => {
    it('returns false when roomCode is null', () => {
      state.roomCode = null;
      expect(state.isInRoom).toBe(false);
    });

    it('returns true when roomCode is set', () => {
      state.roomCode = 'ABC123';
      expect(state.isInRoom).toBe(true);
    });
  });

  describe('canGuess computed property', () => {
    it('returns false when not playing', () => {
      state.gamePhase = 'waiting';
      state.guesses = [];
      expect(state.canGuess).toBe(false);
    });

    it('returns false when max guesses reached', () => {
      state.gamePhase = 'playing';
      state.guesses = ['A', 'B', 'C', 'D', 'E', 'F'];
      expect(state.canGuess).toBe(false);
    });

    it('returns true when playing and guesses available', () => {
      state.gamePhase = 'playing';
      state.guesses = ['A', 'B'];
      expect(state.canGuess).toBe(true);
    });
  });

  describe('resetRoom', () => {
    it('clears all room state', () => {
      // Set up state
      state.roomCode = 'ABC123';
      state.playerId = 'player1';
      state.isCreator = true;
      state.playersInRoom = [{ id: '1', name: 'Test' }];
      state.guesses = ['CRANE'];
      state.opponents.set('opp1', { name: 'Opponent' });

      // Reset
      state.resetRoom();

      // Verify
      expect(state.roomCode).toBeNull();
      expect(state.playerId).toBeNull();
      expect(state.isCreator).toBe(false);
      expect(state.playersInRoom).toEqual([]);
      expect(state.guesses).toEqual([]);
      expect(state.opponents.size).toBe(0);
      expect(state.gamePhase).toBe('lobby');
    });

    it('clears opponents Map (fixes ghost opponents bug)', () => {
      state.opponents.set('opp1', { name: 'Ghost' });
      state.opponents.set('opp2', { name: 'Another Ghost' });
      expect(state.opponents.size).toBe(2);

      state.resetRoom();

      expect(state.opponents.size).toBe(0);
    });
  });

  describe('resetGame', () => {
    it('clears game state but not room identity', () => {
      // Set up state
      state.roomCode = 'ABC123';
      state.playerId = 'player1';
      state.currentGuess = 'CRA';
      state.guesses = ['CRANE'];
      state.guessResults = [['correct', 'present', 'absent', 'absent', 'absent']];
      state.opponents.set('opp1', { name: 'Opponent' });

      // Reset
      state.resetGame();

      // Game state cleared
      expect(state.currentGuess).toBe('');
      expect(state.guesses).toEqual([]);
      expect(state.guessResults).toEqual([]);
      expect(state.opponents.size).toBe(0);

      // Room identity preserved
      expect(state.roomCode).toBe('ABC123');
      expect(state.playerId).toBe('player1');
    });
  });

  describe('setPlayerReady', () => {
    it('updates player ready status', () => {
      state.playersInRoom = [
        { id: '1', name: 'Alice', isReady: false },
        { id: '2', name: 'Bob', isReady: false },
      ];

      state.setPlayerReady('1', true);

      expect(state.playersInRoom[0].isReady).toBe(true);
      expect(state.playersInRoom[1].isReady).toBe(false);
    });

    it('handles non-existent player gracefully', () => {
      state.playersInRoom = [{ id: '1', name: 'Alice', isReady: false }];

      // Should not throw
      state.setPlayerReady('nonexistent', true);

      expect(state.playersInRoom[0].isReady).toBe(false);
    });
  });

  describe('addGuessResult', () => {
    it('adds guess and result, clears currentGuess', () => {
      state.currentGuess = 'CRANE';

      state.addGuessResult('CRANE', ['correct', 'present', 'absent', 'absent', 'absent']);

      expect(state.guesses).toEqual(['CRANE']);
      expect(state.guessResults).toHaveLength(1);
      expect(state.currentGuess).toBe('');
    });
  });

  describe('updateOpponent', () => {
    it('creates new opponent entry', () => {
      state.updateOpponent('opp1', { name: 'Alice', isFinished: false });

      expect(state.opponents.get('opp1')).toEqual({ name: 'Alice', isFinished: false });
    });

    it('merges with existing opponent data', () => {
      state.opponents.set('opp1', { name: 'Alice', guessResults: [] });

      state.updateOpponent('opp1', { isFinished: true, won: true });

      expect(state.opponents.get('opp1')).toEqual({
        name: 'Alice',
        guessResults: [],
        isFinished: true,
        won: true,
      });
    });
  });

  describe('setRoomIdentity', () => {
    it('sets room identity fields', () => {
      state.setRoomIdentity('ABC123', 'player1', true);

      expect(state.roomCode).toBe('ABC123');
      expect(state.playerId).toBe('player1');
      expect(state.isCreator).toBe(true);
    });
  });

  describe('currentRowIndex', () => {
    it('returns current guess row', () => {
      expect(state.currentRowIndex).toBe(0);

      state.guesses = ['CRANE'];
      expect(state.currentRowIndex).toBe(1);

      state.guesses = ['CRANE', 'SLATE'];
      expect(state.currentRowIndex).toBe(2);
    });
  });

  describe('resetValidation', () => {
    it('clears validation state', () => {
      state.lastRejectedWord = 'ZZZZZ';
      state.rejectionCount = 2;

      state.resetValidation();

      expect(state.lastRejectedWord).toBeNull();
      expect(state.rejectionCount).toBe(0);
    });
  });
});
