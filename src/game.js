var _ = require('underscore');
var events = require('events');
var util = require('./util.js');
var Player = require('./player.js');
var Cards = require('./cards.js').Cards;

var NumKingdomCards = module.exports.NumKingdomCards = 10;

var randomizedKingdomCards = module.exports.randomizedKingdomCards = function(forcedCards, numCards) {
    var randomCards = _.sample(
        _.difference(Cards.AllSets, forcedCards),
        numCards - forcedCards.length);
    return forcedCards.concat(randomCards);
};

/**
 * @constructor
 */
function Game(players, kingdomCards) {
    if (!kingdomCards) {
        kingdomCards = randomizedKingdomCards([Cards.ThroneRoom, Cards.Thief], NumKingdomCards);
    }

    this.activePlayerIndex = -1;
    this.turnCount = 0;
    this.players = players;

    this.playArea = [];
    this.eventStack = [];
    this.hasGameEnded = false;

    this.emptyPilesToEndGame = players.length >= 5 ? 4 : 3;
    var kingdomCardCount = 10;
    var victoryCardCount = this.players.length == 2 ? 8 : 12;
    var curseCount = (this.players.length - 1) * 10;
    var sortedKingdomCards = _.sortBy(kingdomCards, 'cost');

    this.kingdomPileGroups = [];
    this.kingdomPileGroups.push(sortedKingdomCards.map(function(card) {
        if (card.isVictory()) {
            return { card: card, count: victoryCardCount };
        } else {
            return { card: card, count: kingdomCardCount };
        }
    }));
    this.kingdomPileGroups.push([
        { card: Cards.Estate,   count: victoryCardCount },
        { card: Cards.Duchy,    count: victoryCardCount },
        { card: Cards.Province, count: victoryCardCount },
        { card: Cards.Copper,   count: 99, hideBadge: true },
        { card: Cards.Silver,   count: 99, hideBadge: true },
        { card: Cards.Gold,     count: 99, hideBadge: true }
    ]);

    this.kingdomPileGroups.push([{ card: Cards.Curse, count: curseCount }]);
    this.kingdomPiles = _.flatten(this.kingdomPileGroups);
    this.trash = [];
};

module.exports.Game = Game;

Game.HandSize = 5;

Game.TurnState = {
    Action: 'action',
    Buy: 'buy',
    Cleanup: 'cleanup'
};

Game.GameUpdate = 'game-update';

Game.GameUpdates = {
    NextTurn: 'next-turn',
    NextPhase: 'next-phase',
    PlayedCard: 'played-card',
    BoughtCard: 'bought-card',
    GainedCard: 'gained-card',
    CleanedUp: 'cleaned-up',
    GameOver: 'game-over'
};

Game.prototype.__proto__ = events.EventEmitter.prototype;

Game.prototype.log = function() {
    var args = Array.prototype.slice.call(arguments);
    this.emit('log', args.join(' '));
};

Game.prototype.drawInitialHands = function() {
    this.players.forEach(function(player) {
        this.drawCards(player, Game.HandSize);
    }, this);
};

// Turn advancement and game state

Game.prototype.isGameOver = function() {
    var provincePile = this.pileForCard(Cards.Province);
    if (provincePile.count === 0) {
        return true;
    }

    var emptyCount = _.mapSum(this.kingdomPiles, function(pile) {
        return pile.count === 0 ? 1 : 0;
    });

    if (emptyCount >= this.emptyPilesToEndGame) {
        return true;
    }

    return false;
};

Game.prototype.advanceTurn = function() {
    if (this.isGameOver()) {
        this.hasGameEnded = true;
        return;
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
        this.turnCount++;
    }

    this.log(this.activePlayer.name + ' begins turn ' + this.turnCount);

    this.emit(Game.GameUpdate,
        Game.GameUpdates.NextTurn,
        this.activePlayer.name + ' begins their turn ' + this.turnCount);

    return false;
};

Game.prototype.advanceGameState = function() {
    if (this.hasGameEnded) {
        throw new Error('Game already ended');
    }

    if (this.eventStack.length > 0) {
        var event = this.eventStack.pop();
        event(this, this.activePlayer, this.inactivePlayers);
        return;
    }

    if (this.turnState == Game.TurnState.Action) {
        var playableActions = this.currentlyPlayableActions();
        if (playableActions.length == 0) {
            this.turnState = Game.TurnState.Buy;
            this.emit(Game.GameUpdate,
                Game.GameUpdates.NextPhase);

            this.advanceGameState();
        } else {
            this.activePlayer.decider.promptForAction(this, playableActions);
        }
    } else if (this.turnState == Game.TurnState.Buy) {
        var buyablePiles = this.currentlyBuyablePiles();
        if (buyablePiles.length == 0) {
            this.turnState = Game.TurnState.Cleanup;
            this.emit(Game.GameUpdate,
                Game.GameUpdates.NextPhase);

            this.advanceGameState();
        } else {
            this.activePlayer.decider.promptForBuy(this, buyablePiles);
        }
    } else if (this.turnState == Game.TurnState.Cleanup) {
        this.activePlayer.discard = this.activePlayer.discard.concat(this.playArea);
        this.playArea = [];

        this.emit('empty-play-area');

        this.discardCards(this.activePlayer, this.activePlayer.hand);
        this.drawCards(this.activePlayer, Game.HandSize);

        this.advanceTurn();
        if (this.hasGameEnded) {
            this.endGame();
        } else {
            this.advanceGameState();
        }
    } else {
        throw new Error('Illegal turn state: ' + this.turnState);
    }
};

