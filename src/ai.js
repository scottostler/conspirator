var _ = require('underscore');
var Player = require('./player.js');
var Cards = require('./cards.js').Cards;

/**
 * @constructor
 */
function ComputerAI() {
    this.buyList = [Cards.Spy];
    this.trashList = [Cards.Curse, Cards.Copper];
}

module.exports.ComputerAI = ComputerAI;

module.exports.makeComputerPlayers = function(numPlayers) {
    var computerNames = ['Scott', 'Bob', 'Carlos', 'Douglas'];
    return _.take(computerNames, numPlayers).map(function(name) {
        return new Player(name, new ComputerAI());
    });
}

ComputerAI.prototype.assertPlayer = function() {
    if (!this.player) {
        console.error('Missing valid player', this);
    }
};

// Must be set before any prompting.
ComputerAI.prototype.setPlayer = function(player) {
    this.player = player;
};

ComputerAI.prototype.promptForAction = function(game, playableActions) {
    this.assertPlayer();
    game.playAction(_.sample(playableActions));
};

ComputerAI.prototype.promptForHandSelection = function(game, cards, label, onSelect) {
    this.assertPlayer();
    onSelect(_.sample(cards));
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles) {
    this.assertPlayer();
    _.each(this.player.getTreasuresInHand(), function(card) {
        game.playTreasure(card);
    });

    var that = this;
    var sortedPiles = _.sortBy(buyablePiles, function(p) {
        var index = that.buyList.indexOf(p.card);
        return index === -1 ? that.buyList.length + Math.random() : index;
    });

    game.buyFromPile(_.head(sortedPiles));
}

ComputerAI.prototype.promptForGain = function(game, gainablePiles, onGain) {
    this.assertPlayer();
    onGain(_.sample(gainablePiles));
};

ComputerAI.prototype.promptForDiscard = function(game, min, max, onDiscard) {
    this.assertPlayer();
    onDiscard(_.sample(this.player.hand, min));
};

ComputerAI.prototype.promptForTrashing = function(game, min, max, cards, onTrash) {
    this.assertPlayer();
    onTrash(_.sample(cards, min));
};

ComputerAI.prototype.promptForChoice = function(game, decision, onDecide) {
    this.assertPlayer();
    onDecide(_.sample(decision.options));
}

ComputerAI.prototype.promptForReaction = function(game, reactions, onReact) {
    this.assertPlayer();
    onReact(null);
};
