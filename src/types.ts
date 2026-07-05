export enum GameState {
  Lobby = 'LOBBY',
  Creating = 'CREATING',
  Joining = 'JOINING',
  InProgress = 'IN_PROGRESS',
  Bingo = 'BINGO',
}

export enum CallerSpeed {
  Slow = 'SLOW',
  Medium = 'MEDIUM',
  Fast = 'FAST',
}

export enum GameMode {
    Normal = 'NORMAL',
    BestOf3 = 'BEST_OF_3',
    BestOf5 = 'BEST_OF_5',
}

export interface Settings {
  speed: CallerSpeed;
  sound: boolean;
}

export interface Cell {
  number: number;
  marked: boolean;
}

export type Grid = Cell[][];

export enum WinPattern {
  ROW_0 = 'ROW_0',
  ROW_1 = 'ROW_1',
  ROW_2 = 'ROW_2',
  ROW_3 = 'ROW_3',
  ROW_4 = 'ROW_4',
  COL_0 = 'COL_0',
  COL_1 = 'COL_1',
  COL_2 = 'COL_2',
  COL_3 = 'COL_3',
  COL_4 = 'COL_4',
  DIAG_1 = 'DIAG_1',
  DIAG_2 = 'DIAG_2',
  CORNERS = 'CORNERS',
  STAMP = 'STAMP',
  X_PATTERN = 'X_PATTERN',
  BLACKOUT = 'BLACKOUT',
}

export interface WinPatternConfig {
    name: string;
    description: string;
    check: (grid: Grid) => boolean;
    getWinningCells?: (grid: Grid) => { r: number, c: number }[];
}

export type WinState = Record<WinPattern, boolean>;

export interface Player {
    id: string;
    name: string;
    score: number;
    isReady: boolean;
    isConnected: boolean;
}

export interface SyncState {
    gameCode: string;
    players: Player[];
    calledNumbers: number[];
    calledBy: Record<number, string>;
    gameStatus: 'waiting' | 'starting' | 'playing' | 'roundOver' | 'gameOver';
    round: number;
    roundSeed: number;
    roundWinnerId?: string;
    gameWinnerId?: string;
    currentTurnId?: string;
    gameMode: GameMode;
    lastAchievedPatterns?: string[];
}

export type GameAction =
    | { type: 'PLAYER_READY'; payload: { playerId: string } }
    | { type: 'CALL_NUMBER'; payload: { playerId: string } }
    | { type: 'REVEAL_NUMBER'; payload: { playerId: string, number: number } }
    | { type: 'DECLARE_BINGO'; payload: { playerId: string, grid: Grid } }
    | { type: 'NEXT_ROUND'; payload: { playerId: string } }
    | { type: 'SEND_MESSAGE'; payload: { playerId: string, message: string } };
