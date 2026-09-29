import { Grid, Cell } from '../types.js';
import { seededShuffle } from './index.js';

export const generateGrid = (gameSeed: number, playerId: string): Grid => {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);

  const playerSeed = gameSeed + playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const shuffled = seededShuffle(numbers, playerSeed);
  const grid: Grid = [];
  for (let i = 0; i < 5; i++) {
    grid.push(
      shuffled.slice(i * 5, i * 5 + 5).map(number => ({ number, marked: false }))
    );
  }
  return grid;
};

export const validateGrid = (grid: Grid): { valid: boolean; error?: string } => {
  if (!grid || !Array.isArray(grid)) {
    return { valid: false, error: 'Grid must be an array' };
  }

  if (grid.length !== 5) {
    return { valid: false, error: 'Grid must have exactly 5 rows' };
  }

  const seenNumbers = new Set<number>();

  for (let r = 0; r < 5; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || row.length !== 5) {
      return { valid: false, error: `Row ${r} must have exactly 5 cells` };
    }

    for (let c = 0; c < 5; c++) {
      const cell = row[c];
      if (!cell || typeof cell !== 'object') {
        return { valid: false, error: `Cell at [${r},${c}] must be an object` };
      }

      if (typeof cell.number !== 'number') {
        return { valid: false, error: `Cell at [${r},${c}] must have a number` };
      }

      if (cell.number < 1 || cell.number > 25) {
        return { valid: false, error: `Cell at [${r},${c}] must be between 1 and 25` };
      }

      if (seenNumbers.has(cell.number)) {
        return { valid: false, error: `Duplicate number ${cell.number} found at [${r},${c}]` };
      }
      seenNumbers.add(cell.number);

      if (cell.marked !== false) {
        return { valid: false, error: `Cell at [${r},${c}] must have marked=false` };
      }
    }
  }

  if (seenNumbers.size !== 25) {
    return { valid: false, error: 'Grid must contain all numbers 1-25 exactly once' };
  }

  return { valid: true };
};

export const deriveMarkedCells = (grid: Grid, calledNumbers: Set<number>): Grid => {
  return grid.map(row =>
    row.map(cell => ({
      ...cell,
      marked: calledNumbers.has(cell.number)
    }))
  );
};
