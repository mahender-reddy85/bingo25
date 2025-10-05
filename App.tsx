
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameState, GameMode } from './types';
import GameScreen from './components/GameScreen';
import { RulesModal } from './components/Modals';
import { RulesIcon, SunIcon, MoonIcon } from './components/Icons';
import { gameService } from './services/mockGameService';


const DecorativeBingoBoard = () => (
    <div className="relative -top-2 w-24 h-24 grid grid-cols-5 gap-0.5 p-0.5 bg-slate-900/50 rounded-lg transform-gpu -rotate-12 select-none opacity-50 hidden md:grid animate-text-pop-up">
        {Array.from({ length: 25 }).map((_, i) => {
            const isMarked = [1, 7, 12, 17, 23].includes(i);
            const isCenter = i === 12;
            return (
                <div key={i} className={`flex items-center justify-center rounded-sm ${isMarked ? 'bg-gradient-to-br from-purple-600 to-pink-500 scale-105' : 'bg-slate-700'} ${isCenter ? 'shadow-lg shadow-purple-500/50' : ''}`}>
                </div>
            );
        })}
    </div>
);

const InteractiveTitle = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative text-center mb-4 interactive-title-container"
    >
      <h1 className="relative text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-to)] to-red-500 animate-text-pop-up">
        Bingo25
      </h1>
      <p className="text-[var(--text-secondary)] text-lg mt-2 animate-text-pop-up" style={{ animationDelay: '0.2s' }}>
        Where Strategy Meets Luck
      </p>
    </div>
  );
};

