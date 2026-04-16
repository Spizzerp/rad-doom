import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.get('/', (_req, res) => {
  res.send('Moon Doom server');
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('game', GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`Moon Doom server listening on :${PORT}`);
});
