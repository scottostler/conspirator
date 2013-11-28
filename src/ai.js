function ComputerAI (player) { 
    this.player = player;
}

ComputerAI.prototype.promptForAction = function(game, playableActions) {
    game.skipActions();
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles) {
    game.skipBuys();
}

ComputerAI.prototype.promptForDiscard = function(game, min, max, onDiscard) {
    var cards = _.sample(this.player.hand, min);

    if (cards.length > 0) {
        game.discardCards(this.player, cards);        
    }

    if (onDiscard) {
        onDiscard(cards);
    }

    game.advanceGameState();
};

ComputerAI.prototype.promptForTrashing = function(game, min, max) {
    if (min > 0) {
        throw new Exception("AI doesn't know how to trash");
    }
    game.advanceGameState();
};