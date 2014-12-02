import _ = require('underscore');
import util = require('../util');
import base = require('../base');
import Game = require('../game');
import cards = require('../cards');
import Player = require('../player');
import decisions = require('../decisions');
import effects = require('../effects');

import e = effects;
var SetName = 'intrigue';

class BaronDiscardEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var matchingCards = cards.filterByCard(player.hand, cards.Estate);
        if (matchingCards.length === 0) {
            return e.Resolution.Advance;
        }

        return player.promptForDiscard(game, 0, 1, matchingCards, base.DiscardDestination.Discard, (discards:cards.Card[]) => {
            if (discards.length === 1) {
                game.incrementCoinCount(4)
            } else {
                game.playerGainsCard(player, cards.Estate);
            }

            return e.Resolution.Advance;
        });
    }

}

class ConspiratorGainEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        if (game.turnState.playedActionCount >= 3) {
            game.drawCards(player, 1);
            game.incrementActionCount(1);
        }

        return e.Resolution.Advance;
    }
}

class CoppersmithEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        game.increaseCopperValueBy(1);
        return e.Resolution.Advance;
    }
}

class DukeVPEffect implements e.VPEffect {
    calculatePoints(deck:cards.Card[]) : number {
        return util.count(deck, cards.Duchy);
    }
}

class IronworksEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var piles = game.filterGainablePiles(0, 4, cards.Type.All);
        if (piles.length === 0) {
            return e.Resolution.Advance;
        }

        return player.promptForGain(game, piles, (gainedCard:cards.Card) => {
            if (gainedCard.isAction()) {
                game.incrementActionCount(1);
            }

            if (gainedCard.isTreasure()) {
                game.incrementCoinCount(1);
            }

            if (gainedCard.isVictory()) {
                game.drawCards(player, 1);
            }

            return e.Resolution.Advance;
        });
    }
}

class MiningVillageTrashEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) : e.Resolution {
        var trashDecision = decisions.trashOrKeepCard(MiningVillage);
        var onDecide = (d:string) => {
            if (d === decisions.Options.Trash) {
                if (game.trashCardFromPlay(player, card)) {
                    game.incrementCoinCount(2);
                }
            }

            return e.Resolution.Advance;
        };

        return player.promptForDecision(game, trashDecision, onDecide);
    }
}

class MinionDiscardEffect implements e.LabelledEffect {

    getTarget() { return e.Target.AllPlayers; }
    getLabel() { return 'Discard and draw'; }

    process(game:Game, player:Player, card:cards.Card) {
        if (game.isActivePlayer(player) || player.hand.length >= 5) {
            game.discardHand(player);
            game.drawCards(player, 4);
        }

        return e.Resolution.Advance;
    }
}

class SaboteurEffect implements e.Effect {
    
    getTarget() { return e.Target.OtherPlayers; }

    process(game:Game, player:Player, card:cards.Card) {
        var results = player.takeCardsFromDeckUntil((c:cards.Card) => game.effectiveCardCost(c) >= 3);
        game.addCardsToDiscard(player, results.otherCards);

        if (!results.foundCard) {
            return e.Resolution.Advance;
        }

        var cost = game.effectiveCardCost(results.foundCard);
        var piles = game.filterGainablePiles(0, cost);

        if (piles.length === 0) {
            return e.Resolution.Advance;
        }

        game.addCardToTrash(player, results.foundCard);
        return game.playerGainsFromPiles(player, piles);
    }
}

class ScoutEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var revealedCards = player.takeCardsFromDeck(4);

        if (revealedCards.length == 0) {
            return e.Resolution.Advance;
        }

        var victoryCards = cards.getVictories(revealedCards);
        var remaining = cards.difference(revealedCards, victoryCards);

        victoryCards.forEach(c => game.drawTakenCard(player, c, true));

        if (remaining.length > 0) {
            return e.Resolution.Advance;
        } else {
            return player.promptForCardOrdering(game, remaining, orderedCards => {
                game.putCardsOnDeck(player, orderedCards);
                return e.Resolution.Advance;
            });
        }
    }
}

class ShantyTownEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        game.revealPlayerHand(player);

        if (cards.getActions(player.hand).length === 0) {
            game.drawCards(player, 2);
        }

        return e.Resolution.Advance;
    }

}

class SwindlerEffect implements e.Effect {

