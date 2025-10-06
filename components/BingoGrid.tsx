import React from 'react';
import { Grid, WinState, WinPattern } from '../types.js';
import { WIN_PATTERNS_CONFIG } from '../constants.js';

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
    cellClasses = "bg-gradient-to-br from-purple-600 to-pink-500 text-white scale-105 shadow-md shadow-purple-500/30";
  } else if (!isGridLocked && isSwapSelected) {
    cellClasses = "bg-blue-500 ring-4 ring-blue-300 scale-105";
  } else if (isCalled) {
      cellClasses = "bg-slate-700/50 text-[var(--text-secondary)]";
  } else if (!isGridLocked) {
    cellClasses = "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-slate-700 hover:-translate-y-1";
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
    const winningCells = new Set<string>(); // Win state is handled by parent

    const gridContainerClasses = `w-full max-w-2xl aspect-square grid grid-cols-5 grid-rows-5 bg-slate-900/50 dark:bg-slate-900/50 light:bg-white/50 rounded-xl p-2 md:p-4 shadow-2xl transition-all duration-300 ${isGridLocked && !calledNumbers.size ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20' : ''}`;

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