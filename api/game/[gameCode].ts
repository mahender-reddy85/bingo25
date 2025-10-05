import { GameAction, SyncState, Grid, WinPattern, GameMode } from '../../types.js';
import { WIN_PATTERNS_CONFIG } from '../../constants.js';
import { Redis } from '@upstash/redis';
import { generateSeed } from '../../utils.js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Check if Redis is configured
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Redis environment variables not set');
}

const handlePlayerReady = (state: SyncState, playerId: string): SyncState => {
  const players = state.players.map(p => p.id === playerId ? { ...p, isReady: true } : p);
  const allReady = players.length === 2 && players.every(p => p.isReady);

  return {
    ...state,
    players,
    gameStatus: allReady ? 'starting' : 'waiting',
    currentTurnId: allReady ? (Math.random() > 0.5 ? players[0].id : players[1].id) : state.currentTurnId
  };
};

const handleCallNumber = (state: SyncState, playerId: string): SyncState => {
  if (state.gameStatus === 'playing' && state.currentTurnId !== playerId) {
    return state;
  }

  if (state.gameStatus !== 'playing' && state.gameStatus !== 'starting') {
    return state;
  }

  if (state.calledNumberIndex >= state.numberSequence.length - 1) {
    return state;
  }

  const nextTurnPlayer = state.players.find(p => p.id !== playerId);

  return {
    ...state,
    gameStatus: 'playing',
    calledNumberIndex: state.calledNumberIndex + 1,
    currentTurnId: nextTurnPlayer?.id,
  };
};

const handleDeclareBingo = (state: SyncState, playerId: string, grid: Grid): SyncState => {
  if (state.gameStatus !== 'playing') return state;

  const { achieved, patterns } = checkWin(grid);
  if (!achieved) {
    return state;
  }

  const winner = state.players.find(p => p.id === playerId);
  if (!winner) return state;

  const newScore = winner.score + 1;
  const players = state.players.map(p => p.id === playerId ? { ...p, score: newScore } : p);

  const winsNeeded = state.gameMode === GameMode.BestOf3 ? 2 : (state.gameMode === GameMode.BestOf5 ? 3 : 1);

  if (newScore >= winsNeeded) {
    return {
      ...state,
      players,
      gameStatus: 'gameOver',
      gameWinnerId: playerId,
      lastAchievedPatterns: patterns,
    };
  } else {
    return {
      ...state,
      players,
      gameStatus: 'roundOver',
      roundWinnerId: playerId,
      lastAchievedPatterns: patterns,
    };
  }
};

const handleNextRound = (state: SyncState, playerId: string): SyncState => {
  if (state.gameStatus !== 'roundOver') return state;

  const newRound = state.round + 1;
  const players = state.players.map(p => ({...p, isReady: false}));

  return {
    ...state,
    players,
    calledNumberIndex: -1,
    gameStatus: 'waiting',
    round: newRound,
    roundSeed: generateSeed(state.gameCode, newRound),
    roundWinnerId: undefined,
    lastAchievedPatterns: [],
    currentTurnId: state.roundWinnerId,
  };
};

const handleSendMessage = (state: SyncState, playerId: string, message: string): SyncState => {
  const sender = state.players.find(p => p.id === playerId);
  if (!sender || !message.trim()) {
    return state;
  }

  const newMessage = {
    senderId: playerId,
    senderName: sender.name,
    message: message.trim(),
  };

  return {
    ...state,
    chatHistory: [...state.chatHistory, newMessage]
  };
};

const checkWin = (grid: Grid): { achieved: boolean; patterns: string[] } => {
  const patterns: string[] = [];
  (Object.keys(WIN_PATTERNS_CONFIG) as WinPattern[]).forEach(key => {
    if (WIN_PATTERNS_CONFIG[key].check(grid)) {
      patterns.push(WIN_PATTERNS_CONFIG[key].name);
    }
  });
  return { achieved: patterns.length > 0, patterns };
};

export default async function handler(req: any, res: any) {
  try {
    console.log('Game action request:', { method: req.method, query: req.query, body: req.body });

    const { gameCode } = req.query;

    if (!gameCode || typeof gameCode !== 'string') {
      return res.status(400).json({ error: 'Invalid game code' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Redis environment variables not set');
      return res.status(500).json({ error: 'Redis not configured' });
    }

    const gameData = await redis.get(`game:${gameCode}`);
    if (!gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game: SyncState = JSON.parse(gameData as string);

    if (req.method === 'GET') {
      console.log('Returning game state for:', gameCode);
      return res.status(200).json(game);
    }

    if (req.method === 'POST') {
      const action: GameAction = req.body;

      if (!action || !action.type) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      console.log('Processing action:', action.type, 'for game:', gameCode);

      let newState = { ...game };

      switch (action.type) {
        case 'PLAYER_READY':
          newState = handlePlayerReady(newState, action.payload.playerId);
          break;
        case 'CALL_NUMBER':
          newState = handleCallNumber(newState, action.payload.playerId);
          break;
        case 'DECLARE_BINGO':
          newState = handleDeclareBingo(newState, action.payload.playerId, action.payload.grid);
          break;
        case 'NEXT_ROUND':
          newState = handleNextRound(newState, action.payload.playerId);
          break;
        case 'SEND_MESSAGE':
          newState = handleSendMessage(newState, action.payload.playerId, action.payload.message);
          break;
        default:
          return res.status(400).json({ error: 'Unknown action type' });
      }

      await redis.set(`game:${gameCode}`, JSON.stringify(newState));
      console.log('Game state updated for action:', action.type);
      return res.status(200).json(newState);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in game/[gameCode] handler:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
