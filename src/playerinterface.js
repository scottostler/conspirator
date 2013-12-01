function PlayerInterface(player) {
    this.player = player;
};

// This method solves a circular dependency between this,
// the game, and the gameView. Not ideal...
PlayerInterface.prototype.setGameView = function(gameView) {
    this.gameView = gameView;
};

PlayerInterface.prototype.promptForAction = function(game, playableActions) {
    this.gameView.showStatusMessage('Play an action');

    this.gameView.offerOptionalSingleHandSelection(playableActions, function(action) {
        if (action) {
            game.playAction(action);
        } else {
            game.skipActions();
        }

    });
};

PlayerInterface.prototype.promptForBuy = function(game, buyablePiles) {
    this.gameView.showStatusMessage('Buy a card');

    this.gameView.offerPileSelection(buyablePiles, true, _.bind(function(pile) {
        if (pile) {
            _.each(this.player.getTreasuresInHand(), _.bind(function(card) {
                game.playTreasure(card);
            }, this));
            game.buyFromPile(pile);
        } else {
            game.skipBuys();
        }
    }, this));
};

PlayerInterface.prototype.promptForGain = function(game, gainablePiles, onGain) {
    this.gameView.showStatusMessage('Gain a card');
    this.gameView.offerPileSelection(gainablePiles, true, onGain);
};

PlayerInterface.prototype.promptForDiscard = function(game, min, max, onDiscard) {
    if (min == max) {
        this.gameView.showStatusMessage('Discard ' + min + ' ' + pluralize('card', min));
    } else if (min == 0) {
        this.gameView.showStatusMessage('Discard up to ' + max + ' ' + pluralize('card', max));
    } else {
        this.gameView.showStatusMessage('Discard ' + min + ' to ' + max + ' cards');
    }
    
    this.gameView.offerMultipleHandSelection(min, max, onDiscard);
};

PlayerInterface.prototype.promptForTrashing = function(game, min, max, cards, onTrash) {
    if (min == max) {
        this.gameView.showStatusMessage('Trash ' + min + ' ' + pluralize('card', min));
    } else if (min == 0) {
        this.gameView.showStatusMessage('Trash up to ' + max + ' ' + pluralize('card', max));
    } else {
        this.gameView.showStatusMessage('Trash ' + min + ' to ' + max + ' cards');
    }


    this.gameView.offerMultipleHandSelection(min, max, cards, onTrash);
}