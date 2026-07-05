import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { GameMode, Player } from '../types.js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const modalRoot = document.getElementById('modal-root');

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'sm' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen || !modalRoot) return null;
  
  const handleClose = () => {
      onClose();
  }
  
  const sizeClasses = size === 'lg' 
    ? 'max-w-sm md:max-w-2xl' 
    : size === 'md' 
      ? 'max-w-sm md:max-w-md' 
      : 'max-w-sm';

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose ? handleClose : undefined}>
      <div className={`bg-[var(--bg-panel-solid)] rounded-xl shadow-2xl w-full ${sizeClasses} text-white border border-[var(--border-color)] transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-up max-h-[85vh] overflow-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">{title}</h2>
          {onClose && <button onClick={handleClose} className="text-slate-400 hover:text-white">&times;</button>}
        </div>
        <div className="p-4 max-h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {children}
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>
    </div>
  );
  
  return ReactDOM.createPortal(modalContent, modalRoot);
};

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Game Rules" size="lg">
    <div className="space-y-6 text-[var(--text-secondary)]">
      <div>
        <h3 className="font-bold text-lg text-[var(--brand-from)] mb-2">Objective</h3>
        <p>Be the first player to complete 5 winning lines (rows, columns, or diagonals) and call BINGO! In "Best of" modes, be the first to win the required number of rounds.</p>
      </div>
      <div>
        <h3 className="font-bold text-lg text-[var(--brand-from)] mb-2">Game Setup</h3>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li><strong>Select Mode:</strong> Choose from Normal, Best of 3, or Best of 5.</li>
          <li><strong>Create or Join:</strong> Start a new game to get a 4-digit code, or join a friend's game using their code.</li>
          <li><strong>Customize Your Grid:</strong> Before the game begins, arrange the numbers on your grid by clicking two numbers to swap them.</li>
          <li><strong>Get Ready:</strong> Once you're happy with your grid, click "I'm Ready" to lock it in. The game starts when both players are ready.</li>
        </ol>
      </div>
      <div>
        <h3 className="font-bold text-lg text-[var(--brand-from)] mb-2">How to Play</h3>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li><strong>Revealing Numbers:</strong> On your turn, click any unmarked cell on your grid to reveal and call that number. It becomes called for both players.</li>
          <li><strong>Auto-Marking:</strong> Called numbers are automatically marked on your grid if present.</li>
          <li><strong>Highlighting:</strong> Completed lines (rows, columns, diagonals) highlight in green.</li>
          <li><strong>Winning:</strong> When you have at least 5 completed lines, the BINGO button enables. Click it to declare and win the round/game. The server verifies your grid.</li>
        </ol>
      </div>
    </div>
  </Modal>
);

interface RoundWonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNextRound: () => void;
    achievedPatterns: string[];
    isWinner: boolean;
}
export const BingoModal: React.FC<RoundWonModalProps> = ({ isOpen, onClose, onNextRound, achievedPatterns, isWinner }) => {

    const handleNextRound = () => {
        onNextRound();
    }

    const title = isWinner ? "Round Won!" : "Round Lost";
    const titleColor = isWinner ? "from-green-400 to-blue-500" : "from-red-500 to-orange-500";
    const headerText = isWinner ? "BINGO!" : "Opponent Won";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
             <div className="text-center space-y-6">
                <h3 className={`text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${titleColor} animate-pulse`}>{headerText}</h3>
                <div className="flex flex-wrap justify-center gap-3">
                    {achievedPatterns.map((pattern, index) => (
                        <div key={pattern} className="relative">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                {pattern}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center pt-4">
                    <button onClick={handleNextRound} className="px-8 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-md hover:opacity-90 transition-opacity btn-glow">Next Round</button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s forwards ease-out;
                }
            `}</style>
        </Modal>
    )
}

interface GameOverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlayAgain: () => void;
    me?: Player;
    opponent?: Player;
    isWinner: boolean;
    gameMode: GameMode;
    achievedPatterns: string[];
}
export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, onClose, onPlayAgain, me, opponent, isWinner, gameMode, achievedPatterns }) => {
    
    const handlePlayAgain = () => {
        onPlayAgain();
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isWinner ? "You are the Champion!" : "Good Game!"}>
             <div className="text-center space-y-6">
                <h3 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                    {isWinner ? "YOU WIN!" : "GAME OVER"}
                </h3>

                {gameMode !== GameMode.Normal ? (
                    <>
                        <p className="text-slate-300">Final Score:</p>
                        <div className="text-4xl font-bold">
                            <span className="text-green-400">{me?.score ?? 0}</span>
                            <span className="text-slate-500 mx-2">-</span>
                            <span className="text-red-400">{opponent?.score ?? 0}</span>
                        </div>
                    </>
                ) : (
                     <div className="flex flex-wrap justify-center gap-3">
                        {achievedPatterns.map((pattern, index) => (
                            <div key={pattern} className="relative">
                                <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                    {pattern}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex justify-center space-x-4 pt-4">
                    <button onClick={handlePlayAgain} className="px-8 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-md hover:opacity-90 transition-opacity btn-glow">Play Again</button>
                </div>
            </div>
        </Modal>
    )
}