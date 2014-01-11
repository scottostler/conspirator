// SocketDecider proxies decisions to a connected socketio client.

var _ = require('underscore');
var util = require('./util.js');
var Cards = require('./cards.js').Cards;
var serialization = require('./serialization.js');

function SocketDecider(socket, state) {
    this.id = state.id;
    this.name = state.name;
    this.state = state;
    this.socket = socket;
    this.pendingRequestCallback = null;

    var that = this;
    this.socket.on('decision', function() {
        if (!that.pendingRequestCallback) {
            console.error('Error: decision made with no pending callback');
            return;
        }

        // Decisions don't return players, so no lookup func.
        var callbackArgs = serialization.deserialize(_.toArray(arguments));

        // Clear before invoking.
        var callback = that.pendingRequestCallback;
        that.pendingRequestCallback = null;
        callback.apply(null, callbackArgs);
    })
};

// Must be set before any prompting.
SocketDecider.prototype.setPlayer = function(player) {
    this.player = player;
};

SocketDecider.prototype.assertPlayer = function() {
    if (!this.player) {
        console.error('Missing valid player', this);
    }
};

// When a SocketDecider is asked to make a decision, the
// callback is saved until the player responds via the socket.
// As players can only make one decision at a time,
// at most one callback should be stored.
SocketDecider.prototype.assertNoCallback = function() {
    if (this.pendingRequestCallback) {
        console.error('SocketDecider already has a stored callback', this.pendingRequestCallback);
    }
};

// Prompts

SocketDecider.prototype.promptForAction = function(game, playableActions, onAction) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onAction;
    this.socket.emit('action-prompt', serialization.serialize(playableActions));
};

SocketDecider.prototype.promptForBuy = function(game, buyablePiles, allowTreasures, onBuy) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onBuy;
    this.socket.emit('buy-prompt', serialization.serialize(buyablePiles), allowTreasures);
};

SocketDecider.prototype.promptForGain = function(game, gainablePiles, onGain) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onGain;
    this.socket.emit('gain-prompt', serialization.serialize(gainablePiles));
};

SocketDecider.prototype.promptForDiscard = function(game, min, max, cards, onDiscard) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onDiscard;
    this.socket.emit('discard-prompt', min, max, serialization.serialize(cards));
};

SocketDecider.prototype.promptForTrashing = function(game, min, max, cards, onTrash) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onTrash;
    this.socket.emit('trash-prompt', min, max, serialization.serialize(cards));
}

SocketDecider.prototype.promptForReaction = function(game, reactions, onReact) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onReact;
    this.socket.emit('reaction-prompt', serialization.serialize(reactions));
};

SocketDecider.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onDecide;
    this.socket.emit('decision-prompt', serialization.serialize(decision));
};

module.exports = SocketDecider;