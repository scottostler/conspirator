/**
 * @constructor
 */
function ComputerAI (player) { 
    this.player = player;
}

ComputerAI.prototype.promptForAction = function(game, playableActions) {
    game.skipActions();
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles) {
    game.skipBuys();
}

ComputerAI.prototype.promptForGain = function(game, gainablePiles, onGain) {
    onGain(_.pick(gainablePiles));
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
