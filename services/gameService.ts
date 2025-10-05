import { SyncState, Player, GameMode, GameAction } from '../types';

type Listener = (data: SyncState) => void;

class GameService {
  private baseUrl = '/api';
  private listeners: { [gameCode: string]: Listener[] } = {};
  private pollingIntervals: { [gameCode: string]: NodeJS.Timeout } = {};

  async createGame(gameCode: string, gameMode: GameMode, player: Player): Promise<SyncState> {
    const response = await fetch(`${this.baseUrl}/create-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, gameMode, player }),
    });
    if (!response.ok) {
      throw new Error('Failed to create game');
    }
    return response.json();
  }

  async joinGame(gameCode: string, player: Player): Promise<SyncState> {
    const response = await fetch(`${this.baseUrl}/join-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, player }),
    });
    if (!response.ok) {
      throw new Error('Failed to join game');
    }
    return response.json();
  }

  async getGame(gameCode: string): Promise<SyncState | null> {
    try {
      const response = await fetch(`${this.baseUrl}/game/${gameCode}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch {
      return null;
    }
  }

  async sendAction(gameCode: string, action: GameAction): Promise<SyncState> {
    const response = await fetch(`${this.baseUrl}/game/${gameCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!response.ok) {
      throw new Error('Failed to send action');
    }
    return response.json();
  }

  onUpdate(gameCode: string, listener: Listener) {
    if (!this.listeners[gameCode]) {
      this.listeners[gameCode] = [];
    }
    this.listeners[gameCode].push(listener);
  }

  offUpdate(gameCode: string, listener: Listener) {
    if (!this.listeners[gameCode]) return;
    this.listeners[gameCode] = this.listeners[gameCode].filter(l => l !== listener);
  }

  startPolling(gameCode: string) {
    if (this.pollingIntervals[gameCode]) return; // Already polling

    this.pollingIntervals[gameCode] = setInterval(async () => {
      const game = await this.getGame(gameCode);
      if (game && this.listeners[gameCode]) {
        this.listeners[gameCode].forEach(listener => listener(game));
      }
    }, 1000); // Poll every 1 second
  }

  stopPolling(gameCode: string) {
    if (this.pollingIntervals[gameCode]) {
      clearInterval(this.pollingIntervals[gameCode]);
      delete this.pollingIntervals[gameCode];
    }
  }

  leaveGame(gameCode: string, playerId: string) {
    // For now, just stop polling. In a real implementation, you might notify the backend.
    this.stopPolling(gameCode);
  }
}

export const gameService = new GameService();
