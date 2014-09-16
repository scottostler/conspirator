import _ = require('underscore');
import util = require('./util');
import base = require('./base');
import game = require('./game');
import cards = require('./cards');
import Player = require('./player');
import decisions = require('./decisions');
import e = require('./effects');

var SetName = 'intrigue';

class BaronDiscardEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:game.Game, player:Player) {
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

    process(game:game.Game, player:Player) {
        if (game.playedActionCount >= 3) {
            game.drawCards(player, 1);
            game.incrementActionCount(1);
        }

        return e.Resolution.Advance;
    }
}

class CoppersmithEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:game.Game, player:Player) {
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

    process(game:game.Game, player:Player) {
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

    process(game:game.Game, player:Player) {
        var trashDecision = decisions.trashOrKeepCard(MiningVillage);
        return player.promptForDecision(game, trashDecision, (d:string) => {
            if (d === decisions.Options.Trash) {
                // TODO: handle already trashed
                game.trashCardFromPlay(game.activeInPlayCard());
                game.incrementCoinCount(2);
            }

            return e.Resolution.Advance;
        });
    }
}

class MinionDiscardEffect implements e.LabelledEffect {

    getTarget() { return e.Target.AllPlayers; }
    getLabel() { return 'Discard and draw'; }

    process(game:game.Game, player:Player) {
        if (game.isActivePlayer(player) || player.hand.length >= 5) {
            game.discardHand(player);
            game.drawCards(player, 4);
        }

        return e.Resolution.Advance;
    }
}

class ShantyTownEffect implements e.Effect {
    getTarget() { return e.Target.ActivePlayer; }

