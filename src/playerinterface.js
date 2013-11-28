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

    this.gameView.offerPileSelection(buyablePiles, function(treasuresToPlay, pile) {
        _.each(treasuresToPlay, function(card) {
            game.playTreasure(card);
        });
        game.buyFromPile(pile);
    });
    this.gameView.offerDoneButton(function() {
        game.skipBuys();
    });
};

PlayerInterface.prototype.promptForDiscard = function(game, min, max, onDiscard) {
    if (min == max) {
        this.gameView.showStatusMessage('Discard ' + min + ' ' + pluralize('card', min));
    } else if (min == 0) {
        this.gameView.showStatusMessage('Discard up to ' + max + ' ' + pluralize('card', max));
    } else {
        this.gameView.showStatusMessage('Discard ' + min + ' to ' + max + ' cards');
    }
    
    this.gameView.offerMultipleHandSelection(min, max, _.bind(function(cards) {
        if (cards.length > 0) {
            game.discardCards(this.player, cards);
        }

        if (onDiscard) {
            onDiscard(cards);
        }

        game.advanceGameState();
    }, this));
};

PlayerInterface.prototype.promptForTrashing = function(game, min, max) {
    if (min == max) {
        this.gameView.showStatusMessage('Trash ' + min + ' ' + pluralize('card', min));
    } else if (min == 0) {
        this.gameView.showStatusMessage('Trash up to ' + max + ' ' + pluralize('card', max));
    } else {
        this.gameView.showStatusMessage('Trash ' + min + ' to ' + max + ' cards');
    }

    this.gameView.offerMultipleHandSelection(min, max, _.bind(function(cards) {
        if (cards.length > 0) {
            game.trashCards(this.player, cards);
        }
        game.advanceGameState();
    }, this));
}