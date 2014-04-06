var _ = require('underscore');
var Player = require('./player.js');
var Cards = require('./cards.js').Cards;

/**
 * @constructor
 */
function ComputerAI() {
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

ComputerAI.prototype.promptForPileSelection = function(game, piles, allowTreasures, allowCancel, onSelect) {
    var treasures = allowTreasures ? this.player.getTreasuresInHand() : [];
    var selection = _.head(_.shuffle(piles));
    onSelect(selection.card, treasures);
};

ComputerAI.prototype.promptForHandSelection = function(game, min, max, cards, onSelect) {
    this.assertPlayer();
    onSelect(_.sample(cards, min));
}

ComputerAI.prototype.promptForCardOrdering = function(game, cards, onOrder) {
    this.assertPlayer();
    onOrder(_.shuffle(cards));
};

ComputerAI.prototype.promptForDecision = function(game, decision, onDecide) {
    this.assertPlayer();
    onDecide(_.sample(decision.options));
}

module.exports = ComputerAI;
