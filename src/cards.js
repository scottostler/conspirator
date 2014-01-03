var _ = require('underscore');
var Cards = module.exports.Cards = [];

Cards.AssetRoot = 'assets/cards';

Cards.uniq = function(cards) {
    return _.uniq(cards, function(c) {
        return c.name;
    });
};

Cards.areUnique = function(cards) {
    return cards.length === Cards.uniq(cards).length;
};

Cards.getCardByName = function(cardName) {
    return Cards[cardName.replace(/\s+/g, '')];
}

function gainCoins(num) {
    return function(game, activePlayer, otherPlayers) {
        game.activePlayerGainsCoinsEffect(num);
    };
}

function gainActions(num) {
    return function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsActionsEffect(num);
    };
}

function gainBuys(num) {
    return function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsBuysEffect(num);
    };
}

function drawCards(num) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDrawsCardsEffect(activePlayer, num);
    };
}

function drawToNCardsAllowingDiscardsOfType(num, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDrawsToNCardsAllowingDiscardsEffect(activePlayer, num, cardOrType);
    };
}

function trashCards(min, max) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, min, max, Card.Type.All);
    };
}

function otherPlayersDiscardTo(to) {
    return function(game, activePlayer, otherPlayers) {
        game.inactivePlayersDiscardToAttack(to);
    };
}

function otherPlayersDraw(num) {
    return function(game, activePlayer, otherPlayers) {
        game.playersDrawCardsEffect(otherPlayers, num);
    };
}

function discardAndDraw() {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardsAndDrawsEffect(activePlayer);
    };
}

function discardForEffect(effect) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardsForEffect(activePlayer, effect);
    };
}

function otherPlayersGainCards(cards) {
    return function(game, activePlayer, otherPlayers) {
        game.playersGainCardsAttack(otherPlayers, cards);
    };
}

function gainCardOntoDeck(card) {
    return function(game, activePlayer, otherPlayers) {
        game.playersGainCardsEffect([activePlayer], [card], true);
    };
}

function gainCardCosting(minCost, maxCost, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerChoosesGainedCardEffect(activePlayer, minCost, maxCost, cardOrType);
    };
}

function trashCardForEffect(cardOrType, effect) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, 1, 1, cardOrType, function(cards) {
            if (cards.length === 1) {
                game.pushGameEvent(effect);
            }
        });
    };
}

function trashThisCard() {
    return function(game, activePlayer, otherPlayers) {
        game.trashCardInPlayEffect(_.last(game.playArea));
    };
}

// Note: type of card trashed is assumed to match type of card gained.
//       e.g. All -> All, or Treasure -> Treasure
function trashCardToGainUpToPlusCost(plusCost, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, 1, 1, cardOrType, function(cards) {
            if (cards.length === 1) {
                var card = cards[0];
                var maxCost = game.computeEffectiveCardCost(card) + plusCost;
                game.pushGameEvent(gainCardCosting(0, maxCost, cardOrType));
            }
        });
    };
};

function trashCardToGainExactlyPlusCost(plusCost, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, 1, 1, cardOrType, function(cards) {
            if (cards.length === 1) {
                var card = cards[0];
                var maxCost = game.computeEffectiveCardCost(card) + plusCost;
                game.pushGameEvent(gainCardCosting(maxCost, maxCost, cardOrType));
            }
        });
    };
};

function offerToShuffleDiscardIntoDeck() {
    return function(game, activePlayer, otherPlayers) {
        game.shuffleDiscardIntoDeckOption(activePlayer);
    };
}

function drawCardType(num, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDrawsCardTypeEffect(activePlayer, num, cardOrType);
    };
}

function discardOntoDeck() {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardCardOntoDeckEffect(activePlayer);
    };
}

function otherPlayersDiscardCardOntoDeckAttack(cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playersDiscardCardOntoDeckAttack(otherPlayers, cardOrType);
    };
}

function thiefAttack(cardOrType, number) {
    return function(game, activePlayer, otherPlayers) {
        game.trashAndMaybeGainCardsAttack(activePlayer, otherPlayers, cardOrType, number);
    };
}

function chooseToKeepOrDiscardTopCardForAllPlayers() {
    return function(game, activePlayer, otherPlayers) {
        game.keepOrDiscardTopCardOptionAttack(activePlayer, [activePlayer].concat(otherPlayers));
    };
}

function playActionMultipleTimes(num) {
    return function(game, activePlayer, otherPlayers) {
        game.playActionMultipleTimesEffect(activePlayer, num);
    };
};

function revealAndTestHand(test, trueEffect, falseEffect) {
    return function(game, activePlayer, otherPlayers) {
        game.revealAndTestHandEffect(test, trueEffect, falseEffect);
    };
};

// Reactions

function revealToAvoidAttack() {
    return function(game, reactingPlayer) {
        return true;
    };
}

// VP counts

