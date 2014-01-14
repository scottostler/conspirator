var _ = require('underscore');
var util = require('./util.js');
var game = require('./game.js');
var Cards = require('./cards.js').Cards;
var Player = require('./player.js');
var PlayerInterface = require('./playerinterface.js');
var ComputerAI = require('./ai.js');
var RemoteGame = require('./remotegame.js');
var GameView = require('./gameview.js').GameView;
var ChatView = require('./chatview.js');

window.conspirator = {
    debug: false
};

function beginLocalGame() {
    var numPlayers = 2;
    var $canvas = $('#canvas');

    var humanInterface = new PlayerInterface();
    var humanPlayer = new Player('Player', humanInterface);
    humanInterface.player = humanPlayer;

    var computerPlayers = ComputerAI.makeComputerPlayers(numPlayers - 1);
    var players = [humanPlayer].concat(computerPlayers);

    var gameInstance = new game.Game(players, [Cards.ThroneRoom, Cards.Conspirator]);
    var gameView = new GameView(gameInstance, 0);

    humanInterface.setGameView(gameView);
    gameInstance.start();

    _.extend(window.conspirator, {
        g: gameInstance,
        gv: gameView,
        beginLocalGame: beginLocalGame
    });
}

function beginRemoteGame() {
    var socket = io.connect('/');
    var chatView = new ChatView(socket);

    socket.on('game-init', function(state) {
        var humanInterface = new PlayerInterface();
        var remoteGame = new RemoteGame(socket, state, humanInterface);
        var gameView = new GameView(remoteGame, state.playerIndex);
        humanInterface.setGameView(gameView);
    });
}

$(function() {
    if (util.isClient()) {
        $('.game-buttons').hide();
        beginRemoteGame();
    } else {
        $('.right-sidebar').addClass('local-game');
        $('.new-game').click(beginLocalGame);
        beginLocalGame();
    }
});
