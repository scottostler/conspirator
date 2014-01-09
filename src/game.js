var _ = require('underscore');
var events = require('events');
var util = require('./util.js');
var Player = require('./player.js');
var Cards = require('./cards.js').Cards;
var Pile = require('./cards.js').Pile;

var NumKingdomCards = module.exports.NumKingdomCards = 10;

var randomizedKingdomCards = function(forcedCards, numCards) {
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
        kingdomCards = randomizedKingdomCards([], NumKingdomCards);
    } else if (kingdomCards.length < NumKingdomCards) {
        kingdomCards = randomizedKingdomCards(kingdomCards, NumKingdomCards);
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
            return new Pile(card, victoryCardCount);
        } else {
            return new Pile(card, kingdomCardCount);
        }
    }));
    this.kingdomPileGroups.push([
        new Pile(Cards.Estate, victoryCardCount),
        new Pile(Cards.Duchy, victoryCardCount),
        new Pile(Cards.Province, victoryCardCount),
        new Pile(Cards.Copper, 99),
        new Pile(Cards.Silver, 99),
        new Pile(Cards.Gold, 99),
    ]);

    this.kingdomPileGroups.push([new Pile(Cards.Curse, curseCount)]);
    this.kingdomPiles = _.flatten(this.kingdomPileGroups);
    this.trash = [];

    _.each(players, function(player) {
        player.setGameEmitter(this);
    }, this);
};

module.exports.Game = Game;

Game.HandSize = 5;

Game.TurnState = {
    Action: 'action',
    Buy: 'buy',
    Cleanup: 'cleanup'
};

Game.prototype = Object.create(events.EventEmitter.prototype);

Game.prototype.log = function() {
    this.emit('log', _.toArray(arguments).join(' '));
};

Game.prototype.drawInitialHands = function() {
    _.each(this.players, function(player) {
        this.drawCards(player, Game.HandSize);
    }, this);
};

