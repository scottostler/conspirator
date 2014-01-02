var game = require('./game.js');
var player = require('./player.js');
var ai = require('./ai.js');

var players = ai.makeComputerPlayers(2);
var g = new game.Game(players);

g.on('log', function(msg) {
    console.log(msg);
});

g.start();
