var _ = require('underscore');
var util = require('./util.js');
var Player = require('./player.js');
var Game = require('./game.js').Game;
var Decisions = require('./decisions.js');
var Card = require('./cards.js').Card;
var Cards = require('./cards.js').Cards;

// Kingdom cards are modelled as a sequence of effects,
// which modify the game state, process player decisions,
// and potentially cause more effects to be processed by adding
// more effects onto the stack of effects.
// When an effect is resolved, it advances the game to
// the process the next effect or phase by calling Game.advanceGameState.
//
// As effects may require player decisions and are thus
// asynchronous, many don't immediately advance the game state.
// Instead, the game state is advanced when a callback is invoked.

Game.prototype.skipActions = function() {
    this.activePlayerActionCount = 0;
    this.stateUpdated();
    this.advanceGameState();
};

Game.prototype.skipBuys = function() {
    this.activePlayerBuyCount = 0;
    this.stateUpdated();
    this.advanceGameState();
};

Game.prototype.activePlayerGainsCoinsEffect = function(num) {
    this.activePlayerCoinCount += num;
    this.stateUpdated();
    this.advanceGameState();
};

Game.prototype.activePlayerGainsActionsEffect = function(num) {
    this.activePlayerActionCount += num;
    this.stateUpdated();
    this.advanceGameState();
};

Game.prototype.activePlayerGainsBuysEffect = function(num) {
    this.activePlayerBuyCount += num;
    this.stateUpdated();
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
    var drawCardEvent = _.bind(function() {
        if (isDone()) {
            if (setAsideCards.length > 0) {
                this.addCardsToDiscard(player, setAsideCards);
            }
            this.advanceGameState();
            return;
        }

        var card = player.takeCardFromDeck();
        if (card.matchesCardOrType(discardableCardOrType)) {
            var decision = Decisions.drawOrDiscardCard(this, card);
            player.promptForDecision(this, decision, _.bind(function(choice) {
                if (choice === Decisions.Options.Draw) {
                    this.drawTakenCard(player, card);
                } else {
                    setAsideCards.push(card);
                }

                this.pushGameEvent(drawCardEvent);
                this.advanceGameState();
            }, this));
        } else {
            this.drawTakenCard(player, card);
            this.pushGameEvent(drawCardEvent);
            this.advanceGameState();
        }
    }, this);

    this.pushGameEvent(drawCardEvent);
    this.advanceGameState();
};

Game.prototype.playersDrawCardsEffect = function(players, num) {
    _.each(players, function(player) {
        this.drawCards(player, num);
    }, this);

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
        player.promptForTrashing(this, min, max, cards, function(cards) {
            if (onTrash) {
                onTrash(cards);
            }

            that.advanceGameState();
        });
    }
}

Game.prototype.trashCardInPlayEffect = function(card) {
    this.trashCardFromPlay(card);
    this.advanceGameState();
};

