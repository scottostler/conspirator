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

PlayerInterface.prototype.promptForAction = function(game, playableActions, onAction) {
    this.assertPlayer();
    this.gameView.showStatusMessage('Play action');

    this.gameView.offerOptionalSingleHandSelection(this.player, playableActions, function(action) {
        onAction(action);
    });
};

PlayerInterface.prototype.promptForBuy = function(game, buyablePiles, onBuy) {
    this.assertPlayer();
    var message = allowTreasures ? 'Play treasure or buy card' : 'Buy card';
    this.gameView.showStatusMessage(message);

<<<<<<< HEAD
    this.gameView.offerPileSelection(buyablePiles, true, _.bind(function(pile) {
        if (pile) {
            // Player could be a RemotePlayer, with no getTreasuresInHand.
            var treasures = _.filter(this.player.hand, function(c) {
                return c.isTreasure();
            });
            onBuy(treasures, pile);
=======
    var that = this;
    this.gameView.offerPileSelection(this.player, buyablePiles, true, true, function(card, treasures) {
        if (card) {
            // Auto-play basic tresures when buying.
            var treasures = that.player.getBasicTreasuresInHand();
            onBuy(treasures, card);
        } else if (treasures) {
            onBuy(treasures, null);
>>>>>>> 7df4b20... Update for new treasure playing mode
        } else {
            onBuy([], null);
        }
    }, this));
};

PlayerInterface.prototype.promptForGain = function(game, gainablePiles, onGain) {
    this.assertPlayer();
<<<<<<< HEAD
    this.gameView.showStatusMessage('Gain a card');
    this.gameView.offerPileSelection(gainablePiles, false, onGain);
=======
    this.gameView.showStatusMessage('Gain card');
    this.gameView.offerPileSelection(this.player, gainablePiles, false, false, onGain);
>>>>>>> 7df4b20... Update for new treasure playing mode
};

PlayerInterface.prototype.promptForHandSelection = function(game, min, max, cards, verb, onSelect) {
    this.assertPlayer();
    this.gameView.showStatusMessage(
        verb + ' ' + util.labelRange(min, max) + ' ' + util.pluralize('card', max));
    this.gameView.offerMultipleHandSelection(this.player, min, max, cards, onSelect);
};

PlayerInterface.prototype.promptForDiscard = function(game, min, max, cards, onDiscard) {
    this.promptForHandSelection(game, min, max, cards, 'Discard', onDiscard);
};

PlayerInterface.prototype.promptForTrashing = function(game, min, max, cards, onTrash) {
    this.promptForHandSelection(game, min, max, cards, 'Trash', onTrash);
}

PlayerInterface.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    var $modal = $('.choice');
    var $footer = $modal.find('.modal-footer');

    $modal.find('.modal-title').text(decision.title);
    $footer.empty();

    _.each(decision.options, function(option) {
        var label = option._optionString ? option._optionString : option.toString();
        var $button = $('<button>').addClass('btn btn-primary').text(label).click(function() {
            $modal.modal('hide');
            onDecide(option);
        });
        $button.appendTo($footer);
    });

    $modal.modal('show');
};

PlayerInterface.prototype.promptForReaction = function(game, reactions, onReact) {
    this.assertPlayer();
    this.gameView.showStatusMessage('Reveal reaction card');
    this.gameView.offerOptionalSingleHandSelection(this.player, reactions, onReact);
};

module.exports = PlayerInterface;
