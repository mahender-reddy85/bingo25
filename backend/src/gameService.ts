import { SyncState, Player, GameMode, GameAction, Grid, WinPattern, ChatMessage } from './types';
import { WIN_PATTERNS_CONFIG } from './constants';

class GameService {
  private games = new Map<string, SyncState>();

  // --- Public API ---

  public getGame(gameCode: string): SyncState | null {
      return this.games.get(gameCode) || null;
  }

  public createGame(gameCode: string, gameMode: GameMode, host: Player) {
    const initialSeed = this.generateSeed(gameCode);
    const numberSequence = this.generateNumberSequence(gameCode);
    const hostWithStatus = { ...host, isConnected: true, isReady: false, score: 0 };

    const newState: SyncState = {
      gameCode,
      players: [hostWithStatus],
      numberSequence,
      calledNumberIndex: -1,
      gameStatus: 'waiting',
      round: 1,
      roundSeed: initialSeed,
      currentTurnId: host.id,
      gameMode,
      chatHistory: [{ senderId: 'system', senderName: 'System', message: `${host.name} created the game.`, isSystem: true }],
    };
    this.games.set(gameCode, newState);
  }

  public joinGame(gameCode: string, player: Player) {
    const game = this.games.get(gameCode);
    if (!game) return;

    // Check if player is rejoining
    const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);
    if(existingPlayerIndex !== -1) {
        // Reconnecting
        const newState = { ...game };
        newState.players[existingPlayerIndex].isConnected = true;
        newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has reconnected.`, isSystem: true });
        this.games.set(gameCode, newState);
        return;
    }

    if (game.players.length >= 2) return;

    const playerWithStatus = { ...player, isConnected: true, isReady: false, score: 0 };
    const newState = { ...game, players: [...game.players, playerWithStatus] };
    newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has joined.`, isSystem: true });
    this.games.set(gameCode, newState);
  }
  
  public leaveGame(gameCode: string, playerId: string) {
      const game = this.games.get(gameCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player) return;

      const newState = {
          ...game, 
          players: game.players.map(p => p.id === playerId ? {...p, isConnected: false} : p)
      };

      newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has disconnected.`, isSystem: true });
      
      const allDisconnected = newState.players.every(p => !p.isConnected);
      if (allDisconnected) {
          // Clean up game if everyone is gone
          setTimeout(() => this.games.delete(gameCode), 5000); 
      } else {
          this.games.set(gameCode, newState);
      }
  }

  public sendAction(gameCode: string, action: GameAction) {
    const game = this.games.get(gameCode);
    if (!game) return;

    let newState = { ...game };

    switch (action.type) {
      case 'PLAYER_READY':
        newState = this.handlePlayerReady(newState, action.payload.playerId);
        break;
      case 'CALL_NUMBER':
        newState = this.handleCallNumber(newState, action.payload.playerId);
        break;
      case 'DECLARE_BINGO':
        newState = this.handleDeclareBingo(newState, action.payload.playerId, action.payload.grid);
        break;
      case 'NEXT_ROUND':
        newState = this.handleNextRound(newState, action.payload.playerId);
        break;
      case 'SEND_MESSAGE':
        newState = this.handleSendMessage(newState, action.payload.playerId, action.payload.message);
        break;
    }

    this.games.set(gameCode, newState);
  }

  // --- "Server" Logic ---
  
  private generateSeed(gameCode: string, round = 1) {
      let hash = 0;
      const str = `${gameCode}-${round}`;
      for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash |= 0;
      }
      return hash;
  }
  
  private generateNumberSequence(gameCode: string) {
      const seed = this.generateSeed(gameCode, 0); // Use a base seed for the sequence
      const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
      return this.seededShuffle(numbers, seed);
  }

  private seededShuffle<T>(array: T[], seed: number): T[] {
    const newArray = [...array];
    const random = this.createSeededRandom(seed);
    let currentIndex = newArray.length;
    let randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  }

  private createSeededRandom(seed: number) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  private handleSendMessage(state: SyncState, playerId: string, message: string): SyncState {
    const sender = state.players.find(p => p.id === playerId);
    if (!sender || !message.trim()) {
        return state;
    }

    const newMessage: ChatMessage = {
        senderId: playerId,
        senderName: sender.name,
        message: message.trim(),
    };
    
    return {
        ...state,
        chatHistory: [...state.chatHistory, newMessage]
    };
  }

  private handlePlayerReady(state: SyncState, playerId: string): SyncState {
    const players = state.players.map(p => p.id === playerId ? { ...p, isReady: true } : p);
    const allReady = players.length === 2 && players.every(p => p.isReady);
    
    return {
      ...state,
      players,
      gameStatus: allReady ? 'starting' : 'waiting',
      currentTurnId: allReady ? (Math.random() > 0.5 ? players[0].id : players[1].id) : state.currentTurnId
    };
  }

  private handleCallNumber(state: SyncState, playerId: string): SyncState {
    // If it's not the player's turn (and not the very first call), do nothing.
    if (state.gameStatus === 'playing' && state.currentTurnId !== playerId) {
      return state;
    }

    // If game hasn't started or is over, do nothing.
    if (state.gameStatus !== 'playing' && state.gameStatus !== 'starting') {
        return state;
    }

    // If no more numbers, do nothing.
    if (state.calledNumberIndex >= state.numberSequence.length - 1) {
        return state;
    }

    const nextTurnPlayer = state.players.find(p => p.id !== playerId);
    
    return {
      ...state,
      gameStatus: 'playing', // Ensure status is 'playing'
      calledNumberIndex: state.calledNumberIndex + 1,
      currentTurnId: nextTurnPlayer?.id,
    };
  }

  private handleDeclareBingo(state: SyncState, playerId: string, grid: Grid): SyncState {
    if (state.gameStatus !== 'playing') return state;

    const { achieved, patterns } = this.checkWin(grid);
    if (!achieved) {
        // In a real app, maybe penalize the player. Here, we just ignore.
        console.log(`Player ${playerId} called BINGO but had no winning pattern.`);
        return state;
    }
    
    const winner = state.players.find(p => p.id === playerId);
    if (!winner) return state;

    const newScore = winner.score + 1;
    const players = state.players.map(p => p.id === playerId ? { ...p, score: newScore } : p);
    
    const winsNeeded = state.gameMode === GameMode.BestOf3 ? 2 : (state.gameMode === GameMode.BestOf5 ? 3 : 1);
    
    if (newScore >= winsNeeded) {
        // Game Over
        return {
            ...state,
            players,
            gameStatus: 'gameOver',
            gameWinnerId: playerId,
            lastAchievedPatterns: patterns,
        };
    } else {
        // Round Over
        return {
            ...state,
            players,
            gameStatus: 'roundOver',
            roundWinnerId: playerId,
            lastAchievedPatterns: patterns,
        };
    }
  }

  private handleNextRound(state: SyncState, playerId: string): SyncState {
    if (state.gameStatus !== 'roundOver') return state;

    const newRound = state.round + 1;
    const players = state.players.map(p => ({...p, isReady: false}));
    
    return {
        ...state,
        players,
        calledNumberIndex: -1,
        gameStatus: 'waiting',
        round: newRound,
        roundSeed: this.generateSeed(state.gameCode, newRound),
        roundWinnerId: undefined,
        lastAchievedPatterns: [],
        currentTurnId: state.roundWinnerId, // Winner of last round starts next
    }
  }

  private checkWin(grid: Grid): { achieved: boolean; patterns: string[] } {
    const patterns: string[] = [];
    (Object.keys(WIN_PATTERNS_CONFIG) as WinPattern[]).forEach(key => {
        if (WIN_PATTERNS_CONFIG[key].check(grid)) {
            patterns.push(WIN_PATTERNS_CONFIG[key].name);
        }
    });
    return { achieved: patterns.length > 0, patterns };
  }
}

export const gameService = new GameService();
