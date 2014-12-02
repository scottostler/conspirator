import _ = require('underscore');
import util = require('../util');
import cards = require('../cards');
import Player = require('../player');
import ai = require('../ai');
import Game = require('../game');
import socketdecider = require('./socketdecider');
import serialization = require('./serialization');

declare function require(name:string):any;
declare var process:any;

var crypto = require('crypto');
var http = require('http');
var express = require('express');
var socketIo = require('socket.io');

var app = express()
var server = http.createServer(app)
var io = socketIo.listen(server);

app.use(express.cookieParser());
app.use(express.session({ secret: 'double jack' }));
app.use('/assets', express.static('assets'));

app.get('/', (req:any, res:any) => {
    res.sendfile('index.html');
});

var playerCounter = 0;

function collectGameState(game:Game, forPlayer:Player) {
    var playerIndex = game.players.indexOf(forPlayer);
    var players = game.players.map(function(p) {
        return serialization.serialize(p, forPlayer);
    });

    return {
        players: players,
        kingdomPileGroups: serialization.serialize(game.kingdomPileGroups),
        trash: serialization.serialize(game.trash),
        playerIndex: playerIndex
    };
}

function startGame(players:Player[]) {
    var gameInstance = new Game(players, []);
    // TODO
    // gameInstance.emit = function(eventName) {
    //     var args = _.toArray(arguments);

    //     _.each(players, function(player) {
    //         if (player.decider instanceof SocketDecider) {
    //             // Each player will receive a different state.
    //             var serializedArgs = serialization.serialize(args, player);
    //             player.decider.socket.emit.apply(player.decider.socket, serializedArgs)
    //         }
    //     });
    // };

    // _.each(players, function(player) {
    //     if (player.decider instanceof SocketDecider) {
    //         player.decider.socket.emit('game-init',
    //             collectGameState(gameInstance, player));
    //     }
    // });

    gameInstance.start();
}

var players:Player[] = [];
io.sockets.on('connection', (socket:any) => {
    var playerName = 'Player ' + playerCounter++;

    var remoteInterface = new socketdecider.SocketDecider(socket);
    var player = new Player(playerName, remoteInterface);

    players.push(player);

    socket.emit('log', 'Welcome, ' + playerName);
    socket.broadcast.emit('log', playerName + ' joins');

    socket.on('chat', function(message:any) {
        socket.broadcast.emit('chat', {
            name: playerName,
            message: message.text
        });
    });

    if (players.length === 2) {
        startGame(players);
    }
});

var port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on ' + port);
