import { GameMode, Player, SyncState } from '../src/types.js';
import { Redis } from '@upstash/redis';
import { generateSeed } from '../src/utils/index.js';
import { CreateGameRequestSchema } from '../src/utils/validation.js';
import { ApiHandler } from './types.js';
import crypto from 'crypto';

const generateGameCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generatePlayerToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const handler: ApiHandler = async (req, res) => {
  try {
    console.log('Create game request:', { method: req.method });

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Redis environment variables not set');
      return res.status(500).json({ error: 'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel settings.' });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const validationResult = CreateGameRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validationResult.error.issues });
    }

    const { gameMode, player } = validationResult.data;
    const validatedGameMode = gameMode as GameMode;

    let gameCode = generateGameCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await redis.get(`game:${gameCode}`);
      if (!existing) {
        break;
      }
      gameCode = generateGameCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique game code' });
    }

    const playerToken = generatePlayerToken();
    const playerWithToken = { ...player, token: playerToken, isConnected: true };

    const initialSeed = generateSeed(gameCode);

    const newState: SyncState = {
      gameCode,
      players: [playerWithToken],
      calledNumbers: [],
      calledBy: {},
      gameStatus: 'waiting',
      round: 1,
      roundSeed: initialSeed,
      currentTurnId: player.id,
      gameMode: validatedGameMode,
      version: 1,
    };

    console.log('Saving game state to Redis:', `game:${gameCode}`);
    await redis.set(`game:${gameCode}`, JSON.stringify(newState), { ex: 7200 });

    console.log('Game created successfully with code:', gameCode);
    res.status(200).json({ ...newState, playerToken });
  } catch (error: any) {
    console.error('Error in create-game handler:', error);
    res.status(500).json({ error: error?.message ? `Database connection error: ${error.message}` : 'Internal server error' });
  }
};

export default handler;
