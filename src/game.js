var NumKingdomCards = 10;

function Game(kingdomCards, players) {
    this.activePlayerIndex = -1;
    this.turnIndex = -1;
    this.players = players;
    this.playArea = [];

    var sortedKingdomCards = _.sortBy(kingdomCards, 'cost');

    this.kingdomPileGroups = [];
    this.kingdomPileGroups.push(sortedKingdomCards.map(function(card) {
            return { card: card, count: 10 };
    }));

    var victoryCardCount = this.players.length == 2 ? 8 : 12;
    var curseCount = (this.players.length - 1) * 10;

    this.kingdomPileGroups.push([
        { card: Cards.Estate,   count: victoryCardCount },
        { card: Cards.Duchy,    count: victoryCardCount },
        { card: Cards.Province, count: victoryCardCount },
        { card: Cards.Copper,   count: 99, hideBadge: true },
        { card: Cards.Silver,   count: 99, hideBadge: true},
        { card: Cards.Gold,     count: 99, hideBadge: true },
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
    ChoseActionEffect: 'chose-action-effect',
    BoughtCard: 'bought-card',
    GainedCard: 'gained-card',
    CleanedUp: 'cleaned-up'
};

Game.prototype = new EventEmitter();

Game.prototype.drawInitialHands = function() {
    this.players.forEach(_.bind(function(player) {
        player.drawCards(this, 5);
    }, this));
};

Game.prototype.advanceTurn = function() {
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
};

Game.prototype.advanceGameState = function(endPhase) {
    if (this.turnState == Game.TurnState.Action) {
        var playableActions = endPhase ? [] : this.currentlyPlayableActions();
        if (endPhase || playableActions.length == 0) {
            this.turnState = Game.TurnState.Buy;
            this.advanceGameState();
        } else {
            this.activePlayer.promptForAction(this, playableActions);
        }
    } else if (this.turnState == Game.TurnState.Buy) {
        var buyablePiles = endPhase ? [] : this.currentlyBuyablePiles();
        if (endPhase || buyablePiles.length == 0 ) {
            this.turnState = Game.TurnState.Cleanup;
            this.advanceGameState();
        } else {
            this.activePlayer.promptForBuy(this, buyablePiles);
        }
    } else if (this.turnState == Game.TurnState.Cleanup) {
        this.activePlayer.discard = this.activePlayer.discard.concat(this.playArea);
        this.playArea = [];

        this.emit('empty-play-area');

        this.activePlayer.discardHand();
        this.activePlayer.drawCards(this, 5);

        this.advanceTurn();
        this.advanceGameState();
    } else {
        throw new Exception('Illegal turn state: ' + this.turnState);
    }
};

Game.prototype.currentlyPlayableActions = function() {
    if (this.activePlayerActionCount == 0) {
        return [];
    } else {
        return _.filter(this.activePlayer.hand, function(card) {
            return card.isAction();
        }, this);
    }
};

Game.prototype.buyablePiles = function() {
    return this.kingdomPiles.filter(function(pile) {
        return pile.count > 0;
    });
}

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

Game.prototype.playTreasure = function(card) {
    this.activePlayer.discardCard(card);
    this.activePlayerMoneyCount += card.money;
    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
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
        pile);

    this.advanceGameState();
};

Game.prototype.playAction = function(card) {
    this.activePlayerActionCount--;
    this.playArea.push(card);
    this.activePlayer.discardCard(card);

    _.each(card.effects, _.bind(function(effect) {
        effect(this, this.activePlayer, this.inactivePlayers);
    }, this));

    this.emit(Game.GameUpdate,
        Game.GameUpdates.PlayedCard,
        this.activePlayer.name + ' played ' + card.name,
        card);

    this.advanceGameState();
};

Game.prototype.activePlayerGainsCoins = function(num) {
    this.activePlayerMoneyCount += num;
};

Game.prototype.activePlayerGainsActions = function(num) {
    this.activePlayerActionCount += num;
};

Game.prototype.activePlayerGainsBuys = function(num) {
    this.activePlayerBuyCount += num;
};

Game.prototype.activePlayeDrawCards = function(num) {
    var drawnCards = this.activePlayer.drawCards(this, num);
}

Game.prototype.inactivePlayersDraw = function(num) {
    _.each(this.inactivePlayers, _.bind(function(player) {

    }, this));
};

Game.prototype.start = function() {
    this.drawInitialHands();
    this.advanceTurn();
    this.advanceGameState();
};
