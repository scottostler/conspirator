var crypto = require('crypto');
var uuid = require('node-uuid');
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var _ = require('underscore');
var util = require('./util.js');
var Card = require('./cards.js').Card;
var Cards = require('./cards.js').Cards;
var ComputerAI = require('./ai.js');
var SocketDecider = require('./socketdecider.js');
var Player = require('./player.js');
var game = require('./game.js');
var serialization = require('./serialization.js');

app.use(express.cookieParser());
app.use(express.session({ secret: 'double witch' }));
app.use('/assets', express.static('assets'));

app.get('/bundle.js', function(req, res) {
    res.sendfile('bundle.js');
});

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

var playerCounter = 0;

function collectGameState(game, forPlayer) {
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

function startGame(players) {
    var gameInstance = new game.Game(players, []);

    gameInstance.emit = function(eventName, a, b) {
        var args = _.toArray(arguments);

        _.each(players, function(player) {
            if (player.decider instanceof SocketDecider) {
                // Each player will receive a different state.
                var serializedArgs = serialization.serialize(args, player);
                player.decider.socket.emit.apply(player.decider.socket, serializedArgs)
            }
        });
    };

    _.each(players, function(player) {
        if (player.decider instanceof SocketDecider) {
            player.decider.socket.emit('game-init',
                collectGameState(gameInstance, player));
        }
    });

    gameInstance.start();
}

io.sockets.on('connection', function(socket) {
    var players = [];
    var playerName = 'Player ' + playerCounter++;

    var remoteInterface = new SocketDecider(socket, playerName);
    var player = new Player(playerName, remoteInterface, uuid.v1());

    players.push(player);
    players.push(new Player('Francisco', new ComputerAI(), uuid.v1()));

    socket.emit('log', 'Welcome, ' + playerName);
    socket.broadcast.emit('log', playerName + ' has joined');

    socket.on('chat', function(message) {
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
