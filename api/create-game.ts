import { GameMode, Player, SyncState } from '../types';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const generateSeed = (gameCode: string, round = 1) => {
  let hash = 0;
  const str = `${gameCode}-${round}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
};

const generateNumberSequence = (gameCode: string) => {
  const seed = generateSeed(gameCode, 0);
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  return seededShuffle(numbers, seed);
};

const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const newArray = [...array];
  const random = createSeededRandom(seed);
  let currentIndex = newArray.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

const createSeededRandom = (seed: number) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameCode, gameMode, player }: { gameCode: string; gameMode: GameMode; player: Player } = req.body;

  if (!gameCode || !gameMode || !player) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const initialSeed = generateSeed(gameCode);
  const numberSequence = generateNumberSequence(gameCode);
  const hostWithStatus = { ...player, isConnected: true };

  const newState: SyncState = {
    gameCode,
    players: [hostWithStatus],
    numberSequence,
    calledNumberIndex: -1,
    gameStatus: 'waiting',
    round: 1,
    roundSeed: initialSeed,
    currentTurnId: player.id,
    gameMode,
    chatHistory: [{ senderId: 'system', senderName: 'System', message: `${player.name} created the game.`, isSystem: true }],
  };

  await redis.set(`game:${gameCode}`, JSON.stringify(newState));

  res.status(200).json(newState);
}
