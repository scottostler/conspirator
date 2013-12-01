function startingDeck() {
    return _.flatten(
        [repeat(Cards.Copper, 7), repeat(Cards.Estate, 3)],
        true);
}

function Player(name, decider) {
    this.name = name;
    this.decider = decider;
    this.hand = [];

    // Card stacks store their bottom-most card at index 0.
    this.deck = _.shuffle(startingDeck());
    this.discard = [];
}

Player.prototype = new EventEmitter();

Player.PlayerUpdates = {
    DiscardCards: 'discard-cards',
    PlayCard: 'play-card',
    DrawCards: 'draw-cards',
    TrashCards: 'trash-cards'
};

Player.prototype.getTreasuresInHand = function() {
    return _.filter(this.hand, function(c) {
        return c.isTreasure();
    });
};

Player.prototype.getActionsInHand = function() {
    return _.filter(this.hand, function(c) {
        return c.isAction();
    });
};

Player.prototype.getFullDeck = function() {
    return this.hand.concat(this.deck, this.discard);
};

Player.prototype.calculateScore = function() {
    var score = _.mapSum(this.getFullDeck(), _.bind(function(card) {
        return _.has(card, 'vp') ? card.vp : 0;
    }, this));
    return score;
};

Player.prototype.getMatchingCardsInHand = function(cardOrType) {
    return _.filter(this.hand, function(c) {
        return c.matchesCardOrType(cardOrType);
    });
};