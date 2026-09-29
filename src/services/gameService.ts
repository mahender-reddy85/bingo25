import { Peer, DataConnection } from 'peerjs';
import { SyncState, Player, GameMode, GameAction, Grid, WinPattern } from '../types.js';
import { WIN_PATTERNS_CONFIG, generateSeed, validateGrid, deriveMarkedCells } from '../utils/index.js';

type Listener = (data: SyncState) => void;

const generateGameCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const checkWin = (grid: Grid): { achieved: boolean; patterns: string[] } => {
  const patterns: string[] = [];
  const linePatterns = [
    WinPattern.ROW_0, WinPattern.ROW_1, WinPattern.ROW_2, WinPattern.ROW_3, WinPattern.ROW_4,
    WinPattern.COL_0, WinPattern.COL_1, WinPattern.COL_2, WinPattern.COL_3, WinPattern.COL_4,
    WinPattern.DIAG_1, WinPattern.DIAG_2
  ];
  linePatterns.forEach(key => {
    if (WIN_PATTERNS_CONFIG[key].check(grid)) {
      patterns.push(WIN_PATTERNS_CONFIG[key].name);
    }
  });
  return { achieved: patterns.length >= 5, patterns };
};

const handlePlayerReady = (state: SyncState, playerId: string, grid?: Grid): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return state;

  if (grid) {
    const validation = validateGrid(grid);
    if (!validation.valid) return state;
    if (!state.boards) state.boards = {};
    state.boards[playerId] = grid;
  }

  const players = state.players.map(p => p.id === playerId ? { ...p, isReady: true } : p);
  const allReady = players.length === 2 && players.every(p => p.isReady);

  if (allReady) {
    const startingPlayerIndex = Math.floor(Math.random() * 2);
    return {
      ...state,
      players,
      gameStatus: 'starting',
      currentTurnId: players[startingPlayerIndex].id,
      version: state.version + 1,
    };
  }

  return {
    ...state,
    players,
    version: state.version + 1,
  };
};

const handleRevealNumber = (state: SyncState, playerId: string, number: number): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isReady) return state;
  if (state.gameStatus === 'playing' && state.currentTurnId !== playerId) return state;
  if (state.gameStatus !== 'playing' && state.gameStatus !== 'starting') return state;
  if (!Number.isInteger(number) || number < 1 || number > 25) return state;
  if (state.calledNumbers.includes(number)) return state;

  const nextTurnPlayer = state.players.find(p => p.id !== playerId);
  if (!nextTurnPlayer) return state;

  return {
    ...state,
    calledNumbers: [...state.calledNumbers, number],
    calledBy: { ...state.calledBy, [number]: playerId },
    gameStatus: 'playing',
    currentTurnId: nextTurnPlayer.id,
    version: state.version + 1,
  };
};

const handleDeclareBingo = (state: SyncState, playerId: string): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.gameStatus !== 'playing') return state;
  if (!state.boards || !state.boards[playerId]) return state;

  const markedNumbers = new Set(state.calledNumbers);
  const serverGrid = deriveMarkedCells(state.boards[playerId], markedNumbers);
  const { achieved, patterns } = checkWin(serverGrid);
  if (!achieved) return state;

  const newScore = player.score + 1;
  const players = state.players.map(p => p.id === playerId ? { ...p, score: newScore } : p);
  const winsNeeded = state.gameMode === GameMode.BestOf3 ? 2 : (state.gameMode === GameMode.BestOf5 ? 3 : 1);

  if (newScore >= winsNeeded) {
    return {
      ...state,
      players,
      gameStatus: 'gameOver',
      gameWinnerId: playerId,
      lastAchievedPatterns: patterns,
      version: state.version + 1,
    };
  }

  return {
    ...state,
    players,
    gameStatus: 'roundOver',
    roundWinnerId: playerId,
    lastAchievedPatterns: patterns,
    version: state.version + 1,
  };
};

const handleNextRound = (state: SyncState, playerId: string): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.gameStatus !== 'roundOver' || !state.roundWinnerId) return state;

  const newRound = state.round + 1;
  const players = state.players.map(p => ({ ...p, isReady: false }));

  return {
    ...state,
    players,
    calledNumbers: [],
    calledBy: {},
    gameStatus: 'waiting',
    round: newRound,
    roundSeed: generateSeed(state.gameCode, newRound),
    roundWinnerId: undefined,
    lastAchievedPatterns: [],
    currentTurnId: state.roundWinnerId,
    version: state.version + 1,
  };
};

const processAction = (state: SyncState, action: GameAction): SyncState => {
  switch (action.type) {
    case 'PLAYER_READY':
      return handlePlayerReady(state, action.payload.playerId, action.payload.grid);
    case 'REVEAL_NUMBER':
      return handleRevealNumber(state, action.payload.playerId, action.payload.number);
    case 'DECLARE_BINGO':
      return handleDeclareBingo(state, action.payload.playerId);
    case 'NEXT_ROUND':
      return handleNextRound(state, action.payload.playerId);
    default:
      return state;
  }
};

