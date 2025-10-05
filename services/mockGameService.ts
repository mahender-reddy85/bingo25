import { SyncState, Player, GameMode, GameAction } from '../types';

type Listener = (data: SyncState) => void;

class EventEmitter {
  private events: { [key: string]: Listener[] } = {};

  on(eventName: string, listener: Listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  off(eventName: string, listener: Listener) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(l => l !== listener);
  }

  emit(eventName: string, data: SyncState) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(listener => listener(data));
  }
}

class GameService {
  private emitter = new EventEmitter();
  private pollingIntervals: Map<string, number> = new Map();

  private getGameUpdateEventName(gameCode: string) {
    return `game-update-${gameCode}`;
  }

  private async apiRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const response = await fetch(`/api/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
  }

  // --- Public API ---

  public onUpdate(gameCode: string, listener: Listener) {
    this.emitter.on(this.getGameUpdateEventName(gameCode), listener);
  }

  public offUpdate(gameCode: string, listener: Listener) {
    this.emitter.off(this.getGameUpdateEventName(gameCode), listener);
  }

  public async getGame(gameCode: string): Promise<SyncState | null> {
    try {
      return await this.apiRequest(`game/${gameCode}`);
    } catch (error) {
      console.error('Failed to get game:', error);
      return null;
    }
  }

  public async createGame(gameCode: string, gameMode: GameMode, host: Player): Promise<SyncState> {
    const response = await this.apiRequest('create-game', {
      method: 'POST',
      body: JSON.stringify({ gameCode, gameMode, player: host }),
    });
    return response;
  }

  public async joinGame(gameCode: string, player: Player): Promise<SyncState> {
    const response = await this.apiRequest('join-game', {
      method: 'POST',
      body: JSON.stringify({ gameCode, player }),
    });
    return response;
  }

  public leaveGame(gameCode: string, playerId: string) {
    // Stop polling for this game
    const interval = this.pollingIntervals.get(gameCode);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(gameCode);
    }
  }

  public async sendAction(gameCode: string, action: GameAction): Promise<SyncState> {
    const response = await this.apiRequest(`game/${gameCode}`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
    return response;
  }

  public startPolling(gameCode: string) {
    if (this.pollingIntervals.has(gameCode)) return;

    const poll = async () => {
      try {
        const gameState = await this.getGame(gameCode);
        if (gameState) {
          this.emitter.emit(this.getGameUpdateEventName(gameCode), gameState);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 1 second
    const interval = setInterval(poll, 1000);
    this.pollingIntervals.set(gameCode, interval);

    // Initial poll
    poll();
  }

  public stopPolling(gameCode: string) {
    const interval = this.pollingIntervals.get(gameCode);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(gameCode);
    }
  }
}

export const gameService = new GameService();
