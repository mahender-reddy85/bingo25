import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { gameService } from './gameService.js';
import { GameAction, Player } from './types.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bingo25 Backend Server is running');
});

// REST API endpoints

app.post('/game/create', (req, res) => {
  const { gameCode, gameMode, host } = req.body;
  if (!gameCode || !gameMode || !host) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  gameService.createGame(gameCode, gameMode, host);
  res.status(201).json({ message: 'Game created' });
});

app.post('/game/join', (req, res) => {
  const { gameCode, player } = req.body;
  if (!gameCode || !player) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  gameService.joinGame(gameCode, player);
  res.status(200).json({ message: 'Joined game' });
});

app.post('/game/leave', (req, res) => {
  const { gameCode, playerId } = req.body;
  if (!gameCode || !playerId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  gameService.leaveGame(gameCode, playerId);
  res.status(200).json({ message: 'Left game' });
});

app.get('/game/:gameCode', (req, res) => {
  const gameCode = req.params.gameCode;
  const game = gameService.getGame(gameCode);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

// WebSocket events

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('subscribe', (gameCode: string) => {
    socket.join(gameCode);
    const game = gameService.getGame(gameCode);
    if (game) {
      socket.emit('game-update', game);
    }
  });

  socket.on('unsubscribe', (gameCode: string) => {
    socket.leave(gameCode);
  });

  socket.on('game-action', (data: { gameCode: string; action: GameAction }) => {
    const { gameCode, action } = data;
    gameService.sendAction(gameCode, action);
    const updatedGame = gameService.getGame(gameCode);
    if (updatedGame) {
      io.to(gameCode).emit('game-update', updatedGame);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
