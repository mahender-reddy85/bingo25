import { Player, SyncState } from '../types.js';
import { Redis } from '@upstash/redis';

export default async function handler(req: any, res: any) {
  try {
    console.log('Join game request:', { method: req.method, body: req.body });

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

    const { gameCode, player }: { gameCode: string; player: Player } = req.body;

    if (!gameCode || !player) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Joining game with code:', gameCode, 'player:', player);

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

    // Ensure calledBy exists
    if (!game.calledBy) {
      game.calledBy = {};
    }

    // Check if player is rejoining
    const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      // Reconnecting
      const newState = { ...game };
      newState.players[existingPlayerIndex].isConnected = true;
      newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has reconnected.`, isSystem: true });
      await redis.set(`game:${gameCode}`, JSON.stringify(newState));
      console.log('Player reconnected:', player.id);
      return res.status(200).json(newState);
    }

    if (game.players.length >= 2) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const playerWithStatus = { ...player, isConnected: true };
    const newState = { ...game, players: [...game.players, playerWithStatus] };
    newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has joined.`, isSystem: true });
    await redis.set(`game:${gameCode}`, JSON.stringify(newState));

    console.log('Player joined:', player.id);
    res.status(200).json(newState);
  } catch (error) {
    console.error('Error in join-game handler:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
