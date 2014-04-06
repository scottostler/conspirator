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

ComputerAI.makeComputerPlayers = function(numPlayers) {
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

ComputerAI.prototype.promptForAction = function(game, playableActions, onAction) {
    this.assertPlayer();
    onAction(_.sample(playableActions));
};

ComputerAI.prototype.promptForBuy = function(game, buyablePiles, allowTreasures, onBuy) {
    this.assertPlayer();

    var treasures = this.player.getTreasuresInHand();
    var that = this;
    var sortedPiles = _.sortBy(buyablePiles, function(p) {
        var index = that.buyList.indexOf(p.card);
        return index === -1 ? that.buyList.length + Math.random() : index;
    });

    var selection = _.head(sortedPiles);
    onBuy(treasures, selection ? selection.card : null);
}

ComputerAI.prototype.promptForGain = function(game, gainablePiles, onGain) {
    this.assertPlayer();
    var selection = _.sample(gainablePiles);
    onGain(selection ? selection.card : null);
};

ComputerAI.prototype.promptForHandSelection = function(game, min, max, cards, onSelect) {
    this.assertPlayer();
    onSelect(_.sample(cards, min));
}

ComputerAI.prototype.promptForCardSelection = function(game, cards, onSelect) {
    this.assertPlayer();
    onSelect(_.shuffle(cards));
};

ComputerAI.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    onDecide(_.sample(decision.options));
}

module.exports = ComputerAI;
