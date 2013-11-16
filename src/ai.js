function ComputerAI () { 
}


ComputerAI.prototype.promptForAction = function(game, playableActions) {
    game.advanceGameState(true);
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles) {
    game.advanceGameState(true);
}