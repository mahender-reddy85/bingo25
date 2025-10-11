import { GameMode, Player, SyncState } from '../types.js';
import { Redis } from '@upstash/redis';
import { generateSeed } from '../utils.js';

export default async function handler(req: any, res: any) {
  try {
    console.log('Create game request:', { method: req.method, body: req.body });

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Redis environment variables not set');
      return res.status(500).json({ error: 'Redis not configured' });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const { gameCode, gameMode, player }: { gameCode: string; gameMode: GameMode; player: Player } = req.body;

    if (!gameCode || !gameMode || !player) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Creating game with code:', gameCode, 'mode:', gameMode, 'player:', player);

    const initialSeed = generateSeed(gameCode);
    const hostWithStatus = { ...player, isConnected: true };

    const newState: SyncState = {
      gameCode,
      players: [hostWithStatus],
      calledNumbers: [],
      calledBy: {},
      gameStatus: 'waiting',
      round: 1,
      roundSeed: initialSeed,
      currentTurnId: player.id,
      gameMode,
    };

    console.log('Saving game state to Redis:', `game:${gameCode}`);
    await redis.set(`game:${gameCode}`, JSON.stringify(newState));

    console.log('Game created successfully');
    res.status(200).json(newState);
  } catch (error) {
    console.error('Error in create-game handler:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
