var _ = require('underscore');
var util = require('./util.js');
var game = require('./game.js');
var Cards = require('./cards.js').Cards;
var Player = require('./player.js');
var PlayerInterface = require('./playerinterface.js');
var ai = require('./ai.js');
var GameView = require('./gameview.js').GameView;

window.dominion = {
    debug: false
};

function beginLocalGame() {
    var numPlayers = 2;
    var $canvas = $('#canvas');

    var kingdomCards = game.randomizedKingdomCards([Cards.Menagerie, Cards.Witch], game.NumKingdomCards);
    var humanInterface = new PlayerInterface();
    var humanPlayer = new Player('Player', humanInterface);
    humanInterface.player = humanPlayer;

    var players = [humanPlayer].concat(ai.makeComputerPlayers(numPlayers - 1));

    var gameInstance = new game.Game(players, kingdomCards);
    var gameView = new GameView(gameInstance, 0);

    humanInterface.setGameView(gameView);
    gameInstance.start();

    _.extend(window.dominion, {
        g: gameInstance,
        gv: gameView,
        beginLocalGame: beginLocalGame
    });
}

function beginRemoteGame() {
    var socket = io.connect('http://localhost');
    socket.on('message', function(data) {
        console.log('message', data);
    });

    var $input = $('.message-input input');

    var sendMessage = function() {
        var msg = $input.val();
        $input.val('').blur();
        socket.emit('chat', {
            text: msg
        });
    };

    $('.message-input button').click(sendMessage);
    util.onEnter($input, sendMessage);
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
