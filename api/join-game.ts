import { Player, SyncState } from '../src/types.js';
import { Redis } from '@upstash/redis';
import { JoinGameRequestSchema } from '../src/utils/validation.js';
import { ApiHandler } from './types.js';
import crypto from 'crypto';

const generatePlayerToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const handler: ApiHandler = async (req, res) => {
  try {
    console.log('Join game request:', { method: req.method });

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Redis environment variables not set');
      return res.status(500).json({ error: 'Redis not configured' });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const validationResult = JoinGameRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validationResult.error.errors });
    }

    const { gameCode, player } = validationResult.data;

    console.log('Joining game with code:', gameCode, 'playerId:', player.id);

    const gameData = await redis.get(`game:${gameCode}`);
    if (!gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    let game: SyncState;
    try {
      game = typeof gameData === 'string' ? JSON.parse(gameData) : gameData;
    } catch (parseError) {
      console.error('Failed to parse game data:', parseError);
      return res.status(500).json({ error: 'Failed to parse game data' });
    }

    if (!game.calledBy) {
      game.calledBy = {};
    }
    if (!game.calledNumbers) {
      game.calledNumbers = [];
    }
    if (!game.version) {
      game.version = 1;
    }

    const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      const newState = { ...game };
      newState.players[existingPlayerIndex].isConnected = true;
      newState.version += 1;
      await redis.set(`game:${gameCode}`, JSON.stringify(newState), { ex: 7200 });
      console.log('Player reconnected:', player.id);
      return res.status(200).json(newState);
    }

    if (game.players.length >= 2) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const playerToken = generatePlayerToken();
    const playerWithStatus = { ...player, token: playerToken, isConnected: true };
    const newState = { ...game, players: [...game.players, playerWithStatus], version: game.version + 1 };
    await redis.set(`game:${gameCode}`, JSON.stringify(newState), { ex: 7200 });

    console.log('Player joined:', player.id);
    res.status(200).json({ ...newState, playerToken });
  } catch (error) {
    console.error('Error in join-game handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
