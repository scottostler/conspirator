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