    process(game:game.Game, player:Player) {
        game.revealPlayerHand(player);

        if (cards.getActions(player.hand).length === 0) {
            game.drawCards(player, 2);
        }

        return e.Resolution.Advance;
    }

}

// Game.prototype.swindlerAttack = function(attackingPlayer, targetPlayers) {
//     var that = this;
//     var events = _.map(targetPlayers, function(targetPlayer) {
//         return function() {
//             var attack = function() {
//                 var card = that.trashCardFromDeck(targetPlayer);
//                 if (card) {
//                     var cost = that.effectiveCardCost(card);
//                     var gainablePiles = that.filterGainablePiles(cost, cost, Card.Type.All);
//                     if (gainablePiles.length > 0) {
//                         attackingPlayer.promptForPileSelection(that, gainablePiles, function(gainedCard) {
//                             that.playerGainsCard(targetPlayer, gainedCard);
//                             that.advanceGameState();
//                         });
//                     } else {
//                         that.advanceGameState();
//                     }
//                 } else {
//                     that.advanceGameState();
//                 }
//             };

//             that.allowReactionsToAttack(targetPlayer, attack);
//         };
//     });

//     this.pushGameEvents(events);
//     this.advanceGameState();
// };

// Game.prototype.revealAndDrawOrReorderCards = function(player, num, cardOrType) {
//     var that = this;
//     var revealedCards = player.takeCardsFromDeck(num);

//     this.log(player.name, 'reveals', revealedCards.join(', '));

//     var drawnCards = Cards.filter(revealedCards, cardOrType);
//     var cardsToOrder = _.difference(revealedCards, drawnCards);

//     if (drawnCards.length > 0) {
//         this.drawTakenCards(player, drawnCards, true);
//     }

//     if (cardsToOrder.length > 0) {
//         player.promptForCardOrdering(this, cardsToOrder, function(cards) {
//             that.putCardsOnDeck(player, cards);
//             that.advanceGameState();
//         });
//     } else {
//         this.advanceGameState();
//     }

// };

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

//         that.playerTrashesCardsEffect(activePlayer, 0, 1, Card.Type.All);
//     });
// };

// Game.prototype.wishForCardReveal = function(player) {
//     var that = this;
//     player.promptForCardNaming(this, function(card) {
//         that.log(player.name, 'wishes for', card.name);
//         var revealedCard = player.revealCardFromDeck();
//         if (revealedCard) {
//             that.log(player.name, 'reveals', revealedCard);
//             if (card.name === revealedCard.name) {
//                 that.drawCards(player, 1);
//             }
//         } else {
//             that.log(player.name, 'has no cards to reveal');
//         }

//         that.advanceGameState();
//     });
// };

// Game.prototype.tributeEffect = function(player, targetPlayer) {
//     var cards = Cards.uniq(this.discardCardsFromDeck(targetPlayer, 2));
//     var drawnCards = 0;
//     var gainedActions = 0;
//     var gainedCoins = 0;
//     _.each(cards, function(card) {
//         if (card.isAction()) {
//             gainedActions += 2;
//         }

//         if (card.isTreasure()) {
//             gainedCoins += 2;
//         }

//         if (card.isVictory()) {
//             drawnCards += 2;
//         }
//     }, this);

//     if (drawnCards > 0) {
//         this.drawCards(player, drawnCards);
//     }

//     if (gainedActions > 0) {
//         this.log(player.name, 'gains ' + gainedActions + ' actions');
//         this.incrementActionCount(gainedActions);
//     }

//     if (gainedCoins > 0) {
//         this.log(player.name, 'gains ' + gainedCoins + ' coins');
//         this.incrementCoinCount(gainedCoins);
//     }

//     this.advanceGameState();
// };

// Game.prototype.minionDiscardEffect = function(player, otherPlayers) {
//     var that = this;
//     this.discardHand(player);
//     this.drawCards(player, 4);

//     var attackEffects = _.map(otherPlayers, function(otherPlayer) {
//         return function() {
//             that.allowReactionsToAttack(otherPlayer, function() {
//                 if (otherPlayer.hand.length >= 5) {
//                     that.discardHand(otherPlayer);
//                     that.drawCards(otherPlayer, 4);
//                 }

//                 that.advanceGameState();
//             });
//         };
//     });

//     this.pushGameEvents(attackEffects);
//     this.advanceGameState();
// };

// Game.prototype.saboteurAttack = function(attackingPlayer, targetPlayers) {
//     var that = this;
//     var attacks = _.map(targetPlayers, function(targetPlayer) {
//         return function() {
//             that.allowReactionsToAttack(targetPlayer, function() {
//                 var r = targetPlayer.takeCardsFromDeckUntil(function(card) {
//                     return card.cost >= 3 && card.cost <= 6;
//                 });

//                 var trashedCard = r[0];
//                 var takenCards = r[1];

//                 if (takenCards.length > 0) {
//                     that.log(targetPlayer.name, 'reveals', takenCards.join(', '));
//                     targetPlayer.addCardsToDiscard(takenCards);
//                 }

//                 if (trashedCard) {
//                     that.log(attackingPlayer.name, 'trashes', util.possessive(targetPlayer.name), trashedCard.name);
//                     that.addCardToTrash(trashedCard);

//                     var gainablePiles = that.filterGainablePiles(0, trashedCard.cost - 2, Card.Type.All);
//                     if (gainablePiles.length > 0) {
//                         targetPlayer.promptForGain(this, gainablePiles, function(card) {
//                             that.playerGainsCard(targetPlayer, card);
//                             that.advanceGameState();
//                         });
//                     } else {
//                         that.advanceGameState();
//                     }
//                 } else {
//                     that.advanceGameState();
//                 }
//             });
//         };
//     });

//     this.pushGameEvents(attacks);
//     this.advanceGameState();
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

// Cards.Saboteur = new Card({
//     name: 'Saboteur',
//     cost: 5,
//     effects: [saboteurAttack()],
//     set: 'intrigue'
// });

// Cards.SecretChamber = new Card({
//     name: 'Secret Chamber',
//     cost: 2,
//     effects: [discardForCoins()],
//     reaction: drawAndPutBackCards(2),
//     set: 'intrigue'
// });

// Cards.Scout = new Card({
//     name: 'Scout',
//     cost: 4,
//     effects: [gainActions(1), revealAndDrawOrReorderCards(4, Card.Type.Victory)],
//     set: 'intrigue'
// });

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

// Cards.Swindler = new Card({
//     name: 'Swindler',
//     cost: 3,
//     effects: [gainCoins(2), swindlerAttack()],
//     attack: true,
//     set: 'intrigue'
// });

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
    set: 'intrigue'
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

// Cards.Tribute = new Card({
//     name: 'Tribute',
//     cost: 5,
//     effects: [tributeEffect()],
//     set: 'intrigue'
// });

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

// Cards.WishingWell = new Card({
//     name: 'Wishing Well',
//     cost: 3,
//     effects: [drawCards(1), gainActions(1), wishForCardReveal()],
//     set: 'intrigue'
// });

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
    // Saboteur,
    // Scout,
    // SecretChamber,
    ShantyTown,
    Steward,
    // Swindler,
    Torturer,
    TradingPost,
    // Tribute,
    Upgrade,
    // WishingWell
];