function vpPerNCards(cardsPerVP, cardOrType) {
    return function(activePlayer) {
        var matchingCards = activePlayer.getFullDeck().filter(function(card) {
            return card.matchesCardOrType(cardOrType);
        });
        return Math.floor(matchingCards.length / cardsPerVP);
    };
}

function vpPerNDistinctCards(vpPerIncrement, cardsPerIncrement) {
    return function(activePlayer) {
        var uniqueCards = Cards.uniq(activePlayer.getFullDeck());
        return Math.floor(uniqueCards.length / cardsPerIncrement) * vpPerIncrement;
    };
}

/**
 * @constructor
 */
function Card(properties) {
    _.extend(this, properties);

    var filename = this.name.toLowerCase().replace(' ', '_') + '.jpg';
    this.assetURL = [Cards.AssetRoot, this.set, filename].join('/');
}

module.exports.Card = Card;

Card.Type = {
    Action: 'action',
    Treasure: 'treasure',
    Victory: 'victory',
    Reaction: 'reaction',
    All: 'all'
};

Card.prototype.toString = function() {
    return this.name;
};

Card.prototype.isAction = function() {
    return this.effects !== undefined;
};

Card.prototype.isReaction = function() {
    return this.reaction !== undefined;
};

Card.prototype.isTreasure = function() {
    return this.money !== undefined;
};

Card.prototype.isVictory = function() {
    return this.vp !== undefined && !this.isCurse();
};

Card.prototype.isCurse = function() {
    return this === Cards.Curse;
};

Card.prototype.matchesCardOrType = function(cardOrType) {
    if (_.isString(cardOrType)) {
        switch (cardOrType) {
            case Card.Type.All:
                return true;
            case Card.Type.Action:
                return this.isAction();
            case Card.Type.Reaction:
                return this.isReaction();
            case Card.Type.Treasure:
                return this.isTreasure();
            case Card.Type.Victory:
                return this.isVictory();
        }
    } else if (cardOrType instanceof Card) {
        return this === cardOrType;
    }

    console.error('Unknown card or card type', cardOrType);
    return false;
};

// Dummy Cards
// TODO: make views instead of cards.

Cards.Trash = new Card({
    name: 'Trash',
    set: 'base'
});

Cards.Cardback = new Card({
    name: 'Cardback',
    set: 'base'
});

// Basic Cards

Cards.Copper = new Card({
    name: 'Copper',
    cost: 0,
    money: 1,
    set: 'base'
});

Cards.Silver = new Card({
    name: 'Silver',
    cost: 3,
    money: 2,
    set: 'base'
});

Cards.Gold = new Card({
    name: 'Gold',
    cost: 6,
    money: 3,
    set: 'base'
});

Cards.Estate = new Card({
    name: 'Estate',
    cost: 2,
    vp: 1,
    set: 'base'
});

Cards.Duchy = new Card({
    name: 'Duchy',
    cost: 5,
    vp: 3,
    set: 'base'
});

Cards.Province = new Card({
    name: 'Province',
    cost: 8,
    vp: 6,
    set: 'base'
});

Cards.Curse = new Card({
    name: 'Curse',
    cost: 0,
    vp: -1,
    set: 'base'
});

// Base Set

Cards.Adventurer = new Card({
    name: 'Adventurer',
    cost: 6,
    effects: [drawCardType(2, Card.Type.Treasure)],
    set: 'base'
});

Cards.Bureaucrat = new Card({
    name: 'Bureaucrat',
    cost: 4,
    effects: [gainCardOntoDeck(Cards.Silver), otherPlayersDiscardCardOntoDeckAttack(Card.Type.Victory)],
    set: 'base'
});

Cards.Cellar = new Card({
    name: 'Cellar',
    cost: 2,
    effects: [gainActions(1), discardAndDraw()],
    set: 'base'
});

Cards.Chancellor = new Card({
    name: 'Chancellor',
    cost: 3,
    effects: [gainCoins(2), offerToShuffleDiscardIntoDeck()],
    set: 'base'
});

Cards.Chapel = new Card({
    name: 'Chapel',
    cost: 2,
    effects: [trashCards(0, 4)],
    set: 'base'
});

Cards.CouncilRoom = new Card({
    name: 'Council Room',
    cost: 5,
    effects: [drawCards(4), gainBuys(1), otherPlayersDraw(1)],
    set: 'base'
});

Cards.Feast = new Card({
    name: 'Feast',
    cost: 4,
    effects: [trashThisCard(), gainCardCosting(0, 5, Card.Type.All)],
    set: 'base'
});

Cards.Festival = new Card({
    name: 'Festival',
    cost: 5,
    effects: [gainActions(2), gainBuys(1), gainCoins(2)],
    set: 'base'
});

Cards.Gardens = new Card({
    name: 'Gardens',
    cost: 4,
    vp: vpPerNCards(10, Card.Type.All),
    set: 'base'
});

Cards.Laboratory = new Card({
    name: 'Laboratory',
    cost: 5,
    effects: [drawCards(2), gainActions(1)],
    set: 'base'
});