Game.prototype.inactivePlayersDiscardToAttack = function(num) {
    var that = this;

    _.each(_.reverse(this.inactivePlayers), function(player) {
        var discardAttack = function() {
            var numToDiscard = Math.max(0, player.hand.length - num);
            if (numToDiscard > 0) {
                player.promptForDiscard(that, numToDiscard, numToDiscard, player.hand, function(cards) {
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
                that.playerGainsCard(player, card, ontoDeck);
            }
        });
    });

    this.advanceGameState();
};

Game.prototype.playerGainsCardEffect = function(player, card) {
    this.playersGainCardsEffect([player], [card]);
}

Game.prototype.playersGainCardsAttack = function(players, cards) {
    var that = this;

    _.each(_.reverse(players), function(player) {
        var gainAttack = function() {
            _.each(cards, function(card) {
                var pile = that.pileForCard(card);
                if (pile.count > 0) {
                    that.playerGainsCard(player, card, false);
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

Game.prototype.playersDiscardCardJesterAttack = function(attackingPlayer, targetPlayers) {
    var that = this;

    _.each(_.reverse(targetPlayers), function(targetPlayer) {
        var gainAttack = function() {
            var pile = that.pileForCard(Cards.Curse);
            if (pile.count > 0) {
                that.playerGainsCard(targetPlayer, Cards.Curse, false);
            }
            that.advanceGameState();
        };

        var chooseEffect = function() {
            var card = targetPlayer.discardCardFromDeck();
            var pile = that.pileForCard(card);

            if (card) {
                that.log(targetPlayer.name, 'discards', card.name);
            }

            if (card && card.isVictory()) {
                gainAttack();
            } else if (card && pile.count > 0) {
                var decision = Decisions.gainCard(that, card);
                attackingPlayer.promptForDecision(that, decision, function(choice) {
                    if (choice === Decisions.Options.Yes) {
                        that.playerGainsCard(attackingPlayer, card, false);
                    } else {
                        that.playerGainsCard(targetPlayer, card, false);
                    }
                    that.advanceGameState();
                });
            } else {
                that.advanceGameState();
            }
        };
        that.eventStack.push(function() {
            that.allowReactionsToAttack(targetPlayer, chooseEffect, false);
        });
    });

    this.advanceGameState();
};

Game.prototype.playerChoosesGainedCardEffect = function(player, minCost, maxCost, cardOrType, intoHand, onGain) {
    var that = this;
    var gainablePiles = this.filterGainablePiles(minCost, maxCost, cardOrType);
    if (gainablePiles.length > 0) {
        player.promptForGain(this, gainablePiles, function(card) {
            if (intoHand) {
                that.playerGainsCard(player, card, false, true);
            } else {
                that.playerGainsCard(player, card, false, false);
            }

            if (onGain) {
                onGain(card);
            }

            that.advanceGameState();
        });
    } else {
        this.advanceGameState();
    }
};

Game.prototype.playerDiscardsAndDrawsEffect = function(player) {
    var that = this;
    player.promptForDiscard(this, 0, player.hand.length, player.hand, function(cards) {
        if (cards.length > 0) {
            that.drawCards(player, cards.length);
        }

        that.advanceGameState();
    });
};

Game.prototype.playerDiscardCardForEffect = function(player, cardOrType, effect, altEffect) {
    var that = this;
    var matchingCards = player.getMatchingCardsInHand(cardOrType);

    if (matchingCards.length > 0) {
        player.promptForDiscard(this, 0, 1, matchingCards, function(cards) {
            if (cards.length > 0) {
                effect(that, that.activePlayer, that.inactivePlayers);
            } else if (altEffect) {
                altEffect(that, that.activePlayer, that.inactivePlayers);
            } else {
                that.advanceGameState();
            }
        });
    } else if (altEffect) {
        altEffect(this, this.activePlayer, this.inactivePlayers);
    } else {
        this.advanceGameState();
    }
};

Game.prototype.playerDrawsCardTypeEffect = function(player, num, cardOrType) {
    var selectedCards = [];
    var revealedCards = [];

    while (selectedCards.length < num && player.canDraw()) {
        var card = player.takeCardFromDeck();
        if (card.matchesCardOrType(cardOrType)) {
            selectedCards.push(card);
        } else {
            revealedCards.push(card);
        }
    }

    this.drawAndDiscardFromDeck(player, selectedCards, revealedCards);
    this.advanceGameState();
};

Game.prototype.shuffleDiscardIntoDeckOption = function(player) {
    var decision = Decisions.shuffleDiscardIntoDeck(this);
    var that = this;
    player.promptForDecision(this, decision, function(choice) {
        if (choice === Decisions.Options.Yes) {
            player.shuffleCompletely();
            that.log(player.name, 'shuffles discard into deck');
        }

        that.advanceGameState();
    });
};

Game.prototype.playerDiscardCardOntoDeckEffect = function(player) {
    var that = this;
    if (player.hand.length > 0) {
        var decision = Decisions.discardCardOntoDeck(that, Cards.uniq(player.hand));
        player.promptForDecision(that, decision, function(card) {
            that.discardCards(player, [card], true);
            that.advanceGameState();
        });
    } else {
        that.advanceGameState();
    }
};


Game.prototype.playerDiscardsUniqueCardsForCoins = function(player, num) {
    var cards = player.revealCardsFromDeck(num);
    var coins = Cards.uniq(cards).length;
    this.discardCardsFromDeck(player, num);
    this.activePlayerGainsCoinsEffect(coins);
};

Game.prototype.playersDiscardCardOntoDeckAttack = function(players, cardOrType) {
    var that = this;

    var events = _.map(players, function(player) {
        return function() {
            var discardAttack = function() {
                var cards = Cards.uniq(player.getMatchingCardsInHand(cardOrType));
                if (cards.length > 0) {
                    var decision = Decisions.discardCardOntoDeck(that, cards);
                    player.promptForDecision(that, decision, function(card) {
                        that.discardCards(player, [card], true);
                        that.advanceGameState();
                    });
                } else {
                    that.revealPlayerHand(player);
                    that.advanceGameState();
                }
            };

            that.allowReactionsToAttack(player, discardAttack, false);
        };
    });

    this.pushGameEvents(events);
    this.advanceGameState();
};

Game.prototype.playersDiscardExceptCurseOrVictoryAttack = function(players) {
    var that = this;

    _.each(_.reverse(players), function(player) {
        that.eventStack.push(function() {
            var revealEffect = function() {
                var numToDiscard = 0;
                var numCardsExpected = 1;
                var cards = player.revealCardsFromDeck(numCardsExpected);
                if (cards.length === numCardsExpected) {
                    that.log(player.name, 'reveals', cards[0].name);
                    while (!(cards[0].isVictory() || cards[0].isCurse())) {
                        numToDiscard++;
                        numCardsExpected++;
                        cards = player.revealCardsFromDeck(numCardsExpected);
                        if(cards.length !== numCardsExpected) break;
                        that.log(player.name, 'reveals', cards[0].name);
                    }
                    player.discardCardsFromDeck(numToDiscard);
                }
                that.advanceGameState();
            };

            that.allowReactionsToAttack(player, revealEffect, false);
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
                    choosingPlayer.promptForDecision(that, decision, function(choice) {
                        if (choice === Decisions.Options.Discard) {
                            that.log(choosingPlayer.name, 'discards', util.possessive(targetPlayer.name), card.name);
                            targetPlayer.discardCardFromDeck();
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

    // TODO: this code is bananas – B-A-N-A-N-A-S
    this.pushGameEvent(function() {
        _.each(_.reverse(trashedCards), function(p) {
            var targetPlayer = p[0], card = p[1];
            that.eventStack.push(function() {
                var decision = Decisions.gainCard(that, card);
                attackingPlayer.promptForDecision(that, decision, function(choice) {
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

    var events = _.map(targetPlayers, function(targetPlayer) {
        return function() {
            var attack = function() {
                var allCards = targetPlayer.takeCardsFromDeck(numCards);
                var matchingCards = _.filter(allCards, function(c) { return c.matchesCardOrType(cardOrType) });
                var nonMatchingCards = _.difference(allCards, matchingCards);

                if (matchingCards.length > 0) {
                    var decision = Decisions.chooseCardToTrash(that, targetPlayer, matchingCards);
                    attackingPlayer.promptForDecision(that, decision, function(choice) {
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
        };
    });

    this.pushGameEvents(events);
    this.advanceGameState();
}

Game.prototype.playActionMultipleTimesEffect = function(player, num) {
    var that = this;
    var actions = player.getActionsInHand();
    if (actions.length > 0) {
        var decision = Decisions.playAction(this, player, actions);
        player.promptForDecision(this, decision, function(card) {
            that.playActionMultipleTimes(card, num);
            that.advanceGameState();
        });
    } else {
        this.advanceGameState();
    }
};

Game.prototype.revealAndTestHandEffect = function(test, trueEffect, falseEffect) {
    if (test(this.activePlayer.hand)) {
        trueEffect(this, this.activePlayer, this.inactivePlayers);
    } else if (falseEffect) {
        falseEffect(this, this.activePlayer, this.inactivePlayers);
    } else {
        this.advanceGameState();
    }
};

Game.prototype.playerChoosesNEffects = function(player, n, effects) {
    var that = this;
    var otherPlayers = this.playersAsideFrom(player);
    var remainingEffects = effects;

    var promptChoice = function() {
        var decision = Decisions.chooseEffect(this, player, remainingEffects);
        player.promptForDecision(this, decision, function(effect) {
            remainingEffects = util.removeFirst(remainingEffects, effect);
            that.log(player.name, 'chooses', effect._optionString);
            effect(that, player, otherPlayers);
        });
    };

    var events = util.repeat(promptChoice, n);
    this.pushGameEvents(events);
    this.advanceGameState();
};

Game.prototype.playerDrawForUniqueCard = function(player) {
    this.revealPlayerHand(player);

    var discardedCards = [];
    var drawnCard = player.takeCardFromDeck();
    while (drawnCard && _.contains(player.hand, drawnCard)) {
        discardedCards.push(drawnCard);
        drawnCard = player.takeCardFromDeck();
    }

    var drawnCardArray = drawnCard ? [drawnCard] : [];
    this.drawAndDiscardFromDeck(player, drawnCardArray, discardedCards);

    this.advanceGameState();
};

Game.prototype.playerGainCardTrashVP = function(player) {
    var cards = this.playArea;
    var minCost = 0;
    var maxCost = Cards.uniq(cards).length;
    var that = this;

    this.playerChoosesGainedCardEffect(player, minCost, maxCost, Card.Type.All, false, function(card) {
        if (card.isVictory()) {
            that.trashCardFromPlay(Cards.HornOfPlenty);
        }
    });
};
