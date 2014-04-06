var _ = require('underscore');
var util = require('./util.js');
var Cards = [];

Cards.AssetRoot = 'assets/cards-296x473';

function label(f, string) {
    f._optionString = string;
    return f;
};

// Card utility functions

Cards.uniq = function(cards) {
    return _.uniq(cards, function(c) {
        return c.name;
    });
};

Cards.areUnique = function(cards) {
    return cards.length === Cards.uniq(cards).length;
};

Cards.matchNone = function(cardOrType) {
    return function(cards) {
        return !_.some(cards, function(c) { return c.matchesCardOrType(cardOrType) });
    };
};

Cards.filter = function(cards, cardOrType) {
    return _.filter(cards,
        function(c) { return c.matchesCardOrType(cardOrType);
    });
};

Cards.getCardByName = function(cardName) {
    var card = Cards[cardName.replace(/\s+/g, '')];
    if (!card) {
        console.error('Unable to find card for ' + cardName);
    }
    return card;
}

// Card effect definitions

function gainCoins(num) {
    return label(function(game, activePlayer, otherPlayers) {
        game.activePlayerGainsCoinsEffect(num);
    }, '+' + num + ' ' + util.pluralize('coin', num));
}

function gainActions(num) {
    return label(function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsActionsEffect(num);
    }, '+' + num + ' ' + util.pluralize('action', num));
}

function gainBuys(num) {
    return label(function(game, activePlayer, otherPlayers) {
       game.activePlayerGainsBuysEffect(num);
    }, '+' + num + ' ' + util.pluralize('buy', num));
}

function drawCards(num) {
    return label(function(game, activePlayer, otherPlayers) {
        game.playerDrawsCardsEffect(activePlayer, num);
    }, '+' + num + ' ' + util.pluralize('card', num));
}

function discardCards(num) {
    var string = 'discard ' + num + ' ' + util.pluralize('card', num);
    return label(function(game, activePlayer, otherPlayers) {
        game.discardNCardsEffect(activePlayer, num);
    }, string);
}

function trashCards(min, max) {
    if (max === undefined) { max = min; }
    return label(function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, min, max, Card.Type.All);
    }, 'Trash ' + util.labelRange(min, max) + ' ' + util.pluralize('card', max));
}

function drawToNCardsAllowingDiscardsOfType(num, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDrawsToNCardsAllowingDiscardsEffect(activePlayer, num, cardOrType);
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

function discardForEffect(cardOrType, effect, altEffect) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardCardForEffect(activePlayer, cardOrType, effect, altEffect);
    };
}

function gainCard(card) {
    return label(function(game, activePlayer, otherPlayers) {
        game.playerGainsCardEffect(activePlayer, card);
    }, 'Gain ' + card.name);
}

function gainCardIntoHand(card) {
    return label(function(game, activePlayer, otherPlayers) {
        game.playerGainsCardIntoHandEffect(activePlayer, card);
    }, 'Gain ' + card.name + ' into hand');
}

function otherPlayersGainCards(cards) {
    return function(game, activePlayer, otherPlayers) {
        game.playersGainCardsAttack(otherPlayers, cards);
    };
}

function otherPlayersDiscardUntilCurseOrVictory() {
    return function(game, activePlayer, otherPlayers) {
        game.playersDiscardExceptCurseOrVictoryAttack(otherPlayers);
    };
}

function gainCardOntoDeck(card) {
    return function(game, activePlayer, otherPlayers) {
        game.playersGainCardsEffect([activePlayer], [card], true);
    };
}

function gainCardCosting(minCost, maxCost, cardOrType, intoHand) {
    return function(game, activePlayer, otherPlayers) {
        game.playerChoosesGainedCardEffect(activePlayer, minCost, maxCost, cardOrType, intoHand);
    };
}

function trashCardsForEffect(cardOrType, effect, n) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, n, n, cardOrType, function(cards) {
            if (cards.length === n) {
                game.pushGameEvent(effect);
            }
        });
    };
}

function chooseEffect(effects) {
    chooseNEffects(1, effects);
}

function otherPlayersChooseEffect(effects) {
    return function(game, activePlayer, otherPlayers) {
        game.playersChooseEffectAttack(otherPlayers, effects);
    };
}

function chooseNEffects(n, effects) {
    if (!_.isArray(effects)) {
        throw new Error('Must be array');
    }
    return function(game, activePlayer, otherPlayers) {
        game.playerChoosesNEffects(activePlayer, n, effects);
    };
}

function trashThisCard() {
    return function(game, activePlayer, otherPlayers) {
        game.trashCardInPlayEffect(game.activeInPlayCard());
    };
}

