import _ = require('underscore');
import $ = require('jquery');

import util = require('./util');
import Game = require('./game');
import Player = require('./player');
import PlayerInterface = require('./playerinterface');
import ai = require('./ai');
import remotegame = require('./remotegame');
import gameview = require('./gameview');
import ChatView = require('./chatview');

window.conspirator = {};

export function beginLocalGame() {
    $('.right-sidebar').addClass('local-game');
    $('.new-game').click(beginLocalGame);

    var numPlayers = 2;
    var $canvas = $('#canvas');

    var humanInterface = new PlayerInterface();
    var humanPlayer = new Player('Player', humanInterface);
    humanInterface.player = humanPlayer;

    var computerPlayers = ai.makeComputerPlayers(numPlayers - 1);
    var players = [humanPlayer].concat(computerPlayers);

    var gameInstance = new Game(players);
    var gameView = new gameview.GameView(gameInstance, 0);

    humanInterface.setGameView(gameView);
    gameInstance.start();

    _.extend(window.conspirator, {
        g: gameInstance,
        gv: gameView,
        beginLocalGame: beginLocalGame
    });
}

export function beginRemoteGame() {
    $('.game-buttons').hide();
    var socket = window.io.connect('/');
    var chatView = new ChatView(socket);

    socket.on('game-init', (state:any) => {
        var humanInterface = new PlayerInterface();
        var remoteGame = new remotegame.RemoteGame(socket, state, humanInterface);
        var gameView = new gameview.GameView(remoteGame, state.playerIndex);
        humanInterface.setGameView(gameView);
    });
}

$(function() {
    if (util.isClient()) {
        beginRemoteGame();
    } else {
        beginLocalGame();
    }
});
