import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameState, GameMode } from './types';
import GameScreen from './components/GameScreen';
import { RulesModal } from './components/Modals';
import { RulesIcon, SunIcon, MoonIcon } from './components/Icons';
import { gameService } from './services/gameService';

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

const ThemeToggle = ({ theme, onToggle }: { theme: string; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="fixed top-4 right-4 z-50 p-2 rounded-full bg-[var(--bg-panel-solid)] backdrop-blur-sm border border-[var(--border-color)] shadow-lg hover:shadow-xl transition-all duration-200"
    aria-label="Toggle theme"
  >
    {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-600" />}
  </button>
);

const MultiplayerLobby = ({
  gameState,
  gameCode,
  onCreateGame,
  onJoinGame,
  onStartGame,
  onCancel,
}: {
  gameState: GameState;
  gameCode: string;
  onCreateGame: (gameMode: GameMode) => void;
  onJoinGame: () => void;
  onStartGame: (code: string, name: string) => void;
  onCancel: () => void;
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Normal);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleCreate = () => {
    onCreateGame(selectedMode);
  };

  const handleJoin = () => {
    onJoinGame();
  };

  const handleSubmitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode && playerName) {
      onStartGame(joinCode, playerName);
    }
  };

  if (gameState === GameState.Creating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Creating Game...</h2>
          <p className="text-[var(--text-secondary)]">Game code: {gameCode}</p>
        </div>
        <button onClick={onCancel} className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700">
          Cancel
        </button>
      </div>
    );
  }

  if (gameState === GameState.Joining) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Join Game</h2>
          <form onSubmit={handleSubmitJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Game Code (4 digits)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              className="w-32 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded text-center"
              maxLength={4}
            />
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-48 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded"
            />
            <button type="submit" className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
              Join
            </button>
          </form>
        </div>
        <button onClick={onCancel} className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <DecorativeBingoBoard />
      <InteractiveTitle />
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Create Game</h2>
          <div className="space-y-2">
            <button
              onClick={() => handleModeSelect(GameMode.Normal)}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${selectedMode === GameMode.Normal ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border-color)]'}`}
            >
              Normal (First to Bingo Wins)
            </button>
            <button
              onClick={() => handleModeSelect(GameMode.BestOf3)}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${selectedMode === GameMode.BestOf3 ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border-color)]'}`}
            >
              Best of 3
            </button>
            <button
              onClick={() => handleModeSelect(GameMode.BestOf5)}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${selectedMode === GameMode.BestOf5 ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border-color)]'}`}
            >
              Best of 5
            </button>
          </div>
          <button onClick={handleCreate} className="w-full px-6 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-lg font-semibold hover:scale-105 transition-transform">
            Create Game
          </button>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Join Game</h2>
          <button onClick={handleJoin} className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:scale-105 transition-transform">
            Join Game
          </button>
        </div>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <RulesIcon className="w-5 h-5" />
        Rules
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState(GameState.Lobby);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId] = useState(() => uuidv4());
  const [theme, setTheme] = useState('dark');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (gameState === GameState.InProgress && gameCode) {
      e.preventDefault();
      gameService.leaveGame(gameCode, playerId);
    }
  }, [gameState, gameCode, playerId]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCreateGame = (mode: GameMode) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGameCode(code);
    setGameState(GameState.Creating);
  };

  const handleJoinGame = () => {
    setGameState(GameState.Joining);
  };

  const handleStartGame = async (code: string, name: string) => {
    if (code.length === 4 && name.trim()) {
      setGameCode(code);
      setPlayerName(name);

      const player = { id: playerId, name, score: 0, isReady: false, isConnected: true };

      try {
        const existingGame = await gameService.getGame(code);

        if (existingGame) { // Joining
          if (existingGame.players.length >= 2 && !existingGame.players.find(p => p.id === playerId)) {
            alert("Game is full!");
            return;
          }
          await gameService.joinGame(code, player);
        } else { // Creating
          await gameService.createGame(code, GameMode.Normal, player); // Default mode for create if not set
        }

        setGameState(GameState.InProgress);
        gameService.startPolling(code);
      } catch (error) {
        console.error('Failed to start game:', error);
        alert('Failed to start game. Please try again.');
      }
    }
  };

  const returnToLobby = () => {
    if (gameCode) {
      gameService.leaveGame(gameCode, playerId);
    }
    setGameState(GameState.Lobby);
    setGameCode('');
    setPlayerName('');
  };

  const renderContent = () => {
    if (gameState === GameState.InProgress) {
      return (
        <GameScreen 
          onReturnToLobby={returnToLobby} 
          gameCode={gameCode} 
          playerName={playerName}
          playerId={playerId}
        />
      );
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
      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
    </div>
  );
};

export default App;
