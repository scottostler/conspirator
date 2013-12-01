var NumKingdomCards = 10;

function Game(kingdomCards, players, opts) {
    this.activePlayerIndex = -1;
    this.turnIndex = -1;
    this.players = players;

    this.playArea = [];
    this.eventStack = [];

    var sortedKingdomCards = _.sortBy(kingdomCards, 'cost');

    this.kingdomPileGroups = [];
    this.kingdomPileGroups.push(sortedKingdomCards.map(function(card) {
        return { card: card, count: NumKingdomCards };
    }));

    var victoryCardCount = this.players.length == 2 ? 8 : 12;
    var curseCount = (this.players.length - 1) * 10;

    this.kingdomPileGroups.push([
        { card: Cards.Estate,   count: victoryCardCount },
        { card: Cards.Duchy,    count: victoryCardCount },
        { card: Cards.Province, count: victoryCardCount },
        { card: Cards.Copper,   count: 99, hideBadge: true },
        { card: Cards.Silver,   count: 99, hideBadge: true},
        { card: Cards.Gold,     count: 99, hideBadge: true }
    ]);

    this.kingdomPileGroups.push([{ card: Cards.Curse, count: curseCount }]);
    this.kingdomPiles = _.flatten(this.kingdomPileGroups);
    this.trash = [];
};

Game.TurnState = {
    Action: 'action',
    Buy: 'buy',
    Cleanup: 'cleanup'
};

Game.GameUpdate = 'game-update';

Game.GameUpdates = {
    NextTurn: 'next-turn',
    PlayedCard: 'played-card',
    BoughtCard: 'bought-card',
    GainedCard: 'gained-card',
    CleanedUp: 'cleaned-up',
    GameOver: 'game-over'
};

Game.prototype = new EventEmitter();

Game.prototype.drawInitialHands = function() {
    this.players.forEach(_.bind(function(player) {
        this.drawCards(player, 5);
    }, this));
};

// Turn advancement and game state

Game.prototype.checkEndgame = function() {
    var provincePile = this.pileForCard(Cards.Province);
    if (provincePile.count == 0) {
        return true;
    }

    var emptyCount = _.mapSum(this.kingdomPiles, function(pile) {
        return pile.count == 0 ? 1 : 0;
    });

    if (emptyCount >= 3) {
        return true;
    }

    return false;
};

Game.prototype.advanceTurn = function() {
    if (this.checkEndgame()) {
        alert('The game is over!');
        return true;
    }

    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.activePlayer = this.players[this.activePlayerIndex];
    this.inactivePlayers = this.players.slice(this.activePlayerIndex + 1).concat(
        this.players.slice(0, this.activePlayerIndex));
    this.turnState = Game.TurnState.Action;

    this.activePlayerActionCount = 1;
    this.activePlayerBuyCount = 1;
    this.activePlayerMoneyCount = 0;

    if (this.activePlayerIndex == 0) {
        this.turnIndex++;
    }

    this.emit(Game.GameUpdate,
        Game.GameUpdates.NextTurn,
        this.activePlayer.name + ' begins their turn ' + this.turnIndex);

    return false;
};


Game.prototype.advanceGameState = function() {
    if (this.eventStack.length > 0) {
        var event = this.eventStack.pop();
        event(this, this.activePlayer, this.inactivePlayers);
        return;
    }

    if (this.turnState == Game.TurnState.Action) {
        var playableActions = this.currentlyPlayableActions();
        if (playableActions.length == 0) {
            this.turnState = Game.TurnState.Buy;
            this.advanceGameState();
        } else {
            this.activePlayer.decider.promptForAction(this, playableActions);
        }
    } else if (this.turnState == Game.TurnState.Buy) {
        var buyablePiles = this.currentlyBuyablePiles();
        if (buyablePiles.length == 0 ) {
            this.turnState = Game.TurnState.Cleanup;
            this.advanceGameState();
        } else {
            this.activePlayer.decider.promptForBuy(this, buyablePiles);
        }
    } else if (this.turnState == Game.TurnState.Cleanup) {
        this.activePlayer.discard = this.activePlayer.discard.concat(this.playArea);
        this.playArea = [];

        this.emit('empty-play-area');

        this.discardCards(this.activePlayer, this.activePlayer.hand);
        this.drawCards(this.activePlayer, 5);

        var gameover = this.advanceTurn();
        if (!gameover) {
            this.advanceGameState();
        }
    } else {
        throw new Error('Illegal turn state: ' + this.turnState);
    }
};

Game.prototype.pushGameEvent = function(e) {
    this.eventStack.push(e);
};


Game.prototype.currentlyPlayableActions = function() {
    if (this.activePlayerActionCount == 0) {
        return [];
    } else {
        return this.activePlayer.getActionsInHand();
    }
};

Game.prototype.buyablePiles = function() {
    return this.kingdomPiles.filter(function(pile) {
        return pile.count > 0;
    });
}

Game.prototype.pileForCard = function(card) {
    var pile = _.find(this.kingdomPiles, function(pile) {
        return pile.card === card;
    });

    if (!pile) {
        console.error('No pile for card', card);
    }

    return pile;
};

