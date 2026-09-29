import { GameAction, SyncState, Grid, WinPattern, GameMode } from '../../src/types.js';
import { WIN_PATTERNS_CONFIG, generateSeed, validateGrid, deriveMarkedCells } from '../../src/utils/index.js';
import { GameActionSchema } from '../../src/utils/validation.js';
import { Redis } from '@upstash/redis';
import { ApiHandler } from '../types.js';
import crypto from 'crypto';

const handlePlayerReady = (state: SyncState, playerId: string, grid?: Grid): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return state;
  }

  if (grid) {
    const validation = validateGrid(grid);
    if (!validation.valid) {
      console.error('Invalid grid submitted:', validation.error);
      return state;
    }

    if (!state.boards) {
      state.boards = {};
    }
    state.boards[playerId] = grid;
  }

  const players = state.players.map(p => p.id === playerId ? { ...p, isReady: true } : p);
  const allReady = players.length === 2 && players.every(p => p.isReady);

  if (allReady) {
    const startingPlayerIndex = crypto.randomInt(0, 2);
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
  if (!player) {
    return state;
  }

  if (!player.isReady) {
    return state;
  }

  if (state.gameStatus === 'playing' && state.currentTurnId !== playerId) {
    return state;
  }

  if (state.gameStatus !== 'playing' && state.gameStatus !== 'starting') {
    return state;
  }

  if (!Number.isInteger(number) || number < 1 || number > 25) {
    return state;
  }

  if (state.calledNumbers.includes(number)) {
    return state;
  }

  const nextTurnPlayer = state.players.find(p => p.id !== playerId);
  if (!nextTurnPlayer) {
    return state;
  }

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
  if (!player) {
    return state;
  }

  if (state.gameStatus !== 'playing') return state;

  if (!state.boards || !state.boards[playerId]) {
    console.error('No board found for player:', playerId);
    return state;
  }

  const markedNumbers = new Set(state.calledNumbers);
  const serverGrid = deriveMarkedCells(state.boards[playerId], markedNumbers);

  const { achieved, patterns } = checkWin(serverGrid);
  if (!achieved) {
    return state;
  }

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
  } else {
    return {
      ...state,
      players,
      gameStatus: 'roundOver',
      roundWinnerId: playerId,
      lastAchievedPatterns: patterns,
      version: state.version + 1,
    };
  }
};

const handleNextRound = (state: SyncState, playerId: string): SyncState => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return state;
  }

  if (state.gameStatus !== 'roundOver') return state;

  if (!state.roundWinnerId) {
    return state;
  }

  const newRound = state.round + 1;
  const players = state.players.map(p => ({...p, isReady: false}));

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

const checkWin = (grid: Grid): { achieved: boolean; patterns: string[] } => {
  const patterns: string[] = [];
  const linePatterns = [WinPattern.ROW_0, WinPattern.ROW_1, WinPattern.ROW_2, WinPattern.ROW_3, WinPattern.ROW_4,
    WinPattern.COL_0, WinPattern.COL_1, WinPattern.COL_2, WinPattern.COL_3, WinPattern.COL_4,
    WinPattern.DIAG_1, WinPattern.DIAG_2];
  linePatterns.forEach(key => {
    if (WIN_PATTERNS_CONFIG[key].check(grid)) {
      patterns.push(WIN_PATTERNS_CONFIG[key].name);
    }
  });
  return { achieved: patterns.length >= 5, patterns };
};

export const handler: ApiHandler = async (req, res) => {
  try {
    console.log('Game action request:', { method: req.method, query: req.query });

    const { gameCode } = req.query;

    if (!gameCode || typeof gameCode !== 'string') {
      return res.status(400).json({ error: 'Invalid game code' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Redis environment variables not set');
      return res.status(500).json({ error: 'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel settings.' });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const gameData = await redis.get(`game:${gameCode}`);
    if (!gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game: SyncState = typeof gameData === "string" ? JSON.parse(gameData) : gameData;

    if (!game.version) {
      game.version = 1;
    }

    if (req.method === 'GET') {
      console.log('Returning game state for:', gameCode);
      return res.status(200).json(game);
    }

    if (req.method === 'POST') {
      const validationResult = GameActionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Invalid action', details: validationResult.error.issues });
      }

      const action = validationResult.data;

      console.log('Processing action:', action.type, 'for game:', gameCode, 'playerId:', action.payload.playerId);

      let newState = { ...game };

      switch (action.type) {
        case 'PLAYER_READY':
          newState = handlePlayerReady(newState, action.payload.playerId, action.payload.grid);
          break;
        case 'REVEAL_NUMBER':
          newState = handleRevealNumber(newState, action.payload.playerId, action.payload.number);
          break;
        case 'DECLARE_BINGO':
          newState = handleDeclareBingo(newState, action.payload.playerId);
          break;
        case 'NEXT_ROUND':
          newState = handleNextRound(newState, action.payload.playerId);
          break;

        default:
          return res.status(400).json({ error: 'Unknown action type' });
      }

      if (newState.version === game.version) {
        return res.status(400).json({ error: 'No changes made' });
      }

      await redis.set(`game:${gameCode}`, JSON.stringify(newState), { ex: 7200 });
      console.log('Game state updated for action:', action.type);
      return res.status(200).json(newState);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in game/[gameCode] handler:', error);
    res.status(500).json({ error: error?.message ? `Database connection error: ${error.message}` : 'Internal server error' });
  }
};

export default handler;
