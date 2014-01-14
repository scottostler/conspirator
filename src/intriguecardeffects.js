var _ = require('underscore');
var util = require('./util.js');
var Game = require('./game.js').Game;
var Card = require('./cards.js').Card;
var Decisions = require('./decisions.js');

Game.prototype.swindlerAttack = function(attackingPlayer, targetPlayers) {
    var that = this;
    _.each(_.reverse(targetPlayers), function(targetPlayer) {
        var attack = function() {
            var card = that.trashCardFromDeck(targetPlayer);
            if (card) {
                var cost = that.computeEffectiveCardCost(card);
                var gainableCards = _.pluck(that.filterGainablePiles(cost, cost, Card.Type.All), 'card');
                if (gainableCards.length > 0) {
                    var decision = Decisions.chooseCardToGain(attackingPlayer, targetPlayer, gainableCards);
                    attackingPlayer.promptForDecision(that, decision, function(gainedCard) {
                        that.playerGainsCard(targetPlayer, gainedCard);
                        that.advanceGameState();
                    });
                } else {
                    that.advanceGameState();
                }
            } else {
                that.advanceGameState();
            }
        };

        that.allowReactionsToAttack(targetPlayer, attack);
    });
};