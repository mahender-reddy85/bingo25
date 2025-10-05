import { Player, SyncState } from '../types';

// Shared games map (in-memory, not persistent)
const games = new Map<string, SyncState>();

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameCode, player }: { gameCode: string; player: Player } = req.body;

  if (!gameCode || !player) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const game = games.get(gameCode);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Check if player is rejoining
  const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);
  if (existingPlayerIndex !== -1) {
    // Reconnecting
    const newState = { ...game };
    newState.players[existingPlayerIndex].isConnected = true;
    newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has reconnected.`, isSystem: true });
    games.set(gameCode, newState);
    return res.status(200).json(newState);
  }

  if (game.players.length >= 2) {
    return res.status(400).json({ error: 'Game is full' });
  }

  const playerWithStatus = { ...player, isConnected: true };
  const newState = { ...game, players: [...game.players, playerWithStatus] };
  newState.chatHistory.push({ senderId: 'system', senderName: 'System', message: `${player.name} has joined.`, isSystem: true });
  games.set(gameCode, newState);

  res.status(200).json(newState);
}
