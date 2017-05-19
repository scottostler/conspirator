import * as _ from 'underscore';
import * as $ from 'jquery';

import Decider from '../decider';
import { Decision } from '../decisions';
import { GameEvent } from '../event';
import Game from '../game';
import { GameRecord } from '../gamerecord';
import { isClient } from '../utils';

import RandomDecider from '../deciders/randomdecider';
import PlayerInterface from './playerinterface';
import { GameView } from './gameview';
import ChatView from './chatview';

interface Window {
    conspirator: any;
    io: any;
}

window.conspirator = {};

const playerIndex = 0;

class LocalGameContainer {
    
    game: Game;
    gameView: GameView;
    playerInterface: PlayerInterface;
    
    constructor() {
        this.game = new Game(['Player', 'Alice']);
        this.gameView = new GameView(GameRecord.fromGame(this.game), playerIndex);
        this.playerInterface = new PlayerInterface(this.gameView); 
        this.game.eventEmitter.addEventListener(this.gameView);
        
        const deciders = [this.playerInterface, new RandomDecider('Goofus')];
        this.game.completeWithDeciders(deciders);
    }

}

class SocketGameContainer {

    gameView: GameView;
    playerInterface: PlayerInterface;
    chatView: ChatView;
    socket: any;

    constructor(socket: any) {
        const chatView = new ChatView();
        socket.on('chat', (msg: string) => {
            chatView.addMessage(msg);
        });

        socket.on('game-init', (state: GameRecord) => {
            this.gameView = new GameView(state, playerIndex);
            this.playerInterface = new PlayerInterface(this.gameView);
        });

        socket.on('game-event', (event: GameEvent) => {
            this.gameView.handleEvent(event);
        });

        socket.on('game-decision', (decision: Decision<any>) => {
            this.playerInterface.decide(decision).then(vals => {
                socket
            });
        });
    }

}

export function beginLocalGame() {
    $('.right-sidebar').addClass('local-game');
    $('.new-game').click(beginLocalGame);
    (<any>window).conspirator = new LocalGameContainer();
}

export function beginRemoteGame() {
    $('.game-buttons').hide();
    const socket = window.io.connect('/');
    (<any>window).conspirator = new SocketGameContainer(socket);
}

$(function() {
    if (isClient()) {
        beginRemoteGame();
    } else {
        beginLocalGame();
    }
});
