var _ = require('underscore');
var async = require('async');
var util = require('./util.js');
var Game = require('./game.js').Game;
var Card = require('./cards.js').Card;
var Cards = require('./cards.js').Cards;
var Decisions = require('./decisions.js');

Game.prototype.swindlerAttack = function(attackingPlayer, targetPlayers) {
    var that = this;
    var events = _.map(targetPlayers, function(targetPlayer) {
        return function() {
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
        };
    });

    this.pushGameEvents(events);
    this.advanceGameState();
};

Game.prototype.ironworksEffect = function(player) {
    var that = this;
    var gainableCards = _.pluck(that.filterGainablePiles(0, 4, Card.Type.All), 'card');
    var decision = Decisions.chooseCardToGain(player, player, gainableCards);

    player.promptForDecision(that, decision, function(gainedCard) {
        that.playerGainsCard(player, gainedCard);

        var modified = false;
        if (gainedCard.isAction()) {
            that.incrementActionCount();
            modified = true;
        }

        if (gainedCard.isTreasure()) {
            that.incrementCoinCount();
            modified = true;
        }

        if (gainedCard.isVictory()) {
            that.drawCards(player, 1);
        }

        if (modified) {
            that.stateUpdated();
        }

        that.advanceGameState();
    });
};

Game.prototype.testPlayedActionCount = function(num, effects) {
    if (this.playedActionCount >= num) {
        this.pushGameEvents(effects);
    }

    this.advanceGameState();
};

Game.prototype.increaseCardDiscountBy = function(num) {
    this.cardDiscount += num;
    this.advanceGameState();
};

Game.prototype.increaseCopperValueBy = function(num) {
    this.copperValue += num;
    this.stateUpdated();
    this.advanceGameState();
};

Game.prototype.revealAndDrawOrReorderCards = function(player, num, cardOrType) {
    var that = this;
    var revealedCards = player.takeCardsFromDeck(num);

    this.log(player.name, 'reveals', revealedCards.join(', '));

    var drawnCards = Cards.filter(revealedCards, cardOrType);
    var cardsToOrder = _.difference(revealedCards, drawnCards);

    if (drawnCards.length > 0) {
        this.drawTakenCards(player, drawnCards, true);
    }

    if (cardsToOrder.length > 0) {
        player.promptForCardOrdering(this, cardsToOrder, function(cards) {
            that.putCardsOnDeck(player, cards);
            that.advanceGameState();
        });
    } else {
        this.advanceGameState();
    }

};

Game.prototype.masqueradeEffect = function(activePlayer, otherPlayers) {
    var that = this;

    function promptForMasquerade(player, callback) {
        if (player.hand.length == 0) {
            callback(null, [player, null]);
        } else {
            player.promptForHandSelection(this, 1, 1, player.hand, function(cards) {
                callback(null, [player, cards[0]]);
            });
        }
    };

    async.map(this.players, promptForMasquerade, function(err, results) {
        results.forEach(function(p) {
            var player = p[0], card = p[1];
            if (card) {
                var nextPlayer = that.playerLeftOf(player);
                that.playerPassesCard(player, nextPlayer, card);
            }
        });

        that.playerTrashesCardsEffect(activePlayer, 0, 1, Card.Type.All);
    });
};

Game.prototype.wishForCardReveal = function(player) {
    var that = this;
    player.promptForCardNaming(this, function(card) {
        that.log(player.name, 'wishes for', card.name);
        var revealedCard = player.revealCardFromDeck();
        if (revealedCard) {
            that.log(player.name, 'reveals', revealedCard);
            if (card.name === revealedCard.name) {
                that.drawCards(player, 1);
            }
        } else {
            that.log(player.name, 'has no cards to reveal');
        }

        that.advanceGameState();
    });
};

Game.prototype.playersChooseEffectAttack = function(targetPlayers, effects) {
    var that = this;
    var events = _.map(targetPlayers, function(player) {
        return function() {
            player.promptForEffectChoice(that, effects);
        };
    });

    this.pushGameEvents(events);
    this.advanceGameState();
};

Game.prototype.tributeEffect = function(player, targetPlayer) {
    var cards = Cards.uniq(this.discardCardsFromDeck(targetPlayer, 2));
    var drawnCards = 0;
    var gainedActions = 0;
    var gainedCoins = 0;
    _.each(cards, function(card) {
        if (card.isAction()) {
            gainedActions += 2;
        }

        if (card.isTreasure()) {
            gainedCoins += 2;
        }

        if (card.isVictory()) {
            drawnCards += 2;
        }
    }, this);

    if (drawnCards > 0) {
        this.drawCards(player, drawnCards);
    }

    if (gainedActions > 0) {
        this.log(player.name, 'gains ' + gainedActions + ' actions');
        this.incrementActionCount(gainedActions);
    }

    if (gainedCoins > 0) {
        this.log(player.name, 'gains ' + gainedCoins + ' coins');
        this.incrementCoinCount(gainedCoins);
    }

    this.advanceGameState();
};
