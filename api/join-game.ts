import { Player, SyncState } from '../types';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameCode, player }: { gameCode: string; player: Player } = req.body;

  if (!gameCode || !player) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const gameData = await redis.get(`game:${gameCode}`);
  if (!gameData) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game: SyncState = JSON.parse(gameData as string);

  // Check if player is rejoining
  const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);
  if (existingPlayerIndex !== -1) {
    // Reconnecting
    const newState = { ...game };
    newState.players[existingPlayerIndex].isConnected = true;
    newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has reconnected.`, isSystem: true });
    await redis.set(`game:${gameCode}`, JSON.stringify(newState));
    return res.status(200).json(newState);
  }

  if (game.players.length >= 2) {
    return res.status(400).json({ error: 'Game is full' });
  }

  const playerWithStatus = { ...player, isConnected: true };
  const newState = { ...game, players: [...game.players, playerWithStatus] };
  newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has joined.`, isSystem: true });
  await redis.set(`game:${gameCode}`, JSON.stringify(newState));

  res.status(200).json(newState);
}
