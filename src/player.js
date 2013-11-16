function startingDeck() {
    return _.flatten(
        [repeat(Cards.Copper, 7), repeat(Cards.Estate, 3)],
        true);
}

function Player(name, decider) {
    this.name = name;
    this.hand = [];

    // Card stacks store their bottom-most card at index 0.
    this.deck = _.shuffle(startingDeck());
    this.discard = [];

    this.decider = decider;
}

Player.prototype = new EventEmitter();

Player.prototype.getTreasuresInHand = function() {
    return _.filter(this.hand, function(c) {
        return c.isTreasure();
    });
};

Player.prototype.discardCard = function(card) {
    this.discard.push(card);
    this.hand = removeFirst(this.hand, card);
    this.emit('discard', [card]);
};

Player.prototype.playedCard = function(card) {
    this.hand = removeFirst(this.hand, card);
    this.emit('played', [card]);
};

Player.prototype.discardHand = function(game) {
    var oldHand = this.hand;
    this.discard = this.discard.concat(this.hand);
    this.hand = [];
    this.emit('discard', oldHand);
};

Player.prototype.drawCards = function(game, num) {
    var drawn = [];
    _.range(num).forEach(_.bind(function(i) {
        if (this.deck.length === 0 && this.discard.length > 0) {
            this.deck = _.shuffle(this.discard);
            this.discard = [];
        }

        if (this.deck.length > 0) {
            var card = this.deck.pop();
            this.hand.push(card);
            drawn.push(card);
        }
    }, this));

    this.emit('draw', drawn);

    return drawn;
};

Player.prototype.promptForAction = function(game, playableActions) {
    this.decider.promptForAction(game, playableActions);
};

Player.prototype.promptForBuy = function(game, buyablePiles) {
    this.decider.promptForBuy(game, buyablePiles);
};
