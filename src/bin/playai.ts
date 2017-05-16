#!/usr/bin/env node

import { GainDestination, GameState } from '../base';
import { Card, CardInPlay } from '../cards';
import { EventListener, GameEvent } from '../event';
import Game from '../game';
import { Player } from '../player';
import RandomDecider from '../deciders/randomdecider';

class GameConsoleLogger implements EventListener {
    handleEvent(event: GameEvent) {
    }
}

export function runGame() {
    const players = ['Alice', 'Bob'];
    const deciders = players.map(n => new RandomDecider(n));
    const game = new Game(players);
    game.printLog = true;
    game.eventEmitter.addEventListener(new GameConsoleLogger());
    game.completeWithDeciders(deciders);
}

if (require.main === module) {
    runGame();
}