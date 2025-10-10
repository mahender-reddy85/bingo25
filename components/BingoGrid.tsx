import React from 'react';
import { Grid, WinState, WinPattern } from '../types.js';
import { WIN_PATTERNS_CONFIG } from '../constants.js';
import { WinPatternConfig } from '../types.js';

interface BingoGridProps {
  grid: Grid;
  onCellClick: (r: number, c: number) => void;
  calledNumbers: Set<number>;
  swapSelection: { r: number, c: number } | null;
  isGridLocked: boolean;
}

const GridCell: React.FC<{
  cell: { number: number; marked: boolean };
  r: number;
  c: number;
  onCellClick: (r: number, c: number) => void;
  isWinning: boolean;
  isCalled: boolean;
  isSwapSelected: boolean;
  isGridLocked: boolean;
}> = React.memo(({ cell, r, c, onCellClick, isWinning, isCalled, isSwapSelected, isGridLocked }) => {
    
  let baseClasses = "aspect-square w-full rounded-lg flex items-center justify-center text-2xl font-bold select-none transition-all duration-300 transform-gpu";
  
  if ((!isGridLocked) || (isGridLocked && isCalled)) {
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
      cellClasses = "bg-amber-500/20 border-2 border-amber-400 text-amber-900 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-100 animate-pulse-once";
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

const BingoGrid: React.FC<BingoGridProps> = ({ grid, onCellClick, calledNumbers, swapSelection, isGridLocked }) => {
    // Note: Win animation is now handled at the GameScreen level via modals/confetti
    // This component focuses on displaying the grid state.
    const winningCells = new Set<string>();
    // Calculate achieved patterns and highlight winning cells
    Object.values(WIN_PATTERNS_CONFIG).forEach((pattern: WinPatternConfig) => {
        if (pattern.check(grid)) {
            const cells = pattern.getWinningCells(grid);
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
                    isSwapSelected={swapSelection !== null && swapSelection.r === r && swapSelection.c === c}
                    isGridLocked={isGridLocked}
                />
            ))
        )}
        </div>
    );
};

export default BingoGrid;