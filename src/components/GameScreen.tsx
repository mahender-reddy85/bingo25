import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Grid, WinState, WinPattern, GameMode, SyncState, Player } from '../types.js';
import { WIN_PATTERNS_CONFIG, seededShuffle } from '../utils/index.js';
import BingoGrid from './BingoGrid';

const checkLocalWin = (grid: Grid): boolean => {
  const linePatterns = [WinPattern.ROW_0, WinPattern.ROW_1, WinPattern.ROW_2, WinPattern.ROW_3, WinPattern.ROW_4,
    WinPattern.COL_0, WinPattern.COL_1, WinPattern.COL_2, WinPattern.COL_3, WinPattern.COL_4,
    WinPattern.DIAG_1, WinPattern.DIAG_2];
  const completedLines = linePatterns.filter(pattern => WIN_PATTERNS_CONFIG[pattern].check(grid));
  return completedLines.length >= 5;
};
import { BingoModal, GameOverModal } from './Modals';
import { HomeIcon } from './Icons';
import Confetti from './Confetti';
import { gameService } from '../services/gameService';


interface GameScreenProps {
  onReturnToLobby: () => void;
  gameCode: string;
  playerName: string;
  playerId: string;
}

const generateGrid = (gameSeed: number, playerId: string): Grid => {
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

const Scoreboard: React.FC<{ me: Player; opponent?: Player; gameMode: GameMode }> = ({ me, opponent, gameMode }) => {
    const winsNeeded = gameMode === GameMode.BestOf3 ? 2 : (gameMode === GameMode.BestOf5 ? 3 : 1);
    const modeText = gameMode === GameMode.BestOf3 ? "Best of 3" : (gameMode === GameMode.BestOf5 ? "Best of 5" : "Normal Mode");
    
    return (
        <div className="w-full bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{modeText}</p>
            <div className="flex justify-around items-center">
                <div className="text-center">
                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">{me.score}</p>
                    <p className="text-xs text-[var(--text-secondary)]">YOU</p>
                </div>
                <div className="text-4xl font-light text-[var(--text-secondary)]">/</div>
                <div className={`text-center transition-opacity ${!opponent?.isConnected && opponent ? 'opacity-50' : ''}`}>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{opponent?.score ?? 0}</p>
                     <div className="flex items-center justify-center gap-2">
                        {opponent && <span className={`h-2 w-2 rounded-full ${opponent.isConnected ? 'bg-[var(--brand-from)]' : 'bg-[var(--bg-secondary)]'}`}></span>}
                        <p className="text-xs text-[var(--text-secondary)]">{opponent?.name?.toUpperCase() ?? 'WAITING...'}</p>
                    </div>
                </div>
            </div>
            {gameMode !== GameMode.Normal && <p className="text-xs text-center mt-3 text-[var(--text-primary)]">First to <span className="font-bold text-[var(--text-primary)]">{winsNeeded}</span> wins</p>}
        </div>
    )
};







const GameScreen: React.FC<GameScreenProps> = ({ onReturnToLobby, gameCode, playerName, playerId }) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [playerGrid, setPlayerGrid] = useState<Grid>(() => generateGrid(0, playerId));
  const [swapSelection, setSwapSelection] = useState<{ r: number; c: number } | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [localTurnId, setLocalTurnId] = useState<string | undefined>(undefined);
  const prevStateRef = useRef<SyncState | null>(syncState);

  const me = useMemo(() => syncState?.players.find(p => p.id === playerId), [syncState, playerId]);
  const opponent = useMemo(() => syncState?.players.find(p => p.id !== playerId), [syncState, playerId]);

  const calledNumbers = useMemo(() => {
    if (!syncState) return new Set<number>();
    return new Set(syncState.calledNumbers);
  }, [syncState]);

  useEffect(() => {
    const handleUpdate = (newState: SyncState) => {
        setSyncState(newState);
    };
    gameService.onUpdate(gameCode, handleUpdate);
    gameService.startPolling(gameCode);

    return () => {
        gameService.offUpdate(gameCode, handleUpdate);
        gameService.stopPolling(gameCode);
    };
  }, [gameCode]);

  useEffect(() => {
    if (syncState) {
        if (typeof syncState.roundSeed === 'number') {
            setPlayerGrid(generateGrid(syncState.roundSeed, playerId));
        }
    }
  }, [syncState?.roundSeed, playerId]);

  useEffect(() => {
    if (syncState) {
      setLocalTurnId(syncState.currentTurnId);
    }
  }, [syncState?.currentTurnId]);

  
  useEffect(() => {
    if (syncState && calledNumbers.size > 0) {
      const newGrid = playerGrid.map(row =>
        row.map(cell => {
          if (calledNumbers.has(cell.number) && !cell.marked) {
            return { ...cell, marked: true };
          }
          return cell;
        })
      );
      setPlayerGrid(newGrid);
    }
  }, [syncState?.calledNumbers, calledNumbers]);




  
  useEffect(() => {
    if (!syncState) return;

    if (syncState.gameStatus === 'roundOver' || syncState.gameStatus === 'gameOver') {
        setShowConfetti(true);
    }
  }, [syncState?.gameStatus, syncState?.gameWinnerId, syncState?.roundWinnerId, playerId]);
  

  
  useEffect(() => {
    if (showConfetti) {
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const isGridLocked = useMemo(() => {
    if (!syncState) return false;
    return syncState.gameStatus !== 'waiting' || (me?.isReady ?? false);
  }, [syncState, me]);

  const isMyTurn = useMemo(() => {
    if (!syncState) return false;
    return localTurnId === playerId && (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting');
  }, [syncState, localTurnId, playerId]);

  const canDeclareBingo = useMemo(() => checkLocalWin(playerGrid), [playerGrid]);






  const handleCellClick = (r: number, c: number) => {
    if (syncState?.gameStatus === 'roundOver' || syncState?.gameStatus === 'gameOver') return;

    if (isGridLocked) {
        const cellNumber = playerGrid[r][c].number;
        if (calledNumbers.has(cellNumber)) {
            
            const newGrid = playerGrid.map(row => row.map(cell => ({...cell})));
            newGrid[r][c].marked = !newGrid[r][c].marked;
            setPlayerGrid(newGrid);
        } else if (isMyTurn && !calledNumbers.has(cellNumber)) {
            
            gameService.sendAction(gameCode, { type: 'REVEAL_NUMBER', payload: { playerId, number: cellNumber } }).catch(error => {
              console.error('Failed to reveal number:', error);
            });
        }
        return;
    }

    if (!swapSelection) {
      setSwapSelection({ r, c });
    } else {
      if (swapSelection.r === r && swapSelection.c === c) {
        setSwapSelection(null);
        return;
      }
      const newGrid = playerGrid.map(row => row.map(cell => ({...cell})));
      const firstCell = newGrid[swapSelection.r][swapSelection.c];
      const secondCell = newGrid[r][c];
      [firstCell.number, secondCell.number] = [secondCell.number, firstCell.number];
      setPlayerGrid(newGrid);
      setSwapSelection(null);
    }
  };

  const checkBingo = async () => {
    try {
      await gameService.sendAction(gameCode, { type: 'DECLARE_BINGO', payload: { playerId, grid: playerGrid } });
    } catch (error) {
      console.error('Failed to declare bingo:', error);
    }
  };
  
  const handleReadyClick = async () => {
      if(swapSelection) setSwapSelection(null);
      try {
        await gameService.sendAction(gameCode, { type: 'PLAYER_READY', payload: { playerId } });
      } catch (error) {
        console.error('Failed to set ready:', error);
      }
  };

  const handleNextRound = async () => {
      try {
        await gameService.sendAction(gameCode, { type: 'NEXT_ROUND', payload: { playerId } });
      } catch (error) {
        console.error('Failed to next round:', error);
      }
  };



  if (!syncState || !me) {
    return <div className="min-h-screen w-full flex items-center justify-center">Loading game...</div>
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-6 overflow-auto">
        <Confetti isActive={showConfetti} />
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
            <div className="flex-grow flex flex-col items-center">
                <header className="w-full flex justify-between items-center mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">{me.name}</span>'s Grid
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <span className="text-[var(--text-secondary)] text-xs font-semibold">GAME CODE</span>
                            <p className="text-lg font-bold text-[var(--text-secondary)] tracking-widest">{gameCode}</p>
                        </div>
                        <button onClick={onReturnToLobby} className="p-2 bg-[var(--bg-secondary)] rounded-full hover:bg-[var(--brand-from)] transition-colors duration-300" title="Return to Lobby">
                            <HomeIcon />
                        </button>
                    </div>
                </header>
                 {!isGridLocked && (
                    <p className="text-[var(--text-secondary)] mb-2 text-center text-sm animate-pulse">
                        Customize your grid! Click two numbers to swap them.
                    </p>
                )}
                 {me.isReady && syncState.gameStatus === 'waiting' && (
                                <p className="text-[var(--brand-from)] mb-2 text-center text-sm font-semibold">
                        Grid locked! Waiting for {opponent ? opponent.name : 'opponent'} to get ready.
                    </p>
                )}
                <BingoGrid
                    grid={playerGrid}
                    onCellClick={handleCellClick}
                    calledNumbers={calledNumbers}
                    calledBy={syncState.calledBy}
                    ownPlayerId={playerId}
                    swapSelection={swapSelection}
                    isGridLocked={isGridLocked}
                    isMyTurn={isMyTurn}
                />
            </div>

            <div className="w-full md:w-80 flex-shrink-0 glass-panel rounded-lg p-4 flex flex-col space-y-3 max-h-[75vh] overflow-hidden">
                {syncState.gameMode !== GameMode.Normal && <Scoreboard me={me} opponent={opponent} gameMode={syncState.gameMode} />}


                 
                <div className="flex-grow flex flex-col space-y-4 min-h-0">
                    { syncState.gameStatus === 'waiting' ? (
                        <div className="flex-grow flex items-center justify-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                           <div className="text-center">
                            { opponent ?
                              (<>
                                <h3 className="font-bold text-lg text-[var(--brand-from)]">Ready up!</h3>
                                <p className="text-[var(--text-secondary)] text-sm mt-1">Customize your grid, then hit "I'm Ready" to begin.</p>
                              </>) :
                              (<>
                                 <h3 className="font-bold text-lg text-[var(--brand-from)] animate-pulse">Waiting...</h3>
                                 <p className="text-[var(--text-secondary)] text-sm mt-1">Waiting for another player to join the game.</p>
                               </>)
                            }
                           </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                            <div className="text-center">
                                {isMyTurn ? (
                                    <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] animate-pulse">Select a number to call!</p>
                                ) : (
                                    (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting') && <p className="text-[var(--text-secondary)] italic">Waiting for {opponent?.name ?? 'opponent'} to call...</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-2">
                        { syncState.gameStatus === 'waiting' && !me.isReady &&
                            <button onClick={handleReadyClick} className="w-full text-lg font-semibold py-3 px-6 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-lg transition-all hover:scale-105 btn-glow">
                                I'm Ready
                            </button>
                        }
                        { me.isReady && (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting') &&
                        <button onClick={checkBingo} disabled={!canDeclareBingo} className={`w-full text-lg font-semibold py-3 px-6 rounded-lg transition-all ${canDeclareBingo ? 'bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white hover:scale-105 btn-glow' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>
                            BINGO!
                        </button>
                        }
                    </div>
                </div>
            </div>
        </div>
        <BingoModal 
            isOpen={syncState.gameStatus === 'roundOver'} 
            onClose={() => {}} // Cannot close this modal manually
            onNextRound={handleNextRound}
            achievedPatterns={syncState.lastAchievedPatterns ?? []}
            isWinner={syncState.roundWinnerId === playerId}
        />
        <GameOverModal
            isOpen={syncState.gameStatus === 'gameOver'}
            onClose={() => {}} // Cannot close
            onPlayAgain={onReturnToLobby}
            me={me}
            opponent={opponent}
            isWinner={syncState.gameWinnerId === playerId}
            gameMode={syncState.gameMode}
            achievedPatterns={syncState.lastAchievedPatterns ?? []}
        />
    </div>
  );
};

export default GameScreen;