const MultiplayerLobby: React.FC<{
  gameState: GameState;
  gameCode: string;
  onCreateGame: (gameMode: GameMode) => void;
  onJoinGame: () => void;
  onStartGame: (code: string, name: string) => void;
  onCancel: () => void;
}> = ({
  gameState,
  gameCode,
  onCreateGame,
  onJoinGame,
  onStartGame,
  onCancel,
}) => {
  const [isRulesModalOpen, setRulesModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Normal);

  const handleCreate = () => {
    onCreateGame(selectedMode);
  };

  const handleJoin = () => {
      onJoinGame();
  }

  const handleStart = () => {
    onStartGame(gameCode, playerName);
  }

  const handleJoinStart = () => {
      onStartGame(joinCode, playerName);
  }

  const handleCancel = () => {
      onCancel();
  }

  const renderContent = () => {
    switch (gameState) {
      case GameState.Creating:
        return (
          <div className="text-center w-full max-w-sm glass-panel p-8 rounded-2xl">
            <h2 className="text-2xl text-[var(--text-secondary)] mb-4">Your Game Code</h2>
            <div className="bg-[var(--bg-primary)] p-4 rounded-lg text-5xl font-bold tracking-widest mb-4 select-all">{gameCode}</div>
            <p className="text-[var(--text-secondary)] mb-6">Share this with a friend. Enter your name and start when ready.</p>
             <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="w-full bg-[var(--bg-primary)] p-4 rounded-lg text-xl font-bold text-center mb-6 focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)]"
              placeholder="Your Name"
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleStart} disabled={!playerName.trim()} className="px-8 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 btn-glow">Start Game</button>
              <button onClick={handleCancel} className="px-8 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        );
      case GameState.Joining:
        return (
          <div className="text-center w-full max-w-sm glass-panel p-8 rounded-2xl">
            <h2 className="text-2xl text-[var(--text-secondary)] mb-4">Join a Game</h2>
            <p className="text-[var(--text-secondary)] mb-6">Enter the 4-digit code and your name.</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^0-9]/g, '').slice(0, 4))}
              maxLength={4}
              className="w-full bg-[var(--bg-primary)] p-4 rounded-lg text-4xl font-bold tracking-widest text-center mb-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)]"
              placeholder="1234"
            />
            <div className="h-6 mb-2">
                {joinCode.length > 0 && joinCode.length < 4 && (
                    <p className="text-red-500 text-xs">
                        Game code must be 4 digits.
                    </p>
                )}
            </div>
             <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="w-full bg-[var(--bg-primary)] p-4 rounded-lg text-xl font-bold text-center mb-6 focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)]"
              placeholder="Your Name"
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleJoinStart} disabled={joinCode.length !== 4 || !playerName.trim()} className="px-8 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-lg font-semibold disabled:opacity-50 transition-all hover:scale-105 btn-glow">Join Game</button>
              <button onClick={handleCancel} className="px-8 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        );
      case GameState.Lobby:
      default:
        return (
          <>
            <DecorativeBingoBoard />
            <InteractiveTitle />
            <div className="glass-panel p-6 rounded-2xl w-full max-w-sm flex flex-col items-center">
                 <h3 className="text-lg text-[var(--text-secondary)] mb-4">Game Mode</h3>
                <div className="flex flex-col sm:flex-row bg-[var(--bg-primary)] p-1 rounded-lg mb-6">
                    <button onClick={() => setSelectedMode(GameMode.Normal)} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${selectedMode === GameMode.Normal ? 'bg-purple-600 text-white' : 'text-[var(--text-secondary)]'}`}>Normal</button>
                    <button onClick={() => setSelectedMode(GameMode.BestOf3)} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${selectedMode === GameMode.BestOf3 ? 'bg-purple-600 text-white' : 'text-[var(--text-secondary)]'}`}>Best of 3</button>
                    <button onClick={() => setSelectedMode(GameMode.BestOf5)} className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${selectedMode === GameMode.BestOf5 ? 'bg-purple-600 text-white' : 'text-[var(--text-secondary)]'}`}>Best of 5</button>
                </div>
                <div className="flex flex-col space-y-4 w-full">
                    <button onClick={handleCreate} className="w-full text-lg font-semibold py-3 px-6 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-lg transition-all hover:scale-105 animate-slide-in-bottom btn-glow" style={{ animationDelay: '0.4s' }}>Create Game</button>
                    <button onClick={handleJoin} className="w-full text-lg font-semibold py-3 px-6 bg-[var(--bg-secondary)] rounded-lg hover:bg-slate-700 transition-colors animate-slide-in-bottom" style={{ animationDelay: '0.6s' }}>Join Game</button>
                </div>
            </div>
            <div className="flex space-x-4 mt-12">
                <button onClick={() => setRulesModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-md hover:bg-slate-700 transition duration-300">
                    <RulesIcon />
                    <span>Rules</span>
                </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {renderContent()}
      <RulesModal isOpen={isRulesModalOpen} onClose={() => setRulesModalOpen(false)} />
    </div>
  );
};


const ThemeToggle: React.FC<{ theme: string; onToggle: () => void }> = ({ theme, onToggle }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = () => {
        onToggle();
        setIsAnimating(true);
    };

    return (
        <button 
            onClick={handleClick} 
            onAnimationEnd={() => setIsAnimating(false)}
            className="fixed top-4 right-4 z-50 p-2 rounded-full bg-[var(--bg-panel-solid)] text-[var(--text-primary)] transition-colors"
        >
            <span className={isAnimating ? 'theme-icon-animate' : ''}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
        </button>
    );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Lobby);
  const [gameCode, setGameCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId] = useState(() => 'player-' + Math.random().toString(36).substring(2, 9));
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Normal);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handleBeforeUnload = () => {
        if (gameState === GameState.InProgress && gameCode && playerId) {
            gameService.leaveGame(gameCode, playerId);
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState, gameCode, playerId]);

  const handleToggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCreateGame = (mode: GameMode) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGameCode(code);
    setGameMode(mode);
    setGameState(GameState.Creating);
  };

  const handleJoinGame = () => {
    setGameState(GameState.Joining);
  };

  const handleStartGame = (code: string, name: string) => {
    if (code.length === 4 && name.trim()) {
        setGameCode(code);
        setPlayerName(name);

        const player = { id: playerId, name, score: 0, isReady: false, isConnected: false };
        const existingGame = gameService.getGame(code);
        
        if (existingGame) { // Joining
             if (existingGame.players.length >= 2 && !existingGame.players.find(p => p.id === playerId)) {
                alert("Game is full!");
                return;
            }
            gameService.joinGame(code, player);
        } else { // Creating
            gameService.createGame(code, gameMode, player);
        }

        setGameState(GameState.InProgress);
    }
  };

  const returnToLobby = () => {
    gameService.leaveGame(gameCode, playerId);
    setGameState(GameState.Lobby);
    setGameCode('');
    setPlayerName('');
  };

  const renderContent = () => {
    if (gameState === GameState.InProgress) {
      return <GameScreen 
        onReturnToLobby={returnToLobby} 
        gameCode={gameCode} 
        playerName={playerName}
        playerId={playerId}
      />;
    }
    return (
      <MultiplayerLobby
        gameState={gameState}
        gameCode={gameCode}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        onStartGame={handleStartGame}
        onCancel={returnToLobby}
      />
    );
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)] antialiased">
      <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      {renderContent()}
    </div>
  );
};

export default App;
