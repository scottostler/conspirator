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

$(function() {
    if (util.isClient()) {
        $('.game-buttons').hide();
    } else {
        $('.new-game').click(beginLocalGame);
        beginLocalGame();
    }
});
