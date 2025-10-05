import { io, Socket } from 'socket.io-client';
import { SyncState, Player, GameMode, GameAction } from '../types';

type Listener = (data: SyncState) => void;

class RealGameService {
  private socket: Socket;
  private listeners = new Map<string, Listener[]>();
  private apiUrl = 'http://localhost:4000';

  constructor() {
    this.socket = io(this.apiUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('game-update', (gameState: SyncState) => {
      const gameListeners = this.listeners.get(gameState.gameCode);
      if (gameListeners) {
        gameListeners.forEach(listener => listener(gameState));
      }
    });
  }

  // --- Public API ---

  public async getGame(gameCode: string): Promise<SyncState | null> {
    try {
      const response = await fetch(`${this.apiUrl}/game/${gameCode}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching game:', error);
      return null;
    }
  }

  public async createGame(gameCode: string, gameMode: GameMode, host: Player): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, gameMode, host })
      });
      return response.ok;
    } catch (error) {
      console.error('Error creating game:', error);
      return false;
    }
  }

  public async joinGame(gameCode: string, player: Player): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, player })
      });
      return response.ok;
    } catch (error) {
      console.error('Error joining game:', error);
      return false;
    }
  }

  public async leaveGame(gameCode: string, playerId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/game/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId })
      });
      return response.ok;
    } catch (error) {
      console.error('Error leaving game:', error);
      return false;
    }
  }

  public onUpdate(gameCode: string, listener: Listener) {
    if (!this.listeners.has(gameCode)) {
      this.listeners.set(gameCode, []);
    }
    this.listeners.get(gameCode)!.push(listener);
    this.socket.emit('subscribe', gameCode);
  }

  public offUpdate(gameCode: string, listener: Listener) {
    const gameListeners = this.listeners.get(gameCode);
    if (gameListeners) {
      const index = gameListeners.indexOf(listener);
      if (index > -1) {
        gameListeners.splice(index, 1);
      }
      if (gameListeners.length === 0) {
        this.listeners.delete(gameCode);
        this.socket.emit('unsubscribe', gameCode);
      }
    }
  }

  public sendAction(gameCode: string, action: GameAction) {
    this.socket.emit('game-action', { gameCode, action });
  }
}

export const gameService = new RealGameService();
