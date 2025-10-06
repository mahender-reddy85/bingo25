import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Grid, WinState, WinPattern, GameMode, SyncState, Player, ChatMessage } from '../types.js';
import { WIN_PATTERNS_CONFIG } from '../constants.js';
import BingoGrid from './BingoGrid';
import { BingoModal, GameOverModal } from './Modals';
import { HomeIcon, SendIcon } from './Icons';
import Confetti from './Confetti';
import { gameService } from '../services/gameService';
import { generateSeed, createSeededRandom, seededShuffle } from '../utils';

// --- Seeded Random Functions ---
// Removed duplicate implementations since imported from utils

interface GameScreenProps {
  onReturnToLobby: () => void;
  gameCode: string;
  playerName: string;
  playerId: string;
}

const generateGrid = (gameSeed: number, playerId: string): Grid => {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  // Create player-specific seed by combining game seed with player ID
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
            <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">{modeText}</p>
            <div className="flex justify-around items-center">
                <div className="text-center">
                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{me.score}</p>
                    <p className="text-xs text-[var(--text-secondary)]">YOU</p>
                </div>
                <div className="text-4xl font-light text-[var(--text-secondary)]">/</div>
                <div className={`text-center transition-opacity ${!opponent?.isConnected && opponent ? 'opacity-50' : ''}`}>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{opponent?.score ?? 0}</p>
                     <div className="flex items-center justify-center gap-2">
                        {opponent && <span className={`h-2 w-2 rounded-full ${opponent.isConnected ? 'bg-green-500' : 'bg-slate-500'}`}></span>}
                        <p className="text-xs text-[var(--text-secondary)]">{opponent?.name?.toUpperCase() ?? 'WAITING...'}</p>
                    </div>
                </div>
            </div>
            {gameMode !== GameMode.Normal && <p className="text-xs text-center mt-3 text-[var(--text-secondary)]">First to <span className="font-bold text-[var(--text-primary)]">{winsNeeded}</span> wins</p>}
        </div>
    )
};


