var _ = require('underscore');
var util = require('./util.js');
var Player = require('./player.js');
var Game = require('./game.js').Game;
var Decisions = require('./decisions.js');
var Cards = require('./cards.js').Cards;

// Effects implement card effects, and when fully
// processed advance the game state to the next effect or phase.
// As effects may require player decisions and are thus
// asynchronous, they don't neccessarily advance the game state.

Game.prototype.skipActions = function() {
    this.activePlayerActionCount = 0;
    this.emit('stat-update');
    this.advanceGameState();
};

Game.prototype.skipBuys = function() {
    this.activePlayerBuyCount = 0;
    this.emit('stat-update');
    this.advanceGameState();
};

Game.prototype.activePlayerGainsCoinsEffect = function(num) {
    this.activePlayerMoneyCount += num;
    this.emit('stat-update');
    this.advanceGameState();
};

Game.prototype.activePlayerGainsActionsEffect = function(num) {
    this.activePlayerActionCount += num;
    this.emit('stat-update');
    this.advanceGameState();
};

Game.prototype.activePlayerGainsBuysEffect = function(num) {
    this.activePlayerBuyCount += num;
    this.emit('stat-update');
    this.advanceGameState();
};

Game.prototype.playerDrawsCardsEffect = function(player, num) {
    this.playersDrawCardsEffect([player], num);
};

Game.prototype.playerDrawsToNCardsAllowingDiscardsEffect = function(player, num, discardableCardOrType) {
    var isDone = function() {
        return !player.canDraw() || player.hand.length >= num;
    };

    var setAsideCards = [];
    var drawCard = _.bind(function() {
        if (isDone()) {
            this.advanceGameState();
            player.addCardsToDiscard(setAsideCards);
            return;
        }

        var card = player.takeCardFromDeck();
        if (card.matchesCardOrType(discardableCardOrType)) {
            var decision = Decisions.drawOrDiscardCard(this, card);
            player.decider.promptForChoice(this, decision, _.bind(function(choice) {
                if (choice === Decisions.Options.Draw) {
                    player.addCardToHand(card);
                } else {
                    setAsideCards.push(card);
                }

                this.eventStack.push(drawCard);
                this.advanceGameState();
            }, this));
        } else {
            player.addCardToHand(card);
            this.eventStack.push(drawCard);
            this.advanceGameState();
        }
    }, this);

    this.eventStack.push(drawCard);
    this.advanceGameState();
};

Game.prototype.playersDrawCardsEffect = function(players, num) {
    var that = this;
    _.each(players, function(player) {
        that.drawCards(player, num);
    });

    this.emit('stat-update');
    this.advanceGameState();
}

Game.prototype.playerTrashesCardsEffect = function(player, min, max, cardOrType, onTrash) {
    if (arguments.length == 1) {
        max = min;
    }

    var that = this;
    var cards = player.getMatchingCardsInHand(cardOrType);

    if (cards.length < min) {
        if (onTrash) {
            onTrash(cards);
        }

        that.advanceGameState();
    } else {
        player.decider.promptForTrashing(this, min, max, cards, function(cards) {
            if (cards.length > 0) {
                that.trashCards(player, cards);
            }

            if (onTrash) {
                onTrash(cards);
            }

            that.advanceGameState();
        });
    }
}

Game.prototype.trashCardInPlayEffect = function(card) {
    // May not be true if a feast was throne-roomed, for example.
    if (_.contains(this.playArea, card)) {
        this.playArea = util.removeFirst(this.playArea, card);
        this.trash.push(card);
        this.emit('trash-card-from-play', card);        
    }
    this.advanceGameState();
};



Game.prototype.inactivePlayersDiscardToAttack = function(num) {
    var that = this;

    _.each(_.reverse(this.inactivePlayers), function(player) {
        var discardAttack = function() {
            var numToDiscard = Math.max(0, player.hand.length - num);
            if (numToDiscard > 0) {
                player.decider.promptForDiscard(that, numToDiscard, numToDiscard, function(cards) {
                    if (cards.length > 0) {
                        that.discardCards(player, cards);
                    }

                    that.advanceGameState();
                });
            } else {
                that.advanceGameState();
            }
        };

        that.eventStack.push(function() {
            that.allowReactionsToAttack(player, discardAttack, false);
        });
    });

    this.advanceGameState();
};

