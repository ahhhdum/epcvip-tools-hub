/**
 * Wordle Lobby Manager
 *
 * Handles public room listing and lobby subscriptions.
 * Extracted from WordleRoomManager for modularity.
 */

import { WebSocket } from 'ws';
import { WordleRoom, GameMode, WordMode, PublicRoomInfo } from './wordle-room-types';
import { MAX_PLAYERS_PER_ROOM } from '../constants/wordle-constants';

/**
 * Manages lobby subscriptions and public room listings
 */
export class WordleLobbyManager {
  constructor(
    private rooms: Map<string, WordleRoom>,
    private lobbySubscribers: Set<WebSocket>
  ) {}

  /**
   * Subscribe a socket to lobby updates (public room list)
   */
  subscribeLobby(socket: WebSocket): void {
    this.lobbySubscribers.add(socket);
    // Send current list immediately
    this.sendPublicRoomsList(socket);
    console.log(`[Wordle] Lobby subscriber added (total: ${this.lobbySubscribers.size})`);
  }

  /**
   * Unsubscribe a socket from lobby updates
   */
  unsubscribeLobby(socket: WebSocket): void {
    this.lobbySubscribers.delete(socket);
    console.log(`[Wordle] Lobby subscriber removed (total: ${this.lobbySubscribers.size})`);
  }

  /**
   * Get list of joinable public rooms
   */
  getPublicRooms(): PublicRoomInfo[] {
    const publicRooms: PublicRoomInfo[] = [];

    for (const room of this.rooms.values()) {
      // Only show public rooms that are waiting and not full
      if (
        room.isPublic &&
        room.gameState === 'waiting' &&
        !room.isSolo &&
        room.players.size < MAX_PLAYERS_PER_ROOM
      ) {
        const creator = room.players.get(room.creatorId);
        publicRooms.push({
          code: room.code,
          creatorName: creator?.name || 'Unknown',
          playerCount: room.players.size,
          maxPlayers: MAX_PLAYERS_PER_ROOM,
          gameMode: room.gameMode,
          wordMode: room.wordMode,
          isDailyChallenge: room.isDailyChallenge,
          dailyNumber: room.dailyNumber,
        });
      }
    }

    return publicRooms;
  }

  /**
   * Send public rooms list to a single socket
   */
  sendPublicRoomsList(socket: WebSocket): void {
    if (socket.readyState !== WebSocket.OPEN) return;

    const rooms = this.getPublicRooms();
    socket.send(JSON.stringify({ type: 'publicRoomsList', rooms }));
  }

  /**
   * Broadcast public rooms list to all lobby subscribers
   */
  broadcastPublicRoomsList(): void {
    if (this.lobbySubscribers.size === 0) return;

    const rooms = this.getPublicRooms();
    const data = JSON.stringify({ type: 'publicRoomsList', rooms });

    for (const socket of this.lobbySubscribers) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        // Clean up closed sockets
        this.lobbySubscribers.delete(socket);
      }
    }
  }
}