Game.prototype.computeEffectiveCardCost = function(card) {
    return card.cost;
};

Game.prototype.computeMaximumPurchaseCost = function() {
    return this.activePlayerMoneyCount + _.mapSum(this.activePlayer.hand, function(card) {
        return card.money ? card.money : 0;
    });
};

Game.prototype.currentlyBuyablePiles = function() {
    if (this.activePlayerBuyCount == 0) {
        return [];
    } else {
        var maximumCost = this.computeMaximumPurchaseCost();
        return _.filter(this.buyablePiles(), _.bind(function(pile) {
            return this.computeEffectiveCardCost(pile.card) <= maximumCost;
        }, this));
    }
};

// Game-state changes

Game.prototype.playTreasure = function(card) {
    this.discardCards(this.activePlayer, [card]);
    this.activePlayerMoneyCount += card.money;
    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
        this.activePlayer,
        card);
}

Game.prototype.buyFromPile = function(pile) {
    var cost = this.computeEffectiveCardCost(pile.card);

    if (this.activePlayerBuyCount == 0) {
        throw new Error('Unable to buy with zero buys');
    } else if (pile.count == 0) {
        throw new Error('Unable to buy from empty pile');
    } else if (this.activePlayerMoneyCount < cost) {
        throw new Error('Unable to buy card with too little money');
    }

    this.activePlayerBuyCount--;
    pile.count--;
    this.activePlayerMoneyCount -= cost;
    this.activePlayer.discard.push(pile.card);

    this.emit(Game.GameUpdate,
        Game.GameUpdates.BoughtCard,
        this.activePlayer.name + ' bought ' + pile.card.name,
        this.activePlayer, pile);

    this.advanceGameState();
};


Game.prototype.playerGainsFromPile = function(player, pile) {
    if (pile.count == 0) {
        throw new Error('Unable to buy from empty pile');
    }

    pile.count--;
    player.discard.push(pile.card);

    this.emit(Game.GameUpdate,
        Game.GameUpdates.GainedCard,
        player.name + ' gained ' + pile.card.name,
        player,
        pile);
};

Game.prototype.playAction = function(card) {
    this.activePlayerActionCount--;
    this.activePlayer.hand = removeFirst(this.activePlayer.hand, card);
    this.playArea.push(card);

    var cardEvents = reverseCopy(card.effects); // in event stack order
    this.eventStack = this.eventStack.concat(cardEvents);

    this.activePlayer.emit(Player.PlayerUpdates.PlayCard, card);

    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
        this.activePlayer,
        card);

    this.advanceGameState();
};

Game.prototype.discardCards = function(player, cards) {
    _.each(cards, _.bind(function(card) {
        player.discard.push(card);
        player.hand = removeFirst(player.hand, card);
    }, this));
    player.emit(Player.PlayerUpdates.DiscardCards, cards);
};

Game.prototype.trashCards = function(player, cards) {
    _.each(cards, _.bind(function(card) {
        player.hand = removeFirst(player.hand, card);
        this.trash.push(card);
    }, this));
    player.emit(Player.PlayerUpdates.TrashCards, cards);
};

Game.prototype.drawCards = function(player, num) {
    var drawn = [];
    _.range(num).forEach(_.bind(function(i) {
        if (player.deck.length === 0 && player.discard.length > 0) {
            player.deck = _.shuffle(player.discard);
            player.discard = [];
        }

        if (player.deck.length > 0) {
            var card = player.deck.pop();
            player.hand.push(card);
            drawn.push(card);
        }
    }, this));

    player.emit(Player.PlayerUpdates.DrawCards, drawn);
};

// Effect definitions

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
}

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

Game.prototype.filterGainablePiles = function(minCost, maxCost, cardOrType) {
    return _.filter(this.kingdomPiles, _.bind(function(pile) {
        if (pile.count == 0) {
            return false;
        } else if (!pile.card.matchesCardOrType(cardOrType)) {
            return false;
        } else {
            var pileCost = this.computeEffectiveCardCost(pile.card);
            return pileCost >= minCost && pileCost <= maxCost;
        }
    }, this));
};

Game.prototype.playersGainCardsEffect = function(players, cards) {
    _.each(players, _.bind(function(player) {
        _.each(cards, _.bind(function(card) {
            var pile = this.pileForCard(card);
            if (pile.count > 0) {
                this.playerGainsFromPile(player, pile);
            }
        }, this));
    }, this));

    this.advanceGameState();
};

Game.prototype.playerChoosesGainedCardEffect = function(player, minCost, maxCost, cardOrType) {
    var gainablePiles = this.filterGainablePiles(minCost, maxCost, cardOrType);
    if (gainablePiles.length > 0) {
        player.decider.promptForGain(this, gainablePiles, _.bind(function(pile) {
            this.playerGainsFromPile(player, pile);
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

// Blast off

Game.prototype.start = function() {
    this.drawInitialHands();
    this.advanceTurn();
    this.advanceGameState();
};
