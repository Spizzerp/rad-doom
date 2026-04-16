"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@colyseus/core");
const ws_transport_1 = require("@colyseus/ws-transport");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const GameRoom_1 = require("./rooms/GameRoom");
const PORT = Number(process.env.PORT) || 2567;
const app = (0, express_1.default)();
app.get('/', (_req, res) => {
    res.send('Moon Doom server');
});
const httpServer = (0, http_1.createServer)(app);
const gameServer = new core_1.Server({
    transport: new ws_transport_1.WebSocketTransport({ server: httpServer }),
});
gameServer.define('game', GameRoom_1.GameRoom);
gameServer.listen(PORT).then(() => {
    console.log(`Moon Doom server listening on :${PORT}`);
});
