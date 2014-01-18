var _ = require('underscore');
var events = require('events');
var Card = require('./cards.js').Card;

function BasePlayer() {}

BasePlayer.prototype = Object.create(events.EventEmitter.prototype);

// Abstract methods

BasePlayer.prototype.getHand = function() {
    throw new Error('Unimplemented');
};

BasePlayer.prototype.getFullDeck = function() {
    throw new Error('Unimplemented');
};

BasePlayer.prototype.deckCount = function() {
    throw new Error('Unimplemented');
};

BasePlayer.prototype.topDiscard = function() {
    throw new Error('Unimplemented');
};

// Hand methods

BasePlayer.prototype.getMatchingCardsInHand = function(cardOrType) {
    return _.filter(this.getHand(), function(c) {
        return c.matchesCardOrType(cardOrType);
    });
};

BasePlayer.prototype.getTreasuresInHand = function() {
    return this.getMatchingCardsInHand(Card.Type.Treasure);
};

BasePlayer.prototype.getBasicTreasuresInHand = function() {
    return _.filter(this.hand, function(c) {
        return c.isBasicTreasure();
    });
};

BasePlayer.prototype.getActionsInHand = function() {
    return this.getMatchingCardsInHand(Card.Type.Action);
};

BasePlayer.prototype.getReactionsInHand = function() {
    return this.getMatchingCardsInHand(Card.Type.Reaction);
};


BasePlayer.prototype.calculateScore = function() {
    var that = this;
    var deck = this.getFullDeck();
    var score = _.mapSum(deck, function(card) {
        if (_.has(card, 'vp')) {
            return _.isFunction(card.vp) ? card.vp(deck) : card.vp;
        } else {
            return 0;
        }
    });
    return score;
};


module.exports = BasePlayer;