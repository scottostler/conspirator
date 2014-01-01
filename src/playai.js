var express = require('express');
var game = require('./game.js');
var player = require('./player.js');
var ai = require('./ai.js');
require('./cardeffects.js')

var app = express();

var gameMap = {};

var players = ai.makeComputerPlayers(2);
var g = new game.Game(players);

g.on('log', function(msg) {
    console.log(msg);
});

g.start();
