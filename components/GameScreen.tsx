import React from 'react';

interface GameScreenProps {
  onReturnToLobby: () => void;
  gameCode: string;
  playerName: string;
  playerId: string;
}

const GameScreen: React.FC<GameScreenProps> = ({ onReturnToLobby, gameCode, playerName, playerId }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Game Screen</h1>
        <p className="text-[var(--text-secondary)] mb-4">Welcome, {playerName}!</p>
        <p className="text-[var(--text-secondary)] mb-4">Game Code: {gameCode}</p>
        <button
          onClick={onReturnToLobby}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default GameScreen;