const CalledNumbersDisplay: React.FC<{ numberSequence: number[]; calledNumberIndex: number; gameStatus: SyncState['gameStatus'] }> = ({ numberSequence, calledNumberIndex, gameStatus }) => {
  const currentNumber = calledNumberIndex > -1 ? numberSequence[calledNumberIndex] : null;
  const pastNumbers = calledNumberIndex > 0 ? numberSequence.slice(0, calledNumberIndex).reverse() : [];
  const currentNumberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentNumber && currentNumberRef.current) {
      const el = currentNumberRef.current;
      el.classList.remove('animate-called-number-pop');
      void el.offsetWidth; // Trigger reflow
      el.classList.add('animate-called-number-pop');
    }
  }, [currentNumber]);

  return (
    <div className="w-full bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
      <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">CALLED NUMBERS</p>
      <div className="flex items-center justify-center h-32">
        {currentNumber ? (
          <div ref={currentNumberRef} className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30">
            {currentNumber}
          </div>
        ) : (
          <div className="text-2xl text-[var(--text-secondary)]">
            {gameStatus === 'waiting' ? "Waiting for opponent..." : "Game is starting..."}
          </div>
        )}
      </div>
      <div className="h-10 mt-2 overflow-hidden">
        <div className="flex justify-center items-center gap-2 flex-wrap">
          {pastNumbers.slice(0, 10).map((num, i) => (
            <span key={num} className="text-sm text-[var(--text-secondary)]" style={{ opacity: 1 - i * 0.1 }}>
              {num}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChatBox: React.FC<{
    chatHistory: ChatMessage[];
    playerId: string;
    onSendMessage: (message: string) => void;
}> = ({ chatHistory, playerId, onSendMessage }) => {
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="flex-grow flex flex-col bg-[var(--bg-secondary)] rounded-lg min-h-0">
            <p className="text-sm font-semibold text-[var(--text-secondary)] text-center p-2 border-b border-[var(--border-color)]">CHAT</p>
            <div className="flex-grow p-3 space-y-3 overflow-y-auto h-48 md:h-auto max-h-72 md:max-h-96 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {chatHistory.map((chat, index) => (
                    <div key={index}>
                        {chat.isSystem ? (
                            <p className="text-xs text-center text-[var(--text-secondary)] italic">{chat.message}</p>
                        ) : (
                            <div className={`flex flex-col ${chat.senderId === playerId ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-[var(--text-secondary)] px-2">{chat.senderId === playerId ? 'You' : chat.senderName}</span>
                                <p className={`max-w-[80%] text-sm p-2 rounded-lg break-words ${chat.senderId === playerId ? 'bg-purple-600 text-white' : 'bg-slate-700'}`}>
                                    {chat.message}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-[var(--border-color)] flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-grow bg-[var(--bg-primary)] p-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    maxLength={100}
                />
                <button onClick={handleSend} className="bg-purple-600 p-2 rounded-lg text-white hover:bg-purple-700 transition-colors disabled:opacity-50" disabled={!message.trim()}>
                    <SendIcon />
                </button>
            </div>
        </div>
    );
};


const GameScreen: React.FC<GameScreenProps> = ({ onReturnToLobby, gameCode, playerName, playerId }) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [playerGrid, setPlayerGrid] = useState<Grid>(() => generateGrid(0, playerId));
  const [swapSelection, setSwapSelection] = useState<{ r: number; c: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStateRef = useRef<SyncState | null>(syncState);

  const me = useMemo(() => syncState?.players.find(p => p.id === playerId), [syncState, playerId]);
  const opponent = useMemo(() => syncState?.players.find(p => p.id !== playerId), [syncState, playerId]);
  
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


  // Effect for confetti
  useEffect(() => {
    if (!syncState) return;

    if (syncState.gameStatus === 'roundOver' || syncState.gameStatus === 'gameOver') {
        setShowConfetti(true);
    }
  }, [syncState?.gameStatus, syncState?.gameWinnerId, syncState?.roundWinnerId, syncState?.calledNumberIndex, playerId]);
  

  // Effect to turn off confetti
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
    return syncState.currentTurnId === playerId && (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting');
  }, [syncState, playerId]);

  const calledNumbers = useMemo(() => {
    if (!syncState) return new Set<number>();
    return new Set(syncState.numberSequence.slice(0, syncState.calledNumberIndex + 1));
  }, [syncState]);


  const callNextNumber = useCallback(async () => {
    if(swapSelection) setSwapSelection(null);
    try {
      await gameService.sendAction(gameCode, { type: 'CALL_NUMBER', payload: { playerId } });
    } catch (error) {
      console.error('Failed to call number:', error);
    }
  }, [gameCode, playerId, swapSelection]);

  const revealNumber = useCallback(async (number: number) => {
    if(swapSelection) setSwapSelection(null);
    try {
      await gameService.sendAction(gameCode, { type: 'REVEAL_NUMBER', payload: { playerId, number } });
    } catch (error) {
      console.error('Failed to reveal number:', error);
    }
  }, [gameCode, playerId, swapSelection]);

  const handleCellClick = (r: number, c: number) => {
    if (syncState?.gameStatus === 'roundOver' || syncState?.gameStatus === 'gameOver') return;

    if (isGridLocked) {
        const cellNumber = playerGrid[r][c].number;
        if (calledNumbers.has(cellNumber)) {
            // Mark/unmark the cell if the number has been revealed
            const newGrid = playerGrid.map(row => row.map(cell => ({...cell})));
            newGrid[r][c].marked = !newGrid[r][c].marked;
            setPlayerGrid(newGrid);
        } else if (isMyTurn && !playerGrid[r][c].marked) {
            // Reveal the number if it's the player's turn and the cell isn't already marked
            revealNumber(cellNumber);
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

  const handleSendMessage = async (message: string) => {
    try {
      await gameService.sendAction(gameCode, { type: 'SEND_MESSAGE', payload: { playerId, message } });
    } catch (error) {
      console.error('Failed to send message:', error);
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
                        <button onClick={onReturnToLobby} className="p-2 bg-[var(--bg-secondary)] rounded-full hover:bg-purple-600 transition-colors duration-300">
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
                    <p className="text-cyan-400 mb-2 text-center text-sm font-semibold">
                        Grid locked! Waiting for {opponent ? opponent.name : 'opponent'} to get ready.
                    </p>
                )}
                <BingoGrid 
                    grid={playerGrid} 
                    onCellClick={handleCellClick} 
                    calledNumbers={calledNumbers}
                    swapSelection={swapSelection}
                    isGridLocked={isGridLocked}
                />
            </div>

            <div className="w-full md:w-80 flex-shrink-0 glass-panel rounded-lg p-4 flex flex-col space-y-3 max-h-[75vh] overflow-hidden">
                {syncState.gameMode !== GameMode.Normal && <Scoreboard me={me} opponent={opponent} gameMode={syncState.gameMode} />}

                { syncState.gameStatus !== 'waiting' &&
                    <CalledNumbersDisplay numberSequence={syncState.numberSequence} calledNumberIndex={syncState.calledNumberIndex} gameStatus={syncState.gameStatus} />
                }
                 
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
                                 <h3 className="font-bold text-lg text-cyan-400 animate-pulse">Waiting...</h3>
                                 <p className="text-[var(--text-secondary)] text-sm mt-1">Waiting for another player to join the game.</p>
                               </>)
                            }
                           </div>
                        </div>
                     ) : (
                        <ChatBox chatHistory={syncState.chatHistory} playerId={playerId} onSendMessage={handleSendMessage} />
                     )}


                    <div className="space-y-4 pt-2">
                        <div className="text-center h-6">
                            {isMyTurn ? (
                                <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 animate-pulse">Your Turn to Call!</p>
                            ) : (
                                (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting') && <p className="text-[var(--text-secondary)] italic">Waiting for {opponent?.name ?? 'opponent'}...</p>
                            )}
                        </div>
                        { syncState.gameStatus === 'waiting' && !me.isReady &&
                            <button onClick={handleReadyClick} className="w-full text-lg font-semibold py-3 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg transition-all hover:scale-105 btn-glow">
                                I'm Ready
                            </button>
                        }
                        { me.isReady && (syncState.gameStatus === 'playing' || syncState.gameStatus === 'starting') &&
                        <>
                            <button onClick={callNextNumber} disabled={!isMyTurn} className="w-full text-lg font-semibold py-3 px-6 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Call Next Number
                            </button>
                            <button onClick={checkBingo} className="w-full text-lg font-semibold py-3 px-6 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg transition-all hover:scale-105 btn-glow">
                                BINGO!
                            </button>
                        </>
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
