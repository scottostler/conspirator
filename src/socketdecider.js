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

SocketDecider.prototype.promptForPileSelection = function(game, piles, allowTreasures, allowCancel, onSelect) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onSelect;
    this.socket.emit('pile-selection-prompt', serialization.serialize(piles), allowTreasures, allowCancel);
};

SocketDecider.prototype.promptForHandSelection = function(game, min, max, cards, onSelection) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onSelection;
    this.socket.emit('hand-selection-prompt', min, max, serialization.serialize(cards));
};

SocketDecider.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onDecide;
    this.socket.emit('decision-prompt', serialization.serialize(decision));
};

SocketDecider.prototype.promptForCardOrdering = function(game, cards, onOrder) {
    this.assertPlayer();
    this.assertNoCallback();
    this.pendingRequestCallback = onOrder;
    this.socket.emit('card-ordering-prompt', serialization.serialize(cards));
}

module.exports = SocketDecider;