    getTarget() { return e.Target.OtherPlayers; }

    process(game:Game, player:Player, card:cards.Card) {
        var card = game.playerTrashedCardFromDeck(player);
        if (!card) {
            return e.Resolution.Advance;
        }

        var cost = game.effectiveCardCost(card);
        var piles = game.filterGainablePiles(cost, cost);

        if (piles.length == 0) {
            return e.Resolution.Advance;
        } else {
            return game.activePlayer.promptForGain(game, piles, null, 'Choose card to give', player);
        }
    }
}

class TributeEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var discardingPlayer = game.playerLeftOf(player);
        var discarded = cards.uniq(discardingPlayer.discardCardsFromDeck(2));

        discarded.forEach((c:cards.Card) => {
            if (c.isAction()) {
                game.incrementActionCount(2);
            }

            if (c.isTreasure()) {
                game.incrementCoinCount(2);
            }

            if (c.isVictory()) {
                game.drawCards(player, 2);
            }
        });

        return e.Resolution.Advance;
    }
}

class WishingWellEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var onSelect:e.PurchaseCallback = (picked:cards.Card, _:cards.Card[]) => {
            game.log(player, 'wishes for', picked);

            var revealed = game.revealCardFromDeck(player);
            if (revealed && revealed.isSameCard(picked)) {
                game.drawCards(player, 1);
            }

            return e.Resolution.Advance;
        };

        return player.promptForPileSelection(game, game.kingdomPiles, 'Wish for card', onSelect);
    }

}

// Game.prototype.masqueradeEffect = function(activePlayer, otherPlayers) {
//     var that = this;

//     function promptForMasquerade(player, callback) {
//         if (player.hand.length == 0) {
//             callback(null, [player, null]);
//         } else {
//             player.promptForHandSelection(this, 1, 1, player.hand, function(cards) {
//                 callback(null, [player, cards[0]]);
//             });
//         }
//     };

//     async.map(this.players, promptForMasquerade, function(err, results) {
//         results.forEach(function(p) {
//             var player = p[0], card = p[1];
//             if (card) {
//                 var nextPlayer = that.playerLeftOf(player);
//                 that.playerPassesCard(player, nextPlayer, card);
//             }
//         });

//         that.playerTrashedCardsEffect(activePlayer, 0, 1, Card.Type.All);
//     });
// };

export var Baron = new cards.Card({
    name: 'Baron',
    cost: 4,
    effects: [new BaronDiscardEffect()],
    set: SetName
});

export var Bridge = new cards.Card({
    name: 'Bridge',
    cost: 4,
    effects: [
        new e.GainBuysEffect(1),
        new e.GainCoinsEffect(1),
        new e.CardDiscountEffect(1)
    ],
    set: SetName
});

export var Conspirator = new cards.Card({
    name: 'Conspirator',
    cost: 4,
    effects: [
        new e.GainCoinsEffect(2),
        new ConspiratorGainEffect()
    ],
    set: SetName
});

export var Coppersmith = new cards.Card({
    name: 'Coppersmith',
    cost: 4,
    effects: [new CoppersmithEffect()],
    set: SetName
});

export var Courtyard = new cards.Card({
    name: 'Courtyard',
    cost: 2,
    effects: [
        new e.DrawEffect(3),
        new e.DiscardEffect(1, e.Target.ActivePlayer, base.DiscardDestination.Deck)
    ],
    set: SetName
});

export var Duke = new cards.Card({
    name: 'Duke',
    cost: 5,
    vp: new e.BasicVPEffect(1),
    set: SetName
});

export var GreatHall = new cards.Card({
    name: 'Great Hall',
    cost: 3,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1)
    ],
    vp: new e.BasicVPEffect(1),
    set: SetName
});

export var Harem = new cards.Card({
    name: 'Harem',
    cost: 6,
    money: 2,
    vp: new e.BasicVPEffect(2),
    set: SetName
});

export var Ironworks = new cards.Card({
    name: 'Ironworks',
    cost: 4,
    effects: [new IronworksEffect()],
    set: SetName
});

// Cards.Masquerade = new Card({
//     name: 'Masquerade',
//     cost: 3,
//     effects: [drawCards(2), masqueradeEffect()],
//     set: 'intrigue'
// });