function increaseCardDiscountBy(num) {
    return function(game, activePlayer, otherPlayers) {
        game.increaseCardDiscountBy(num);
    };
}

function increaseCopperValueBy(num) {
    return function(game, activePlayer, otherPlayers) {
        game.increaseCopperValueBy(num);
    };
}

// Note: type of card trashed is assumed to match type of card gained.
//       e.g. All -> All, or Treasure -> Treasure
function trashCardToGainUpToPlusCost(plusCost, cardOrType, intoHand) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, 1, 1, cardOrType, function(cards) {
            if (cards.length === 1) {
                var card = cards[0];
                var maxCost = game.computeEffectiveCardCost(card) + plusCost;
                game.pushGameEvent(gainCardCosting(0, maxCost, cardOrType, intoHand));
            }
        });
    };
};

function trashCardToGainExactlyPlusCost(plusCost, cardOrType, intoHand) {
    return function(game, activePlayer, otherPlayers) {
        game.playerTrashesCardsEffect(activePlayer, 1, 1, cardOrType, function(cards) {
            if (cards.length === 1) {
                var card = cards[0];
                var maxCost = game.computeEffectiveCardCost(card) + plusCost;
                game.pushGameEvent(gainCardCosting(maxCost, maxCost, cardOrType, intoHand));
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

function revealUniqueCardsForCoins(num) {
    return function(game, activePlayer, otherPlayers) {
        game.playerDiscardsUniqueCardsForCoins(activePlayer, num);
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

function jesterAttack() {
    return function(game, activePlayer, otherPlayers) {
        game.playersDiscardCardJesterAttack(activePlayer, otherPlayers);
    };
}

function thiefAttack(cardOrType, number) {
    return function(game, activePlayer, otherPlayers) {
        game.trashAndMaybeGainCardsAttack(activePlayer, otherPlayers, cardOrType, number);
    };
}

function swindlerAttack() {
    return function(game, activePlayer, otherPlayers) {
        game.swindlerAttack(activePlayer, otherPlayers);
    };
};

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

function ironworksEffect() {
    return function(game, activePlayer, otherPlayers) {
        game.ironworksEffect(activePlayer);
    };
}

function testPlayedActionCount(num, effects) {
    return function(game, activePlayer, otherPlayers) {
        game.testPlayedActionCount(num, effects);
    };
};

function revealAndDrawOrReorderCards(num, cardOrType) {
    return function(game, activePlayer, otherPlayers) {
        game.revealAndDrawOrReorderCards(activePlayer, num, cardOrType);
    };
}

function offerTrashForEffect(effect) {
    return function(game, activePlayer, otherPlayers) {
        game.offerTrashForEffect(activePlayer, game.activeInPlayCard(), effect);
    };
};

function wishForCardReveal(effect) {
    return function(game, activePlayer, otherPlayers) {
        game.wishForCardReveal(activePlayer);
    };
};

// Reactions

function revealToAvoidAttack() {
    return function(game, reactingPlayer) {
        return true;
    };
}

// VP counts
// They take the user's full deck as their argument.

function vpPerNCards(cardsPerVP, cardOrType) {
    return function(deck) {
        var matchingCards = Cards.filter(deck, cardOrType);
        return Math.floor(matchingCards.length / cardsPerVP);
    };
}

function vpPerNDistinctCards(vpPerIncrement, cardsPerIncrement) {
    return function(deck) {
        var uniqueCards = Cards.uniq(deck);
        return Math.floor(uniqueCards.length / cardsPerIncrement) * vpPerIncrement;
    };
}

function drawUniqueCard() {
    return function(game, activePlayer, otherPlayers) {
        game.playerDrawForUniqueCard(activePlayer);
    };
}

function gainFromHornOfPlenty() {
    return function(game, activePlayer, otherPlayers) {
        game.playerGainCardFromHornOfPlenty(activePlayer);
    };
}

function masqueradeEffect() {
    return function(game, activePlayer, otherPlayers) {
        game.masqueradeEffect(activePlayer, otherPlayers);
    };
};

/**
 * @constructor
 */
function Card(properties) {
    _.extend(this, properties);

    var filename = this.name.toLowerCase().replace(/\s+/g, '') + '.jpg';
    this.assetURL = [Cards.AssetRoot, this.set, filename].join('/');
}

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

// A basic treasure is a treasure with a fixed number of coins
// and no effects when played.
// This terminology is only used in the UI.
Card.prototype.isBasicTreasure = function () {
    return _.isNumber(this.money);
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
    } else if (_.isArray(cardOrType)) {
        return _.some(cardOrType, function(cardOrType) {
            return this.matchesCardOrType(cardOrType);
        }, this);
    }

    console.error('Unknown card or card type', cardOrType);
    return false;
};

// Dummy Cards
// TODO: make views instead of cards.

Cards.Trash = new Card({
    name: 'Trash',
    set: 'basecards'
});

Cards.Cardback = new Card({
    name: 'Cardback',
    set: 'basecards'
});

// Basic Cards

Cards.Copper = new Card({
    name: 'Copper',
    cost: 0,
    money: 1,
    set: 'basecards'
});

Cards.Silver = new Card({
    name: 'Silver',
    cost: 3,
    money: 2,
    set: 'basecards'
});

Cards.Gold = new Card({
    name: 'Gold',
    cost: 6,
    money: 3,
    set: 'basecards'
});

Cards.Estate = new Card({
    name: 'Estate',
    cost: 2,
    vp: 1,
    set: 'basecards'
});

Cards.Duchy = new Card({
    name: 'Duchy',
    cost: 5,
    vp: 3,
    set: 'basecards'
});

Cards.Province = new Card({
    name: 'Province',
    cost: 8,
    vp: 6,
    set: 'basecards'
});

Cards.Curse = new Card({
    name: 'Curse',
    cost: 0,
    vp: -1,
    set: 'basecards'
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
    effects: [trashCardToGainUpToPlusCost(3, Card.Type.Treasure, true)],
    set: 'base'
});

Cards.Militia = new Card({
    name: 'Militia',
    cost: 4,
    effects: [gainCoins(2), otherPlayersDiscardTo(3)],
    attack: true,
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
    effects: [trashCardsForEffect(Cards.Copper, gainCoins(3), 1)],
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
    attack: true,
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
    attack: true,
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

Cards.Baron = new Card({
    name: 'Baron',
    cost: 4,
    effects: [discardForEffect(Cards.Estate, gainCoins(4), gainCard(Cards.Estate))],
    set: 'intrigue'
});

Cards.Bridge = new Card({
    name: 'Bridge',
    cost: 4,
    effects: [gainBuys(1), gainCoins(1), increaseCardDiscountBy(1)],
    set: 'intrigue'
});

Cards.Conspirator = new Card({
    name: 'Conspirator',
    cost: 4,
    effects: [
        gainCoins(2),
        testPlayedActionCount(3, [gainActions(1), drawCards(1)])],
    set: 'intrigue'
});

Cards.Coppersmith = new Card({
    name: 'Coppersmith',
    cost: 4,
    effects: [increaseCopperValueBy(1)],
    set: 'intrigue'
});

Cards.Courtyard = new Card({
    name: 'Courtyard',
    cost: 2,
    effects: [drawCards(3), discardOntoDeck(1)],
    set: 'intrigue'
});

Cards.Duke = new Card({
    name: 'Duke',
    cost: 5,
    vp: vpPerNCards(1, Cards.Duchy),
    set: 'intrigue'
});

Cards.GreatHall = new Card({
    name: 'Great Hall',
    cost: 3,
    effects: [drawCards(1), gainActions(1)],
    vp: 1,
    set: 'intrigue'
});

Cards.Harem = new Card({
    name: 'Harem',
    cost: 6,
    money: 2,
    vp: 2,
    set: 'intrigue'
});

Cards.Ironworks = new Card({
    name: 'Ironworks',
    cost: 4,
    effects: [ironworksEffect()],
    set: 'intrigue'
});

Cards.Masquerade = new Card({
    name: 'Masquerade',
    cost: 3,
    effects: [drawCards(2), masqueradeEffect()],
    set: 'intrigue'
});

Cards.MiningVillage = new Card({
    name: 'Mining Village',
    cost: 4,
    effects: [offerTrashForEffect(gainCoins(2)), gainActions(2), drawCards(1)],
    set: 'intrigue'
});

Cards.Nobles = new Card({
    name: 'Nobles',
    cost: 6,
    effects: [chooseEffect([gainActions(2), drawCards(3)])],
    vp: 2,
    set: 'intrigue'
});

Cards.Pawn = new Card({
    name: 'Pawn',
    cost: 2,
    effects: [chooseNEffects(2, [gainActions(1), drawCards(1), gainBuys(1), gainCoins(1)])],
    set: 'intrigue'
});

Cards.Scout = new Card({
    name: 'Scout',
    cost: 4,
    effects: [gainActions(1), revealAndDrawOrReorderCards(4, Card.Type.Victory)],
    set: 'intrigue'
});

Cards.ShantyTown = new Card({
    name: 'Shanty Town',
    cost: 3,
    effects: [gainActions(2), revealAndTestHand(Cards.matchNone(Card.Type.Action), drawCards(2))],
    set: 'intrigue'
});

Cards.Steward = new Card({
    name: 'Steward',
    cost: 3,
    effects: [chooseEffect([drawCards(2), gainCoins(2), trashCards(2)])],
    set: 'intrigue'
});

Cards.Swindler = new Card({
    name: 'Swindler',
    cost: 3,
    effects: [gainCoins(2), swindlerAttack()],
    attack: true,
    set: 'intrigue'
});

Cards.Torturer = new Card({
    name: 'Torturer',
    cost: 5,
    effects: [drawCards(3),
              otherPlayersChooseEffect([discardCards(2), gainCardIntoHand(Cards.Curse)])],
    attack: true,
    set: 'intrigue'
});

Cards.TradingPost = new Card({
    name: 'Trading Post',
    cost: 5,
    effects: [trashCardsForEffect(Card.Type.All, gainCardIntoHand(Cards.Silver), 2)],
    set: 'intrigue'
});

Cards.Upgrade = new Card({
    name: 'Upgrade',
    cost: 5,
    effects: [drawCards(1), gainActions(1), trashCardToGainExactlyPlusCost(1, Card.Type.All)],
    set: 'intrigue'
});

Cards.WishingWell = new Card({
    name: 'Wishing Well',
    cost: 3,
    effects: [drawCards(1), gainActions(1), wishForCardReveal()],
    set: 'intrigue'
});

Cards.Intrigue = [
    Cards.Baron,
    Cards.Bridge,
    Cards.Conspirator,
    Cards.Coppersmith,
    Cards.Courtyard,
    Cards.Duke,
    Cards.GreatHall,
    Cards.Harem,
    Cards.Ironworks,
    Cards.Masquerade,
    Cards.MiningVillage,
    // Cards.Minion,
    Cards.Nobles,
    Cards.Pawn,
    // Cards.Saboteur,
    Cards.Scout,
    // Cards.SecretChamber,
    Cards.ShantyTown,
    Cards.Steward,
    Cards.Swindler,
    Cards.Torturer,
    Cards.TradingPost,
    // Cards.Tribute,
    Cards.Upgrade,
    Cards.WishingWell
];

Cards.Fortuneteller = new Card({
    name: 'Fortuneteller',
    cost: 3,
    effects: [gainCoins(2), otherPlayersDiscardUntilCurseOrVictory()],
    attack: true,
    set: 'cornucopia'
});

Cards.Fairgrounds = new Card({
    name: 'Fairgrounds',
    cost: 6,
    vp: vpPerNDistinctCards(2, 5),
    set: 'cornucopia'
});

Cards.FarmingVillage = new Card({
    name: 'Farming Village',
    cost: 4,
    effects: [gainActions(2), drawCardType(1, [Card.Type.Treasure, Card.Type.Action])],
    set: 'cornucopia'
});

Cards.Hamlet = new Card({
    name: 'Hamlet',
    cost: 2,
    effects: [
        drawCards(1), gainActions(1),
        discardForEffect(Card.Type.All, gainActions(1)),
        discardForEffect(Card.Type.All, gainBuys(1))],
    set: 'cornucopia'
});

Cards.Harvest = new Card({
    name: 'Harvest',
    cost: 5,
    effects: [revealUniqueCardsForCoins(4)],
    set: 'cornucopia'
});

Cards.HornOfPlenty = new Card({
    name: 'Horn Of Plenty',
    cost: 5,
    money: gainFromHornOfPlenty(),
    set: 'cornucopia'
});

Cards.HuntingParty = new Card({
    name: 'Hunting Party',
    cost: 5,
    effects: [drawCards(1), gainActions(1), drawUniqueCard()],
    set: 'cornucopia'
});

Cards.Jester = new Card({
    name: 'Jester',
    cost: 5,
    effects: [gainCoins(2), jesterAttack()],
    attack: true,
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
    Cards.Fairgrounds,
    Cards.Hamlet,
    Cards.HornOfPlenty,
    Cards.HuntingParty,
    Cards.Menagerie,
    Cards.Remake,
    Cards.Fortuneteller,
    Cards.Harvest,
    Cards.FarmingVillage,
    Cards.Jester
];

Cards.AllSets = [].concat(
    Cards.BaseSet, Cards.Intrigue, Cards.Cornucopia);

function Pile(card, count) {
    this.card = card;
    this.count = count;
}

module.exports.Card = Card;
module.exports.Cards = Cards;
module.exports.Pile = Pile;
