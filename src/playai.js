var game = require('./game.js');
var ComputerAI = require('./ai.js');

var players = ComputerAI.makeComputerPlayers(2);
var g = new game.Game(players);

g.on('log', function(msg) {
    console.log(msg);
});

g.start();
