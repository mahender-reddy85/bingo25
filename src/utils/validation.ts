import { z } from 'zod';
import { GameMode } from '../types.js';

export const GameModeSchema = z.enum(['NORMAL', 'BEST_OF_3', 'BEST_OF_5']);

export const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(20),
  score: z.number().int().min(0),
  isReady: z.boolean(),
  isConnected: z.boolean(),
  token: z.string().optional(),
});

export const CreateGamePlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(20),
  score: z.number().int().min(0),
  isReady: z.boolean(),
  isConnected: z.boolean(),
  token: z.string().optional(),
});

export const CreateGameRequestSchema = z.object({
  gameCode: z.string().optional(),
  gameMode: GameModeSchema,
  player: CreateGamePlayerSchema,
});

export const JoinGameRequestSchema = z.object({
  gameCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  player: PlayerSchema,
});

export const PlayerReadyActionSchema = z.object({
  type: z.literal('PLAYER_READY'),
  payload: z.object({
    playerId: z.string().min(1),
    grid: z.array(z.array(z.object({
      number: z.number().int().min(1).max(25),
      marked: z.literal(false),
    }))).optional(),
  }),
});

export const RevealNumberActionSchema = z.object({
  type: z.literal('REVEAL_NUMBER'),
  payload: z.object({
    playerId: z.string().min(1),
    number: z.number().int().min(1).max(25),
  }),
});

export const DeclareBingoActionSchema = z.object({
  type: z.literal('DECLARE_BINGO'),
  payload: z.object({
    playerId: z.string().min(1),
  }),
});

export const NextRoundActionSchema = z.object({
  type: z.literal('NEXT_ROUND'),
  payload: z.object({
    playerId: z.string().min(1),
  }),
});

export const GameActionSchema = z.discriminatedUnion('type', [
  PlayerReadyActionSchema,
  RevealNumberActionSchema,
  DeclareBingoActionSchema,
  NextRoundActionSchema,
]);