Game.prototype.playersGainCardsEffect = function(players, cards, ontoDeck) {
    var that = this;

    _.each(players, function(player) {
        _.each(cards, function(card) {
            var pile = that.pileForCard(card);
            if (pile.count > 0) {
                that.playerGainsFromPile(player, pile, ontoDeck);
            }
        });
    });

    this.advanceGameState();
};

Game.prototype.playersGainCardsAttack = function(players, cards) {
    var that = this;

    _.each(_.reverse(this.inactivePlayers), function(player) {
        var gainAttack = function() {
            _.each(cards, function(card) {
                var pile = that.pileForCard(card);
                if (pile.count > 0) {
                    that.playerGainsFromPile(player, pile, false);
                }
            });

            that.advanceGameState();
        };

        that.eventStack.push(function() {
            that.allowReactionsToAttack(player, gainAttack, false);
        });
    });

    this.advanceGameState();
};

Game.prototype.playerChoosesGainedCardEffect = function(player, minCost, maxCost, cardOrType) {
    var that = this;
    var gainablePiles = this.filterGainablePiles(minCost, maxCost, cardOrType);
    if (gainablePiles.length > 0) {
        player.decider.promptForGain(this, gainablePiles, function(pile) {
            that.playerGainsFromPile(player, pile, false);
            that.advanceGameState();
        });
    } else {
        this.advanceGameState();
    }
};

Game.prototype.playerDiscardsAndDrawsEffect = function(player) {
    var that = this;
    player.decider.promptForDiscard(this, 0, player.hand.length, function(cards) {
        if (cards.length > 0) {
            that.discardCards(player, cards);
            that.drawCards(player, cards.length);
        }

        that.advanceGameState();
    });
};

Game.prototype.playerDrawsCardTypeEffect = function(player, num, cardOrType) {
    var selectedCards = [];
    var revealedCards = [];

    while (selectedCards.length < num && player.canDraw()) {

        if (player.deck.length == 0) {
            player.deck = _.shuffle(player.discard);
            player.discard = [];
        }

        var card = player.deck.pop();
        if (card.matchesCardOrType(cardOrType)) {
            selectedCards.push(card);
        } else {
            revealedCards.push(card);
        }
    }

    player.hand = player.hand.concat(selectedCards);
    player.discard = player.discard.concat(revealedCards);

    player.emit(Player.PlayerUpdates.DrawCards, selectedCards);
    player.emit(Player.PlayerUpdates.Shuffle);
    this.advanceGameState();
};

Game.prototype.shuffleDiscardIntoDeckOption = function(player) {
    var decision = Decisions.shuffleDiscardIntoDeck(this);
    var that = this;
    player.decider.promptForChoice(this, decision, function(choice) {
        if (choice === Decisions.Options.Yes) {
            player.shuffleCompletely();
            that.log(player.name, 'shuffles discard into deck');
        }

        that.advanceGameState();
    });
};

Game.prototype.playersDiscardCardOntoDeckAttack = function(players, cardOrType) {
    var that = this;

    _.each(_.reverse(players), function(player) {
        that.eventStack.push(function() {
            var discardAttack = function() {
                var cards = Cards.uniq(player.getMatchingCardsInHand(cardOrType));
                if (cards.length > 0) {
                    var decision = Decisions.discardCardOntoDeck(that, cards);
                    player.decider.promptForChoice(that, decision, function(card) {
                        that.discardCards(player, [card], true);
                        that.advanceGameState();
                    });
                } else {
                    that.revealPlayerHand(player);
                    that.advanceGameState();
                }
            };

            that.allowReactionsToAttack(player, discardAttack, false);
        });
    });

    this.advanceGameState();
};

