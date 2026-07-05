import React from 'react';
import { Grid, WinPattern } from '../types.js';
import { WIN_PATTERNS_CONFIG } from '../utils/index.js';

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

  let baseClasses = "aspect-square w-full flex items-center justify-center text-2xl font-bold select-none transition-all duration-300 transform-gpu";

  if ((!isGridLocked) || (isGridLocked && (isCalled || (!isCalled && isMyTurn)))) {
    baseClasses += " cursor-pointer";
  } else {
    baseClasses += " cursor-default";
  }
  
  let cellClasses = "";

  if(isWinning) {
    cellClasses = "bg-green-500 text-white animate-win";
  } else if (cell.marked) {
    cellClasses = "marked-cell bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white";
  } else if (!isGridLocked && isSwapSelected) {
    cellClasses = "bg-[var(--brand-from)] text-white";
  } else if (isCalled) {
      const callerId = calledBy[cell.number];
      if (callerId === ownPlayerId) {
        cellClasses = "bg-blue-100 text-blue-900 animate-pulse-once";
      } else {
        cellClasses = "bg-orange-100 text-orange-900 animate-pulse-once";
      }
  } else if (!isGridLocked) {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";
  } else if (isGridLocked && isMyTurn) {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";
  } else {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)]";
  }

  return (
    <button onClick={() => onCellClick(r, c)} className={`${baseClasses} ${cellClasses}`}>
      {cell.number}
    </button>
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

    const gridContainerClasses = `w-full max-w-xl aspect-square grid grid-cols-5 grid-rows-5 gap-px bg-[var(--border-color)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-2xl transition-all duration-300 ${isGridLocked && !calledNumbers.size ? 'ring-2 ring-[var(--brand-from)] shadow-lg shadow-[var(--brand-to)]/20' : ''}`;

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