Cards.Library = new Card({
    name: 'Library',
    cost: 5,
    effects: [drawToNCardsAllowingDiscardsOfType(7, Card.Type.Action)],
    set: 'base'
});

Cards.Market = new Card({
    name: 'Market',
    cost: 5,
    effects: [drawCards(1), gainActions(1), gainBuys(1), gainCoins(1)],
    set: 'base'
});

Cards.Mine = new Card({
    name: 'Mine',
    cost: 5,
    effects: [trashCardToGainUpToPlusCost(3, Card.Type.Treasure)],
    set: 'base'
});

Cards.Militia = new Card({
    name: 'Militia',
    cost: 4,
    effects: [gainCoins(2), otherPlayersDiscardTo(3)],
    set: 'base'
});

Cards.Moat = new Card({
    name: 'Moat',
    cost: 2,
    effects: [drawCards(2)],
    reaction: revealToAvoidAttack(),
    set: 'base'
});

Cards.Moneylender = new Card({
    name: 'Moneylender',
    cost: 4,
    effects: [trashCardForEffect(Cards.Copper, gainCoins(3))],
    set: 'base'
});

Cards.Remodel = new Card({
    name: 'Remodel',
    cost: 4,
    effects: [trashCardToGainUpToPlusCost(2, Card.Type.All)],
    set: 'base'
});

Cards.Smithy = new Card({
    name: 'Smithy',
    cost: 4,
    effects: [drawCards(3)],
    set: 'base'
});

Cards.Spy = new Card({
    name: 'Spy',
    cost: 4,
    effects: [drawCards(1), gainActions(1), chooseToKeepOrDiscardTopCardForAllPlayers()],
    set: 'base'
});

Cards.Thief = new Card({
    name: 'Thief',
    cost: 4,
    effects: [thiefAttack(Card.Type.Treasure, 2)],
    set: 'base'
});

Cards.ThroneRoom = new Card({
    name: 'Throne Room',
    cost: 4,
    effects: [playActionMultipleTimes(2)],
    set: 'base'
});

Cards.Village = new Card({
    name: 'Village',
    cost: 3,
    effects: [drawCards(1), gainActions(2)],
    set: 'base'
});

Cards.Witch = new Card({
    name: 'Witch',
    cost: 5,
    effects: [drawCards(2), otherPlayersGainCards([Cards.Curse])],
    set: 'base'
});

Cards.Woodcutter = new Card({
    name: 'Woodcutter',
    cost: 3,
    effects: [gainCoins(2), gainBuys(1)],
    set: 'base'
});

Cards.Workshop = new Card({
    name: 'Workshop',
    cost: 3,
    effects: [gainCardCosting(0, 4, Card.Type.All)],
    set: 'base'
});

Cards.BaseSet = [
    Cards.Adventurer,
    Cards.Bureaucrat,
    Cards.Cellar,
    Cards.Chapel,
    Cards.Chancellor,
    Cards.CouncilRoom,
    Cards.Feast,
    Cards.Festival,
    Cards.Gardens,
    Cards.Market,
    Cards.Laboratory,
    Cards.Library,
    Cards.Mine,
    Cards.Moat,
    Cards.Moneylender,
    Cards.Militia,
    Cards.Remodel,
    Cards.Smithy,
    Cards.Spy,
    Cards.Thief,
    Cards.ThroneRoom,
    Cards.Village,
    Cards.Witch,
    Cards.Woodcutter,
    Cards.Workshop
];

Cards.Courtyard = new Card({
    name: 'Courtyard',
    cost: 2,
    effects: [drawCards(3), discardOntoDeck(1)],
    set: 'intrigue'
});

Cards.Intrigue = [
    Cards.Courtyard
];

Cards.Fairgrounds = new Card({
    name: 'Fairgrounds',
    cost: 2,
    vp: vpPerNDistinctCards(2, 5),
    set: 'cornucopia'
});

Cards.Hamlet = new Card({
    name: 'Hamlet',
    cost: 2,
    effects: [drawCards(1), gainActions(1), discardForEffect(gainActions(1)), discardForEffect(gainBuys(1))],
    set: 'cornucopia'
});

Cards.Menagerie = new Card({
    name: 'Menagerie',
    cost: 3,
    effects: [gainActions(1), revealAndTestHand(Cards.areUnique, drawCards(3), drawCards(1))],
    set: 'cornucopia'
});

Cards.Remake = new Card({
    name: 'Remake',
    cost: 4,
    effects: [trashCardToGainExactlyPlusCost(1, Card.Type.All), trashCardToGainExactlyPlusCost(1, Card.Type.All)],
    set: 'cornucopia'
});

Cards.Cornucopia = [
    Cards.Hamlet,
    Cards.Menagerie,
    Cards.Remake
];

Cards.AllSets = [].concat(
    Cards.BaseSet, Cards.Intrigue, Cards.Cornucopia);
