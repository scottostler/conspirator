// RemoteGame acts as a local proxy for a server-hosted game.

var _ = require('underscore');
var events = require('events');
var util = require('./util.js');
var Cards = require('./cards.js').Cards;
var BasePlayer = require('./baseplayer.js');
var serialization = require('./serialization.js');

function deserializeArguments(args, playerLookupFunc) {
    return serialization.deserialize(_.toArray(args), playerLookupFunc);
}

function serializeArguments(args) {
    return serialization.serialize(_.toArray(args));
}

function RemoteGame(socket, gameState, humanInterface) {
    var that = this;
    this.socket = socket;
    this.gameState = gameState;
    this.humanInterface = humanInterface;

    this.players = _.map(gameState.players, function(playerState) {
        return new RemotePlayer(playerState);
    });
    this.kingdomPileGroups = serialization.deserialize(gameState.kingdomPileGroups);

    if (gameState.playerIndex >= 0) {
        this.humanInterface.player = this.players[gameState.playerIndex];
    }

    var that = this;
    var playerLookupFunc = _.bind(this.lookupAndUpdatePlayer, this);

    var forwardedEvents = [
        'state-update', 'draw-cards', 'empty-play-area', 'trash-card-from-play',
        'trash-cards-from-hand', 'add-card-to-trash', 'play-card', 'gain-card',
        'gain-card-onto-deck', 'gain-card-into-hand', 'discard-cards', 'player-passes-card',
        'draw-and-discard-cards', 'discard-cards-from-deck', 'trash-card-from-deck'];

    _.each(forwardedEvents, function(eventName) {
        socket.on(eventName, function() {
            var eventArgs = deserializeArguments(arguments, playerLookupFunc);
            var emitArgs = [eventName].concat(eventArgs);
            that.emit.apply(that, emitArgs);
        });
    }, this);

    socket.on('game-over', function(rawDecks) {
        var fullDecks = serialization.deserialize(rawDecks);
        _.each(_.zip(that.players, fullDecks), function(p) {
            var player = p[0], deck = p[1];
            player.fullDeck = deck;
        });

        that.emit('game-over');
    });

    this.listenForPrompt('pile-selection-prompt', humanInterface.promptForPileSelection);
    this.listenForPrompt('hand-selection-prompt', humanInterface.promptForHandSelection);
    this.listenForPrompt('decision-prompt', humanInterface.promptForDecision);
    this.listenForPrompt('card-ordering-prompt', humanInterface.promptForCardOrdering);
}

RemoteGame.prototype = Object.create(events.EventEmitter.prototype);

RemoteGame.prototype.emitDecision = function(decisionArgs) {
    var eventArgs = ['decision'].concat(serializeArguments(decisionArgs));
    this.socket.emit.apply(this.socket, eventArgs)
};

RemoteGame.prototype.listenForPrompt = function(prompt, handler) {
    var that = this;
    this.socket.on(prompt, function() {
        var callback = function() {
            that.emitDecision(arguments);
        };

        var args = [that].concat(
            deserializeArguments(arguments),
            [callback]);

        handler.apply(that.humanInterface, args);
    })
};

RemoteGame.prototype.lookupAndUpdatePlayer = function(o) {
    var player = _.find(this.players, function(p) {
        return p.id === o.id;
    });

    if (player) {
        player.updateLocalState(o);
        return player;
    } else {
        console.error('unable to find player')
        return null;
    }

    return player;
};

// RemotePlayer represents what this client knows about this player.
// Since RemoteGame will never ask its players for decisions, no decision
// logic is needed.
function RemotePlayer(playerState) {
    this.id = playerState.id;
    this.name = playerState.name;
    this.updateLocalState(playerState);
    this.fullDeck = null;
};

RemotePlayer.prototype = Object.create(BasePlayer.prototype);

RemotePlayer.prototype.updateLocalState = function(playerState) {
    this.state = playerState;
    this.state.topDiscard = playerState.topDiscard
        ? serialization.deserialize(playerState.topDiscard)
        : null;
    this.hand = serialization.deserialize(playerState.hand);
};

// Abstract methods

RemotePlayer.prototype.getHand = function() {
    return this.hand;
};

RemotePlayer.prototype.getFullDeck = function() {
    if (!this.fullDeck) {
        throw new Error('getFullDeck can only be called when the game is over');
    }

    return this.fullDeck;
};

RemotePlayer.prototype.deckCount = function() {
    return this.state.deckCount;
};

RemotePlayer.prototype.topDiscard = function() {
    return this.state.topDiscard;
};

module.exports = RemoteGame;