export var MiningVillage = new cards.Card({
    name: 'Mining Village',
    cost: 4,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(2),
        new MiningVillageTrashEffect()],
    set: SetName
});

export var Minion = new cards.Card({
    name: 'Minion',
    cost: 5,
    effects: [
        new e.GainActionsEffect(1),
        new e.EffectChoiceEffect([
            new e.GainCoinsEffect(2),
            new MinionDiscardEffect()]),
    ],
    attack: true,
    set: SetName
});

export var Nobles = new cards.Card({
    name: 'Nobles',
    cost: 6,
    effects: [
        new e.EffectChoiceEffect([new e.GainActionsEffect(2), new e.DrawEffect(3)])
    ],
    vp: new e.BasicVPEffect(2),
    set: SetName
});

export var Pawn = new cards.Card({
    name: 'Pawn',
    cost: 2,
    effects: [new e.EffectChoiceEffect([
        new e.GainActionsEffect(1), new e.DrawEffect(1), new e.GainBuysEffect(1), new e.GainCoinsEffect(1)
        ], e.Target.ActivePlayer, 2)],
    set: SetName
});

export var Saboteur = new cards.Card({
    name: 'Saboteur',
    cost: 5,
    effects: [new SaboteurEffect()],
    attack: true,
    set: SetName
});

export var SecretChamber = new cards.Card({
    name: 'Secret Chamber',
    cost: 2,
    effects: [new e.DiscardForCoinsEffect()],
    // TODO
    reaction: [],
    set: SetName
});

export var Scout = new cards.Card({
    name: 'Scout',
    cost: 4,
    effects: [
        new e.GainActionsEffect(1),
        new ScoutEffect()],
    set: SetName
});

export var ShantyTown = new cards.Card({
    name: 'Shanty Town',
    cost: 3,
    effects: [
        new e.GainActionsEffect(2),
        new ShantyTownEffect()],
    set: SetName
});

export var Steward = new cards.Card({
    name: 'Steward',
    cost: 3,
    effects: [
        new e.EffectChoiceEffect([
            new e.DrawEffect(2),
            new e.GainCoinsEffect(2),
            new e.TrashEffect(e.Target.ActivePlayer, 2, 2)])
    ],
    set: SetName
});

export var Swindler = new cards.Card({
    name: 'Swindler',
    cost: 3,
    effects: [
        new e.GainCoinsEffect(2),
        new SwindlerEffect()],
    attack: true,
    set: SetName
});

export var Torturer = new cards.Card({
    name: 'Torturer',
    cost: 5,
    effects: [
        new e.DrawEffect(3),
        new e.EffectChoiceEffect([
                new e.DiscardEffect(2, e.Target.ChoosingPlayer),
                new e.GainCardEffect(cards.Curse, e.Target.ChoosingPlayer, base.GainDestination.Hand)
            ], e.Target.OtherPlayers)],
    attack: true,
    set: SetName
});

var GainSilverEffect = new e.GainCardEffect(
    cards.Silver, e.Target.ActivePlayer, base.GainDestination.Hand);

export var TradingPost = new cards.Card({
    name: 'Trading Post',
    cost: 5,
    effects: [
        new e.TrashForEffect(GainSilverEffect, cards.allCardsPredicate, 2)
    ],
    set: SetName
});

export var Tribute = new cards.Card({
    name: 'Tribute',
    cost: 5,
    effects: [new TributeEffect()],
    set: SetName
});

export var Upgrade = new cards.Card({
    name: 'Upgrade',
    cost: 5,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new e.TrashToGainPlusCostEffect(
            1, cards.Type.All,
            base.GainDestination.Discard,
            e.GainCostRestriction.ExactlyCost)
    ],
    set: SetName
});

export var WishingWell = new cards.Card({
    name: 'Wishing Well',
    cost: 3,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new WishingWellEffect()
    ],
    set: SetName
});

export var Cardlist:cards.Card[] = [
    Baron,
    Bridge,
    Conspirator,
    Coppersmith,
    Courtyard,
    Duke,
    GreatHall,
    Harem,
    Ironworks,
    // Masquerade,
    MiningVillage,
    Minion,
    Nobles,
    Pawn,
    Saboteur,
    Scout,
    SecretChamber,
    ShantyTown,
    Steward,
    Swindler,
    Torturer,
    TradingPost,
    Tribute,
    Upgrade,
    WishingWell
];
