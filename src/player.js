function startingDeck() {
    return _.flatten(
        [repeat(Cards.Copper, 7), repeat(Cards.Estate, 3)],
        true);
}

/**
 * @constructor
 */
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
    DiscardCardsFromDeck: 'discard-cards-from-deck',
    PlayCard: 'play-card',
    DrawCards: 'draw-cards',
    TrashCards: 'trash-cards',
    Shuffle: 'shuffle'
};

Player.prototype.shuffleCompletely = function() {
    this.deck = _.shuffle(this.deck.concat(this.discard));
    this.discard = [];
    this.emit(Player.PlayerUpdates.Shuffle);
};

Player.prototype.shuffleKeepingDeckOnTop = function() {
    this.deck = _.shuffle(this.discard).concat(this.deck);
    this.discard = [];
    this.emit(Player.PlayerUpdates.Shuffle);
};

Player.prototype.takeCardsFromDeck = function(num) {
    var cards = [];
    while (cards.length < num
        && (this.deck.length > 0 || this.discard.length > 0)) {

        if (this.deck.length == 0) {
            this.shuffleCompletely();
        }

        cards.push(this.deck.pop());
    }

    return cards;
};

Player.prototype.revealCardsFromDeck = function(n) {
    if (this.deck.length < n) {
        this.shuffleKeepingDeckOnTop();
    }

    return _.last(this.deck, n);
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