import { CallerSpeed, WinPattern, WinState, Grid, WinPatternConfig } from './types';

export const CALLER_SPEEDS: Record<CallerSpeed, number> = {
  [CallerSpeed.Slow]: 3000,
  [CallerSpeed.Medium]: 2000,
  [CallerSpeed.Fast]: 1000,
};

export const INITIAL_WIN_STATE: WinState = {
  [WinPattern.ROW_0]: false,
  [WinPattern.ROW_1]: false,
  [WinPattern.ROW_2]: false,
  [WinPattern.ROW_3]: false,
  [WinPattern.ROW_4]: false,
  [WinPattern.COL_0]: false,
  [WinPattern.COL_1]: false,
  [WinPattern.COL_2]: false,
  [WinPattern.COL_3]: false,
  [WinPattern.COL_4]: false,
  [WinPattern.DIAG_1]: false,
  [WinPattern.DIAG_2]: false,
  [WinPattern.CORNERS]: false,
  [WinPattern.STAMP]: false,
  [WinPattern.X_PATTERN]: false,
  [WinPattern.BLACKOUT]: false,
};

const getWinningRowCells = (r: number) => Array.from({ length: 5 }, (_, c) => ({ r, c }));
const getWinningColCells = (c: number) => Array.from({ length: 5 }, (_, r) => ({ r, c }));
const getWinningDiag1Cells = () => Array.from({ length: 5 }, (_, i) => ({ r: i, c: i }));
const getWinningDiag2Cells = () => Array.from({ length: 5 }, (_, i) => ({ r: i, c: 4 - i }));
const getWinningCornerCells = () => [{ r: 0, c: 0 }, { r: 0, c: 4 }, { r: 4, c: 0 }, { r: 4, c: 4 }];
const getWinningStampCells = (grid: Grid) => {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (grid[r][c].marked && grid[r + 1][c].marked && grid[r][c + 1].marked && grid[r + 1][c + 1].marked) {
                return [{ r, c }, { r: r + 1, c }, { r, c: c + 1 }, { r: r + 1, c: c + 1 }];
            }
        }
    }
    return [];
}
const getWinningBlackoutCells = () => {
    const cells = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            cells.push({r, c});
        }
    }
    return cells;
}


export const WIN_PATTERNS_CONFIG: Record<WinPattern, WinPatternConfig> = {
  // Rows
  [WinPattern.ROW_0]: { name: 'Row 1', description: 'Complete the first row', check: grid => grid[0].every(c => c.marked), getWinningCells: () => getWinningRowCells(0) },
  [WinPattern.ROW_1]: { name: 'Row 2', description: 'Complete the second row', check: grid => grid[1].every(c => c.marked), getWinningCells: () => getWinningRowCells(1) },
  [WinPattern.ROW_2]: { name: 'Row 3', description: 'Complete the third row', check: grid => grid[2].every(c => c.marked), getWinningCells: () => getWinningRowCells(2) },
  [WinPattern.ROW_3]: { name: 'Row 4', description: 'Complete the fourth row', check: grid => grid[3].every(c => c.marked), getWinningCells: () => getWinningRowCells(3) },
  [WinPattern.ROW_4]: { name: 'Row 5', description: 'Complete the fifth row', check: grid => grid[4].every(c => c.marked), getWinningCells: () => getWinningRowCells(4) },
  // Columns
  [WinPattern.COL_0]: { name: 'Column 1', description: 'Complete the first column', check: grid => grid.every(r => r[0].marked), getWinningCells: () => getWinningColCells(0) },
  [WinPattern.COL_1]: { name: 'Column 2', description: 'Complete the second column', check: grid => grid.every(r => r[1].marked), getWinningCells: () => getWinningColCells(1) },
  [WinPattern.COL_2]: { name: 'Column 3', description: 'Complete the third column', check: grid => grid.every(r => r[2].marked), getWinningCells: () => getWinningColCells(2) },
  [WinPattern.COL_3]: { name: 'Column 4', description: 'Complete the fourth column', check: grid => grid.every(r => r[3].marked), getWinningCells: () => getWinningColCells(3) },
  [WinPattern.COL_4]: { name: 'Column 5', description: 'Complete the fifth column', check: grid => grid.every(r => r[4].marked), getWinningCells: () => getWinningColCells(4) },
  // Diagonals
  [WinPattern.DIAG_1]: { name: 'Diagonal \\', description: 'Top-left to bottom-right', check: grid => grid.every((r, i) => r[i].marked), getWinningCells: getWinningDiag1Cells },
  [WinPattern.DIAG_2]: { name: 'Diagonal /', description: 'Top-right to bottom-left', check: grid => grid.every((r, i) => r[4 - i].marked), getWinningCells: getWinningDiag2Cells },
  // Special
  [WinPattern.CORNERS]: { name: 'Four Corners', description: 'Mark all four corners', check: grid => grid[0][0].marked && grid[0][4].marked && grid[4][0].marked && grid[4][4].marked, getWinningCells: getWinningCornerCells },
  [WinPattern.STAMP]: { name: 'Stamp', description: 'Mark a 2x2 block', check: grid => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c].marked && grid[r + 1][c].marked && grid[r][c + 1].marked && grid[r + 1][c + 1].marked) return true;
      }
    }
    return false;
  }, getWinningCells: getWinningStampCells },
  [WinPattern.X_PATTERN]: { name: 'X-Pattern', description: 'Complete both diagonals', check: grid => WIN_PATTERNS_CONFIG[WinPattern.DIAG_1].check(grid) && WIN_PATTERNS_CONFIG[WinPattern.DIAG_2].check(grid), getWinningCells: () => [...getWinningDiag1Cells(), ...getWinningDiag2Cells()] },
  [WinPattern.BLACKOUT]: { name: 'Blackout', description: 'Mark all numbers', check: grid => grid.flat().every(c => c.marked), getWinningCells: getWinningBlackoutCells },
};
