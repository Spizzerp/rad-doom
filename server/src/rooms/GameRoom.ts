import { Room, Client } from '@colyseus/core';
import { GameState } from './schema/GameState';

export class GameRoom extends Room<{ state: GameState }> {
  onCreate(_options: unknown) {
    this.setState(new GameState());
  }

  onJoin(_client: Client, _options: unknown) {}

  onLeave(_client: Client, _code?: number) {}

  onDispose() {}
}
