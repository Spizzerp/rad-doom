"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const core_1 = require("@colyseus/core");
const GameState_1 = require("./schema/GameState");
class GameRoom extends core_1.Room {
    onCreate(_options) {
        this.setState(new GameState_1.GameState());
    }
    onJoin(_client, _options) { }
    onLeave(_client, _code) { }
    onDispose() { }
}
exports.GameRoom = GameRoom;
