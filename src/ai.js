/**
 * @constructor
 */
function ComputerAI(player) { 
    this.player = player;
    this.buyList = [Cards.Witch, Cards.Spy, Cards.Bureaucrat, Cards.Militia];
    this.trashList = [Cards.Curse, Cards.Copper];
}

ComputerAI.prototype.promptForAction = function(game, playableActions) {
    game.playAction(_.sample(playableActions));
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles) {
    _.each(this.player.getTreasuresInHand(), function(card) {
        game.playTreasure(card);
    });

    var that = this;
    var sortedPiles = _.sortBy(buyablePiles, function(p) {
        var index = that.buyList.indexOf(p.card);
        return index === -1 ? Infinity : index;
    });

    game.buyFromPile(_.head(sortedPiles));
}

ComputerAI.prototype.promptForGain = function(game, gainablePiles, onGain) {
    onGain(_.sample(gainablePiles));
};

ComputerAI.prototype.promptForDiscard = function(game, min, max, onDiscard) {
    onDiscard(_.sample(this.player.hand, min));
};

ComputerAI.prototype.promptForTrashing = function(game, min, max, cards, onTrash) {
    if (min > 0) {
        throw new Error("AI doesn't know how to trash");
    }
    onTrash([]);
};

ComputerAI.prototype.promptForChoice = function(game, decision, onDecide) {
    onDecide(_.sample(decision.options));
}

ComputerAI.prototype.promptForReaction = function(game, reactions, onReact) {
    onReact(null);
};
