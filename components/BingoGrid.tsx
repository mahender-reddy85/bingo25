import React from 'react';
import { Grid, WinPattern } from '../types.js';
import { WIN_PATTERNS_CONFIG } from '../constants.js';

interface BingoGridProps {
  grid: Grid;
  onCellClick: (r: number, c: number) => void;
  calledNumbers: Set<number>;
  calledBy: Record<number, string>;
  ownPlayerId: string;
  swapSelection: { r: number, c: number } | null;
  isGridLocked: boolean;
  isMyTurn: boolean;
}

const GridCell: React.FC<{
  cell: { number: number; marked: boolean };
  r: number;
  c: number;
  onCellClick: (r: number, c: number) => void;
  isWinning: boolean;
  isCalled: boolean;
  calledBy: Record<number, string>;
  ownPlayerId: string;
  isSwapSelected: boolean;
  isGridLocked: boolean;
  isMyTurn: boolean;
}> = React.memo(({ cell, r, c, onCellClick, isWinning, isCalled, calledBy, ownPlayerId, isSwapSelected, isGridLocked, isMyTurn }) => {

  let baseClasses = "aspect-square w-full rounded-lg flex items-center justify-center text-2xl font-bold select-none transition-all duration-300 transform-gpu";

  if ((!isGridLocked) || (isGridLocked && (isCalled || (!isCalled && isMyTurn)))) {
    baseClasses += " cursor-pointer";
  } else {
    baseClasses += " cursor-default";
  }
  
  let cellClasses = "";

  if(isWinning) {
    cellClasses = "bg-green-500 text-white ring-2 ring-white animate-win";
  } else if (cell.marked) {
    cellClasses = "marked-cell bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white scale-105 shadow-md shadow-purple-500/30";
  } else if (!isGridLocked && isSwapSelected) {
    cellClasses = "bg-[var(--brand-from)] ring-4 ring-[var(--brand-to)] scale-105";
  } else if (isCalled) {
      const callerId = calledBy[cell.number];
      if (callerId === ownPlayerId) {
        cellClasses = "bg-blue-500/20 border-2 border-blue-400 text-blue-900 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-100 animate-pulse-once";
      } else {
        cellClasses = "bg-orange-500/20 border-2 border-orange-400 text-orange-900 dark:bg-orange-900/20 dark:border-orange-600 dark:text-orange-100 animate-pulse-once";
      }
  } else if (!isGridLocked) {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-solid)] hover:-translate-y-1";
  }
  else {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)]";
  }

  return (
    <div className="p-1">
      <button onClick={() => onCellClick(r, c)} className={`${baseClasses} ${cellClasses}`}>
        {cell.number}
      </button>
    </div>
  );
});

const BingoGrid: React.FC<BingoGridProps> = ({ grid, onCellClick, calledNumbers, calledBy, ownPlayerId, swapSelection, isGridLocked, isMyTurn }) => {
    // Note: Win animation is now handled at the GameScreen level via modals/confetti
    // This component focuses on displaying the grid state.
    const winningCells = new Set<string>();
    // Calculate achieved patterns and highlight winning cells (only lines: rows, columns, diagonals)
    const linePatterns = [WinPattern.ROW_0, WinPattern.ROW_1, WinPattern.ROW_2, WinPattern.ROW_3, WinPattern.ROW_4,
      WinPattern.COL_0, WinPattern.COL_1, WinPattern.COL_2, WinPattern.COL_3, WinPattern.COL_4,
      WinPattern.DIAG_1, WinPattern.DIAG_2];
    linePatterns.forEach((pattern) => {
      if (WIN_PATTERNS_CONFIG[pattern].check(grid)) {
        const cells = WIN_PATTERNS_CONFIG[pattern].getWinningCells(grid);
        cells.forEach(({ r, c }) => {
          winningCells.add(`${r}-${c}`);
        });
      }
    });

    const gridContainerClasses = `w-full max-w-xl aspect-square grid grid-cols-5 grid-rows-5 bg-[var(--bg-panel)] rounded-xl p-2 md:p-3 shadow-2xl transition-all duration-300 overflow-auto ${isGridLocked && !calledNumbers.size ? 'ring-2 ring-[var(--brand-from)] shadow-lg shadow-[var(--brand-to)]/20' : ''}`;

    return (
        <div className={gridContainerClasses}>
        {grid.map((row, r) =>
            row.map((cell, c) => (
                <GridCell
                    key={`${r}-${c}`}
                    cell={cell}
                    r={r}
                    c={c}
                    onCellClick={onCellClick}
                    isWinning={winningCells.has(`${r}-${c}`)}
                    isCalled={calledNumbers.has(cell.number)}
                    calledBy={calledBy}
                    ownPlayerId={ownPlayerId}
                    isSwapSelected={swapSelection !== null && swapSelection.r === r && swapSelection.c === c}
                    isGridLocked={isGridLocked}
                    isMyTurn={isMyTurn}
                />
            ))
        )}
        </div>
    );
};

export default BingoGrid;