class GameService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private isHost: boolean = false;
  private currentState: SyncState | null = null;
  private listeners: { [gameCode: string]: Listener[] } = {};
  private myPlayerId: string = '';

  private initPeer(peerId?: string): Promise<Peer> {
    return new Promise((resolve, reject) => {
      const peer = peerId ? new Peer(peerId) : new Peer();
      this.peer = peer;

      peer.on('open', () => {
        resolve(peer);
      });

      peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  private broadcastState() {
    if (!this.currentState) return;
    if (this.connection && this.connection.open) {
      this.connection.send({ type: 'SYNC_STATE', state: this.currentState });
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    if (!this.currentState) return;
    const list = this.listeners[this.currentState.gameCode];
    if (list) {
      list.forEach(listener => listener(this.currentState!));
    }
  }

  private applyAction(action: GameAction) {
    if (!this.currentState || !this.isHost) return;
    const newState = processAction(this.currentState, action);
    this.currentState = newState;
    this.broadcastState();
  }

  async createGame(_code: string, gameMode: GameMode, player: Player): Promise<SyncState> {
    this.cleanup();
    const gameCode = generateGameCode();
    this.myPlayerId = player.id;
    this.isHost = true;

    const initialSeed = generateSeed(gameCode, 1);
    const hostPlayer: Player = { ...player, isConnected: true };
    this.currentState = {
      gameCode,
      players: [hostPlayer],
      calledNumbers: [],
      calledBy: {},
      gameStatus: 'waiting',
      round: 1,
      roundSeed: initialSeed,
      currentTurnId: player.id,
      gameMode,
      version: 1,
    };

    const peerId = `bingo25-${gameCode.toLowerCase()}`;
    await this.initPeer(peerId);

    this.peer!.on('connection', (conn) => {
      this.connection = conn;

      conn.on('open', () => {
        conn.send({ type: 'SYNC_STATE', state: this.currentState });
      });

      conn.on('data', (data: any) => {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'JOIN' && data.player) {
          const joiningPlayer: Player = { ...data.player, isConnected: true };
          const existingIdx = this.currentState!.players.findIndex(p => p.id === joiningPlayer.id);
          if (existingIdx !== -1) {
            this.currentState!.players[existingIdx].isConnected = true;
          } else if (this.currentState!.players.length < 2) {
            this.currentState!.players.push(joiningPlayer);
          }
          this.currentState!.version += 1;
          this.broadcastState();
        } else if (data.type === 'ACTION' && data.action) {
          this.applyAction(data.action);
        }
      });

      conn.on('close', () => {
        if (this.currentState) {
          this.currentState.players = this.currentState.players.map(p =>
            p.id !== this.myPlayerId ? { ...p, isConnected: false } : p
          );
          this.currentState.version += 1;
          this.notifyListeners();
        }
      });
    });

    return this.currentState;
  }

  updatePlayerName(playerId: string, name: string) {
    if (this.currentState && this.isHost) {
      const p = this.currentState.players.find(x => x.id === playerId);
      if (p) {
        p.name = name;
        this.broadcastState();
      }
    }
  }

  async joinGame(gameCode: string, player: Player): Promise<SyncState> {
    this.cleanup();
    this.myPlayerId = player.id;
    this.isHost = false;

    await this.initPeer();

    const targetPeerId = `bingo25-${gameCode.toLowerCase()}`;
    return new Promise<SyncState>((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Connection timed out. Please verify the game code and ensure the host is online.'));
        }
      }, 15000);

      const conn = this.peer!.connect(targetPeerId, { reliable: true });
      this.connection = conn;

      conn.on('open', () => {
        conn.send({ type: 'JOIN', player });
      });

      conn.on('data', (data: any) => {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'SYNC_STATE' && data.state) {
          this.currentState = data.state;
          this.notifyListeners();
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(data.state);
          }
        }
      });

      conn.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`P2P connection error: ${err.message || 'Host unreachable'}`));
        }
      });

      this.peer!.on('error', (err: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (err.type === 'peer-unavailable') {
            reject(new Error(`Game '${gameCode.toUpperCase()}' not found. Make sure the host has created the game.`));
          } else {
            reject(new Error(`Peer error: ${err.message || err.type}`));
          }
        }
      });
    });
  }

  async getGame(gameCode: string): Promise<SyncState | null> {
    if (this.currentState && this.currentState.gameCode.toUpperCase() === gameCode.toUpperCase()) {
      return this.currentState;
    }
    return null;
  }

  async sendAction(gameCode: string, action: GameAction): Promise<SyncState> {
    if (this.isHost) {
      this.applyAction(action);
      return this.currentState!;
    } else {
      if (this.connection && this.connection.open) {
        this.connection.send({ type: 'ACTION', action });
      }
      return this.currentState!;
    }
  }

  onUpdate(gameCode: string, listener: Listener) {
    if (!this.listeners[gameCode]) {
      this.listeners[gameCode] = [];
    }
    this.listeners[gameCode].push(listener);
    if (this.currentState && this.currentState.gameCode.toUpperCase() === gameCode.toUpperCase()) {
      listener(this.currentState);
    }
  }

  offUpdate(gameCode: string, listener: Listener) {
    if (!this.listeners[gameCode]) return;
    this.listeners[gameCode] = this.listeners[gameCode].filter(l => l !== listener);
  }

  startPolling(gameCode: string) {
    if (this.currentState && this.currentState.gameCode.toUpperCase() === gameCode.toUpperCase()) {
      this.notifyListeners();
    }
  }

  stopPolling(_gameCode: string) {}

  leaveGame(_gameCode: string, _playerId: string) {
    this.cleanup();
  }

  cleanup() {
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.currentState = null;
    this.isHost = false;
  }
}

export const gameService = new GameService();