Game.prototype.keepOrDiscardTopCardOptionAttack = function(choosingPlayer, targetPlayers) {
    var that = this;

    _.each(_.reverse(targetPlayers), function(targetPlayer) {
        that.eventStack.push(function() {
            var chooseEffect = function() {
                var cards = targetPlayer.revealCardsFromDeck(1);
                if (cards.length > 0) {
                    var card = cards[0];
                    var decision = Decisions.keepOrDiscardCard(that, targetPlayer, card);
                    choosingPlayer.decider.promptForChoice(that, decision, function(choice) {
                        if (choice === Decisions.Options.Discard) {
                            that.log(choosingPlayer.name, 'discards', util.possessive(targetPlayer.name), card.name);
                            targetPlayer.discardCardsFromDeck(1);
                        } else {
                            that.log(choosingPlayer.name, 'keeps', util.possessive(targetPlayer.name), card.name);
                        }

                        that.advanceGameState();
                    });
                } else {
                    that.advanceGameState();
                }
            };

            if (targetPlayer === choosingPlayer) {
                chooseEffect();
            } else {
                that.allowReactionsToAttack(targetPlayer, chooseEffect, false);
            }
        });
    });

    this.advanceGameState();
};

Game.prototype.trashAndMaybeGainCardsAttack = function(attackingPlayer, targetPlayers, cardOrType, numCards) {
    var that = this;
    var trashedCards = [];

    // TODO: this code is bananas
    this.eventStack.push(function() {
        _.each(_.reverse(trashedCards), function(p) {
            var targetPlayer = p[0], card = p[1];
            that.eventStack.push(function() {
                var decision = Decisions.gainCard(that, card);
                attackingPlayer.decider.promptForChoice(that, decision, function(choice) {
                    if (choice === Decisions.Options.Yes) {
                        attackingPlayer.addCardToDiscard(card);
                        that.log(attackingPlayer.name, 'gains', util.possessive(targetPlayer.name), card.name);
                    } else {
                        that.addCardToTrash(card);
                        that.log(attackingPlayer.name, 'trashes', util.possessive(targetPlayer.name), card.name);
                    }

                    that.advanceGameState();
                });
             });
        });

        that.advanceGameState();
    });

    _.each(_.reverse(targetPlayers), function(targetPlayer) {
        that.eventStack.push(function() {
            var attack = function() {
                var allCards = targetPlayer.takeCardsFromDeck(numCards);
                var matchingCards = _.filter(allCards, function(c) { return c.matchesCardOrType(cardOrType) });
                var nonMatchingCards = _.difference(allCards, matchingCards);

                if (matchingCards.length > 0) {
                    var decision = Decisions.chooseCardToTrash(that, targetPlayer, matchingCards);
                    attackingPlayer.decider.promptForChoice(that, decision, function(choice) {
                        var firstChoice = matchingCards.indexOf(choice);
                        matchingCards.forEach(function(c, i) {
                            if (i === firstChoice) {
                                trashedCards.push([targetPlayer, c]);
                            } else {
                                targetPlayer.addCardToDiscard(c);
                                that.log(attackingPlayer.name, 'discards', util.possessive(targetPlayer.name), c.name);
                            }
                        });

                        if (nonMatchingCards.length > 0) {
                            targetPlayer.addCardsToDiscard(nonMatchingCards);
                            that.log(targetPlayer.name, 'discards', _.pluck(nonMatchingCards, 'name').join(', '));
                        }

                        that.advanceGameState();
                    });
                } else {
                    if (nonMatchingCards.length > 0) {
                        targetPlayer.addCardsToDiscard(nonMatchingCards);
                        that.log(targetPlayer.name, 'discards', _.pluck(nonMatchingCards, 'name').join(', '));
                    }

                    that.advanceGameState();
                }
            };

            that.allowReactionsToAttack(targetPlayer, attack, false);
        });
    });

    this.advanceGameState();
}

Game.prototype.playActionMultipleTimesEffect = function(player, num) {
    var that = this;
    var actions = player.getActionsInHand();
    if (actions.length > 0) {
        this.activePlayer.decider.promptForHandSelection(this, actions, 'Select an action', function(card) {
            player.hand = util.removeFirst(player.hand, card);
            that.playArea.push(card);

            that.log(player.name, 'plays', card.name, num + 'x');

            that.emit(Game.GameUpdate,
                Game.GameUpdates.PlayedCard,
                player.name + ' played ' + card.name,
                player,
                card);

            var cardEvents = _.reverse(_.flatten(util.repeat(card.effects, num))); // in event stack order
            that.eventStack = that.eventStack.concat(cardEvents);
            that.activePlayer.emit(Player.PlayerUpdates.PlayCard, card);

            that.advanceGameState();
        });
    } else {
        this.advanceGameState();
    }
};
