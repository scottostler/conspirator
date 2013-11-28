window.Cards = [];

var CardAssetRoot = 'assets/cards/';

function gainCoins(num) {
    return function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsCoins(num);
    };
}

function gainActions(num) {
    return function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsActions(num);
    };
}

function gainBuys(num) {
    return function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsBuys(num);
    };
}

function drawCards(num) {
    return function(game, activePlayer, otherPlayers) {
        game.activePlayerDrawCards(num);
    };
}

function trashCards(min, max) {
    return function(game, activePlayer, otherPlayers) {
        game.activePlayerTrashesCards(min, max);
    };
}

function otherPlayersDiscardTo(to) {
    return function(game, activePlayer, otherPlayers) {
        game.inactivePlayersDiscardTo(to);
    }
}

function otherPlayersDraw(num) {
    return function(game, activePlayer, otherPlayers) {
        game.inactivePlayersDraw(num);
    }
}

function discardAndDraw() {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardsAndDraws(activePlayer);
    }
}

function Card(properties) {
    _.extend(this, properties);

    var filename = this.name.toLowerCase().replace(' ', '_') + '.jpg';
    this.assetURL = CardAssetRoot + filename;
}

Card.prototype.toString = function() {
    return this.name;
};

Card.prototype.isAction = function() {
    return this.effects != null;
};

Card.prototype.isTreasure = function() {
    return this.money != null;
};

Card.prototype.isVictory = function() {
    return this.vp != null;
};

// Dummy Cards
// TODO: make views instead of cards.

Cards.Trash = new Card({
    name: 'Trash'
});

Cards.Cardback = new Card({
    name: 'Cardback'
});

// Basic Cards

Cards.Copper = new Card({
    name: 'Copper',
    cost: 0,
    money: 1
});

Cards.Silver = new Card({
    name: 'Silver',
    cost: 3,
    money: 2
});

Cards.Gold = new Card({
    name: 'Gold',
    cost: 6,
    money: 3
});

Cards.Estate = new Card({
    name: 'Estate',
    cost: 2,
    vp: 1
});

Cards.Duchy = new Card({
    name: 'Duchy',
    cost: 5,
    vp: 3
});

Cards.Province = new Card({
    name: 'Province',
    cost: 8,
    vp: 6
});

Cards.Curse = new Card({
    name: 'Curse',
    cost: 0,
    vp: -1,
});

// Base Set

Cards.Chapel = new Card({
    name: 'Chapel',
    cost: 2,
    effects: [trashCards(0, 4)]
});

Cards.Cellar = new Card({
    name: 'Cellar',
    cost: 2,
    effects: [gainActions(1), discardAndDraw()]
});

Cards.CouncilRoom = new Card({
    name: 'Council Room',
    cost: 5,
    effects: [drawCards(4), gainBuys(1), otherPlayersDraw(1)]
});

Cards.Festival = new Card({
    name: 'Festival',
    cost: 5,
    effects: [gainActions(2), gainBuys(1), gainCoins(2)]
});

Cards.Market = new Card({
    name: 'Market',
    cost: 5,
    effects: [drawCards(1), gainActions(1), gainBuys(1), gainCoins(1)]
});

Cards.Laboratory = new Card({
    name: 'Laboratory',
    cost: 5,
    effects: [drawCards(2), gainActions(1)]
});

Cards.Militia = new Card({
    name: 'Militia',
    cost: 4,
    effects: [gainCoins(2), otherPlayersDiscardTo(3)]
});

Cards.Smithy = new Card({
    name: 'Smithy',
    cost: 4,
    effects: [drawCards(3)]
});

Cards.Village = new Card({
    name: 'Village',
    cost: 3,
    effects: [drawCards(1), gainActions(2)]
});

Cards.Woodcutter = new Card({
    name: 'Woodcutter',
    cost: 3,
    effects: [gainCoins(2), gainBuys(1)]
});

Cards.BaseSet = [
    // Cards.Adventurer,
    // Cards.Bureaucrat,
    Cards.Chapel,
    Cards.Cellar,
    // Cards.Chancellor,
    Cards.CouncilRoom,
    // Cards.Feast,
    Cards.Festival,
    // Cards.Gardens,
    Cards.Market,
    Cards.Laboratory,
    // Cards.Library,
    // Cards.Mine,
    // Cards.Moat,
    // Cards.Moneylender,
    Cards.Militia,
    // Cards.Remodel,
    Cards.Smithy,
    // Cards.Spy,
    // Cards.Thief,
    // Cards.ThroneRoom,
    Cards.Village,
    // Cards.Witch,
    Cards.Woodcutter
    // Cards.Workshop,
];