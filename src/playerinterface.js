var _ = require('underscore');
var util = require('./util.js');

/**
 * @constructor
 */
function PlayerInterface() {
};

PlayerInterface.prototype.assertPlayer = function() {
    if (!this.player) {
        console.error('Missing valid player', this);
    }
};

// Must be set before any prompting.
PlayerInterface.prototype.setPlayer = function(player) {
    this.player = player;
};

// This method solves a circular dependency between this and the gameView :(
PlayerInterface.prototype.setGameView = function(gameView) {
    this.gameView = gameView;
};

PlayerInterface.prototype.getGameView = function() {
    return this.gameView;
};

// Prompts

PlayerInterface.prototype.promptForPileSelection = function(game, piles, allowTreasures, allowCancel, onSelect) {
    this.assertPlayer();
    var message = allowTreasures ? 'Choose treasure or buy card' : 'Gain card';
    this.gameView.showStatusMessage(message);

    var that = this;
    this.gameView.offerPileSelection(this.player, piles, allowTreasures, allowCancel, function(card, treasures) {
        if (card) {
            // Auto-play basic treasures when buying.
            var treasures = allowTreasures ? that.player.getBasicTreasuresInHand() : [];
            onSelect(card, treasures);
        } else if (treasures) {
            onSelect(null, treasures);
        } else {
            onSelect(null, []);
        }
    });
};

PlayerInterface.prototype.promptForHandSelection = function(game, min, max, cards, onSelect) {
    this.assertPlayer();
    this.gameView.showStatusMessage(
        'Select ' + util.labelRange(min, max) + ' ' + util.pluralize('card', max));
    this.gameView.offerMultipleHandSelection(this.player, min, max, cards, onSelect);
};

PlayerInterface.prototype.promptForCardOrdering = function(game, cards, onOrder) {
    this.assertPlayer();
    this.gameView.offerCardSelection(this.player, cards, onOrder);
};

PlayerInterface.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    this.gameView.offerOptions(decision.title, decision.options, onDecide);
};

module.exports = PlayerInterface;
