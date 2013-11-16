function PlayerInterface() {

};

// This method solves a circular dependency between this,
// the game, and the gameView. Not ideal...
PlayerInterface.prototype.setGameView = function(gameView) {
    this.gameView = gameView;
};

PlayerInterface.prototype.promptForAction = function(game, playableActions) {
    this.gameView.showStatusMessage('Play an action');

    this.gameView.offerHandSelection(playableActions, function(action) {
        console.log('playing', action.name);
        game.playAction(action);
    });

    this.gameView.offerDoneButton(function() {
        game.advanceGameState(true);
    });
};

PlayerInterface.prototype.promptForBuy = function(game, buyablePiles) {
    this.gameView.showStatusMessage('Buy a card');

    this.gameView.offerPileSelection(buyablePiles, function(treasuresToPlay, pile) {
        _.each(treasuresToPlay, function(card) {
            game.playTreasure(card);
        });
        game.buyFromPile(pile);
    });
    this.gameView.offerDoneButton(function() {
        game.advanceGameState(true);
    });
};