Game.prototype.stateUpdated = function() {
    this.emit('state-update', {
        activePlayer: this.activePlayer.name,
        turnCount: this.turnCount,
        turnState: this.turnState,
        actionCount: this.activePlayerActionCount,
        buyCount: this.activePlayerBuyCount,
        coinCount: this.activePlayerCoinCount
    });
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
    this.activePlayerCoinCount = 0;

    if (this.activePlayerIndex == 0) {
        this.turnCount++;
    }

    this.log(this.activePlayer.name + ' begins turn ' + this.turnCount);
    this.stateUpdated();

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
            this.stateUpdated();
            this.advanceGameState();
        } else {
            this.activePlayer.promptForAction(this, playableActions);
        }
    } else if (this.turnState == Game.TurnState.Buy) {
        var buyablePiles = this.currentlyBuyablePiles();
        if (buyablePiles.length == 0) {
            this.turnState = Game.TurnState.Cleanup;
            this.stateUpdated();
            this.advanceGameState();
        } else {
            this.activePlayer.promptForBuy(this, buyablePiles);
        }
    } else if (this.turnState == Game.TurnState.Cleanup) {
        this.activePlayer.discard = this.activePlayer.discard.concat(this.playArea);
        this.playArea = [];

        this.emit('empty-play-area');

        if (this.activePlayer.hand.length > 0) {
            this.discardCards(this.activePlayer, this.activePlayer.hand);
        }

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
    return this.activePlayerCoinCount + _.mapSum(this.activePlayer.hand, function(card) {
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

    this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
    this.playArea.push(card);

    this.activePlayerCoinCount += card.money;

    this.emit('play-card', this.activePlayer, card);
}

Game.prototype.buyFromPile = function(pile) {
    this.log(this.activePlayer.name, 'buys', pile.card.name);

    var cost = this.computeEffectiveCardCost(pile.card);

    if (this.activePlayerBuyCount == 0) {
        throw new Error('Unable to buy with zero buys');
    } else if (pile.count == 0) {
        throw new Error('Unable to buy from empty pile');
    } else if (this.activePlayerCoinCount < cost) {
        throw new Error('Unable to buy card with too little money');
    }

    this.activePlayerBuyCount--;
    pile.count--;
    this.activePlayerCoinCount -= cost;
    this.activePlayer.discard.push(pile.card);

    this.stateUpdated();
    this.emit('gain-card', this.activePlayer, pile.card);

    this.advanceGameState();
};


Game.prototype.playerGainsFromPile = function(player, pile, ontoDeck, intoHand) {
    if (pile.count == 0) {
        throw new Error('Unable to buy from empty pile');
    }

    if (ontoDeck && intoHand) {
        throw new Error("Can't gain both ontoDeck and intoHand");
    }

    if (ontoDeck) {
        this.log(player.name, 'gains', pile.card.name, 'onto deck');
    } else if (intoHand) {
        this.log(player.name, 'gains', pile.card.name, 'into hand');
    } else {
        this.log(player.name, 'gains', pile.card.name);
    }

    pile.count--;
    if (ontoDeck){
        player.deck.push(pile.card);
        this.emit('gain-card', player, pile.card);
    } else if (intoHand) {
        player.hand.push(pile.card);
        this.emit('gain-card-into-hand', player, pile.card);
    } else {
        player.discard.push(pile.card);
        this.emit('gain-card', player, pile.card);
    }
};

Game.prototype.playAction = function(card) {
    this.log(this.activePlayer.name, 'played', card.name);

    this.activePlayerActionCount--;
    this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
    this.playArea.push(card);

    var cardEvents = _.reverse(card.effects); // in event stack order
    this.eventStack = this.eventStack.concat(cardEvents);

    this.emit('play-card', this.activePlayer, card);
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
        player.promptForReaction(this, reactions, function(reactionCard) {
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
    if (ontoDeck) {
        this.log(player.name, 'discards', cards.length, util.pluralize('card', cards.length), 'onto deck');
    } else {
        this.log(player.name, 'discards', cards.join(', '));
    }

    this.emit('discard-cards', player, cards);
};

// Trash cards from a player's hand.
Game.prototype.trashCards = function(player, cards) {
    this.log(player.name, 'trashes', cards.join(', '));

    _.each(cards, function(card) {
        player.hand = util.removeFirst(player.hand, card);
        this.trash.push(card);
    }, this);

    this.emit('trash-cards-from-hand', player, cards);
};

// Normal trashing from hand should use trashCards.
Game.prototype.addCardToTrash = function(card) {
    this.trash.push(card);
    this.emit('add-card-to-trash', card);
};

Game.prototype.trashCardFromPlay = function(card) {
    // May not be true if a feast was throne-roomed, for example.
    if (_.contains(this.playArea, card)) {
        this.playArea = util.removeFirst(this.playArea, card);
        this.trash.push(card);
        this.emit('trash-card-from-play', card);
    }
};

Game.prototype.drawCards = function(player, num) {
    var cards = player.takeCardsFromDeck(num);
    player.addCardsToHand(cards);
    this.emit('draw-cards', player, cards);
};

Game.prototype.discardCardsFromDeck = function(player, num) {
    player.discardCardsFromDeck(num);
    this.log(player.name, 'discards', cards.join(', '));
    this.emit('discard-cards-from-deck', player, num);
};

// This method assumes the cards have already been 'taken' from the deck.
Game.prototype.drawAndDiscardFromDeck = function(player, draw, discard) {
    player.hand = player.hand.concat(draw);
    player.discard = player.discard.concat(discard);

    if (draw.length > 0 && discard.length > 0) {
        this.log(player.name, 'draws', draw.join(", "), 'and discards', discard.join(', '));
    } else if (draw.length > 0) {
        this.log(player.name, 'draws', draw.join(", "));
    } else if (discard.length > 0) {
        this.log(player.name, 'discards', discard.join(", "));
    }

    this.emit('draw-and-discard-cards', player, draw, discard);
};

Game.prototype.playActionMultipleTimes = function(card, num) {
    this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
    this.playArea.push(card);

    var cardEvents = _.reverse(_.flatten(util.repeat(card.effects, num))); // in event stack order
    this.eventStack = this.eventStack.concat(cardEvents);

    this.log(this.activePlayer.name, 'plays', card.name, num + 'x');
    this.emit('play-card', this.activePlayer, card);
};

Game.prototype.filterGainablePiles = function(minCost, maxCost, cardOrType) {
    return _.filter(this.kingdomPiles, function(pile) {
        if (pile.count == 0) {
            return false;
        } else if (!pile.card.matchesCardOrType(cardOrType)) {
            return false;
        } else {
            var pileCost = this.computeEffectiveCardCost(pile.card);
            return pileCost >= minCost && pileCost <= maxCost;
        }
    }, this);
};

// Blast off

Game.prototype.start = function() {
    this.drawInitialHands();
    this.log('The game is afoot!')
    this.advanceTurn();
    this.advanceGameState();
};

Game.prototype.endGame = function() {
    this.log('Game ends: ');

    _.each(this.players, function(player) {
        this.log('-', player.name, 'has', player.calculateScore(), 'VP');
    }, this);

    var piles = _.map(this.kingdomPiles, function(p) {
        return p.card.name + ' (' + p.count + ')';
    });
    this.log('- Piles:', piles.join(", "));

    this.emit('game-over');
};

// cardeffects.js extends Game as a side-effect of being loaded.
require('./cardeffects.js');