Game.prototype.revealPlayerHand = function(player) {
    var cardNames = _.pluck(player.hand, 'name').join(', ');
    this.log(player.name, 'reveals hand: ', cardNames);
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
    this.log(this.activePlayer.name, 'played', card.name);
    this.discardCards(this.activePlayer, [card]);
    this.activePlayerMoneyCount += card.money;
    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
        this.activePlayer,
        card);
}

Game.prototype.buyFromPile = function(pile) {
    this.log(this.activePlayer.name, 'bought', pile.card.name);

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


Game.prototype.playerGainsFromPile = function(player, pile, ontoDeck) {
    if (pile.count == 0) {
        throw new Error('Unable to buy from empty pile');
    }

    pile.count--;
    if (ontoDeck){
        player.deck.push(pile.card);
    } else {
        player.discard.push(pile.card);
    }

    if (ontoDeck) {
        this.log(player.name, 'gains', pile.card.name, 'onto deck');
    } else {
        this.log(player.name + ' gains ' + pile.card.name);
    }


    this.emit(Game.GameUpdate,
        Game.GameUpdates.GainedCard,
        player.name + ' gained ' + pile.card.name,
        player,
        pile);
};

Game.prototype.playAction = function(card) {
    this.log(this.activePlayer.name, 'played', card.name);

    this.activePlayerActionCount--;
    this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
    this.playArea.push(card);

    var cardEvents = _.reverse(card.effects); // in event stack order
    this.eventStack = this.eventStack.concat(cardEvents);

    this.activePlayer.emit(Player.PlayerUpdates.PlayCard, card);

    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
        this.activePlayer,
        card);

    this.advanceGameState();
};

Game.prototype.allowReactionsToAttack = function(player, attackEffect, shouldSkipAttack) {
    var that = this;
    var processAttack = function() {
        if (shouldSkipAttack) {
            that.advanceGameState();
        } else {
            attackEffect();
        }
    };

    var reactions = player.getReactionsInHand();
    if (reactions.length > 0) {
        player.decider.promptForReaction(this, reactions, function(reactionCard) {
            if (reactionCard) {
                that.log(player.name, 'reveals', reactionCard.name);
                var shouldSkipAttack = reactionCard.reaction(that, player) || shouldSkipAttack;
                that.allowReactionsToAttack(player, attackEffect, shouldSkipAttack);
            } else {
                processAttack();
            }
        });
    } else {
        processAttack();
    }
};

Game.prototype.discardCards = function(player, cards, ontoDeck) {
    _.each(cards, _.bind(function(card) {
        if (!_.contains(player.hand, card)) {
            console.error('Player unable to discard', player, card);
            return;
        }
        player.hand = util.removeFirst(player.hand, card);
        if (ontoDeck) {
            player.deck.push(card);
        } else {
            player.discard.push(card);
        }
    }, this));
    player.emit(Player.PlayerUpdates.DiscardCards, cards);
};

Game.prototype.trashCards = function(player, cards) {
    _.each(cards, _.bind(function(card) {
        player.hand = util.removeFirst(player.hand, card);
        this.trash.push(card);
    }, this));
    player.emit(Player.PlayerUpdates.TrashCards, cards);
};

Game.prototype.addCardToTrash = function(card) {
    this.trash.push(card);
    this.emit('add-card-to-trash', card);
};

Game.prototype.drawCards = function(player, num) {
    var drawn = player.takeCardsFromDeck(num);
    player.addCardsToHand(drawn);
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

// Blast off

Game.prototype.start = function() {
    this.drawInitialHands();
    this.advanceTurn();
    this.advanceGameState();
};

Game.prototype.endGame = function() {
    this.log('Game ends: ');

    var that = this;
    _.each(this.players, function(player) {
        that.log('-', player.name, 'has', player.calculateScore(), 'VP');
    });

    var piles = _.map(this.kingdomPiles, function(p) {
        return p.card.name + ' (' + p.count + ')';
    });
    that.log('- Piles:', piles.join(", "));

    this.emit(Game.GameUpdate, Game.GameUpdates.GameOver);
};

// cardeffects.js extends Game as a side-effect of being loaded.
require('./cardeffects.js');
