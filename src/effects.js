// Effects implement card effects, and when fully
// processed advance the game state to the next effect or phase.
// As effects may require player decisions and are thus
// asynchronous, they may not immediately advance the game state.

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
            player.discard = player.discard.concat(setAsideCards);
            player.emit(Player.PlayerUpdates.DiscardCardsFromDeck);
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
    _.each(players, _.bind(function(player) {
        this.drawCards(player, num);
    }, this));

    this.emit('stat-update');
    this.advanceGameState();
}

Game.prototype.playerTrashesCardsEffect = function(player, min, max, cardOrType, onTrash) {
    if (arguments.length == 1) {
        max = min;
    }

    var cards = player.getMatchingCardsInHand(cardOrType);
    player.decider.promptForTrashing(this, min, max, cards, _.bind(function(cards) {
        if (cards.length > 0) {
            this.trashCards(player, cards);
        }

        if (onTrash) {
            onTrash(cards);
        }

        this.advanceGameState();
    }, this));
}

Game.prototype.trashCardInPlayEffect = function(card) {
    this.playArea = removeFirst(this.playArea, card);
    this.trash.push(card);
    this.emit('trash-card-from-play', card);
    this.advanceGameState();
};

Game.prototype.inactivePlayersDiscardToEffect = function(num) {
    _.each(reverseCopy(this.inactivePlayers), _.bind(function(player) {
        var numToDiscard = Math.max(0, player.hand.length - num);
        if (numToDiscard > 0) {
            this.eventStack.push(_.bind(function() {
                player.decider.promptForDiscard(this, numToDiscard, numToDiscard, _.bind(function(cards) {
                    if (cards.length > 0) {
                        this.discardCards(player, cards);
                    }

                    this.advanceGameState();
                }, this));
            }, this));
        }
    }, this));

    this.advanceGameState();
};

Game.prototype.playersGainCardsEffect = function(players, cards, ontoDeck) {
    _.each(players, _.bind(function(player) {
        _.each(cards, _.bind(function(card) {
            var pile = this.pileForCard(card);
            if (pile.count > 0) {
                this.playerGainsFromPile(player, pile, ontoDeck);
            }
        }, this));
    }, this));

    this.advanceGameState();
};

Game.prototype.playerChoosesGainedCardEffect = function(player, minCost, maxCost, cardOrType) {
    var gainablePiles = this.filterGainablePiles(minCost, maxCost, cardOrType);
    if (gainablePiles.length > 0) {
        player.decider.promptForGain(this, gainablePiles, _.bind(function(pile) {
            this.playerGainsFromPile(player, pile, false);
            this.advanceGameState();
        }, this));
    } else {
        this.advanceGameState();
    }
};

Game.prototype.playerDiscardsAndDrawsEffect = function(player) {
    player.decider.promptForDiscard(this, 0, player.hand.length, _.bind(function(cards) {
        if (cards.length > 0) {
            this.discardCards(player, cards);
            this.drawCards(player, cards.length);
        }

        this.advanceGameState();
    }, this));
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
    player.decider.promptForChoice(this, decision, _.bind(function(choice) {

        if (choice === Decisions.Options.Yes) {
            player.shuffleCompletely();
        }

        this.advanceGameState();
    }, this));
};

Game.prototype.playersDiscardCardOntoDeckEffect = function(players, cardOrType) {
    _.each(reverseCopy(players), _.bind(function(player) {
        this.eventStack.push(_.bind(function() {
            var cards = Cards.uniq(player.getMatchingCardsInHand(cardOrType));

            if (cards.length > 0) {
                var decision = Decisions.discardCardOntoDeck(this, cards);
                player.decider.promptForChoice(this, decision, _.bind(function(card) {
                    this.discardCards(player, [card], true);
                    this.advanceGameState();
                }, this));
            } else {
                this.revealPlayerHand(player);
                this.advanceGameState();
            }
        }, this));
    }, this));

    this.advanceGameState();
};

Game.prototype.keepOrDiscardTopCardOption = function(choosingPlayer, targetPlayers) {
    _.each(reverseCopy(targetPlayers), _.bind(function(targetPlayer) {
        this.eventStack.push(_.bind(function() {
            var cards = targetPlayer.revealCardsFromDeck(1);
            if (cards.length > 0) {
                var decision = Decisions.keepOrDiscardCard(this, targetPlayer, cards[0]);
                choosingPlayer.decider.promptForChoice(this, decision, _.bind(function(choice) {
                    console.log(choice);
                    if (choice === Decisions.Options.Discard) {
                        this.discardCardsFromDeck(targetPlayer, 1);
                    }

                    this.advanceGameState();
                }, this));
            } else {
                this.advanceGameState();
            }
        }, this));
    }, this));

    this.advanceGameState();
};