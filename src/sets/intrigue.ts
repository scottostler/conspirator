import _ = require('underscore');

import * as base from '../base';
import * as cards from '../cards';
import * as decisions from '../decisions';
import * as effects from '../effects';
import Game from '../game';

import Player from '../player';
import * as util from '../util';

import DiscardDestination = base.DiscardDestination;
import e = effects;
import GainDestination = base.GainDestination;
import Resolution = effects.Resolution;

var SetName = 'Intrigue';

class BaronDiscardEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var matchingCards = cards.filterByCard(player.hand, cards.Estate);
        var decision = decisions.makeDiscardCardDecision(
            player, matchingCards, trigger, 0, 1, DiscardDestination.Discard);
        return player.promptForDiscardDecision(decision, cs => {
            if (cs.length > 0) {
                game.incrementCoinCount(4)
            } else {
                game.playerGainsCard(player, cards.Estate);
            }
            return e.Resolution.Advance;
        });
    }
}

class ConspiratorDrawEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        if (game.turnState.playedActionCount >= 3) {
            game.drawCards(player, 1);
            game.incrementActionCount(1);
        }

        return e.Resolution.Advance;
    }
}

class CoppersmithEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        game.increaseCopperValueBy(1);
        return e.Resolution.Advance;
    }
}

class DukeVPEffect implements e.VPEffect {
    calculatePoints(deck:cards.Card[]) : number {
        return cards.countByCard(deck, cards.Duchy);
    }
}

class IronworksEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var gainableCards = cards.cardsFromPiles(game.filterGainablePiles(0, 4, cards.Type.All));
        var decision = decisions.makeGainDecision(
            player, gainableCards, trigger, GainDestination.Discard);
        return player.promptForGainDecision(decision, cs => {
            if (cs.length > 0) {
                var gainedCard = cs[0];

                if (gainedCard.isAction()) {
                    game.incrementActionCount(1);
                }

                if (gainedCard.isTreasure()) {
                    game.incrementCoinCount(1);
                }

                if (gainedCard.isVictory()) {
                    game.drawCards(player, 1);
                }
            }

            return Resolution.Advance;
        });
    }
}


class MasqueradePassEffect implements e.Effect {

    getTarget() { return e.Target.AllPlayers; }
    process(game:Game, player:Player, trigger:cards.Card) {
        var targetPlayer = game.playerLeftOf(player);
        var decision = decisions.makePassCardDecision(player.hand, trigger, targetPlayer);
        return player.promptForCardDecision(decision, cs => {
            game.playerSelectsCardToPass(player, targetPlayer, cs[0]);
            return Resolution.Advance;
        });
    }
}

class MasqueradeReceiveEffect implements e.Effect {
    getTarget() { return e.Target.ActivePlayer; }
    process(game:Game, player:Player, trigger:cards.Card) {
        game.distributePassedCards();
        return Resolution.Advance;
    }
}

class MiningVillageTrashEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        if (!game.isExactCardInPlay(trigger)) {
            return Resolution.Advance;
        }

        var decision = decisions.makeTrashInPlayCardDecision(player, trigger, trigger);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0 && game.trashCardFromPlay(player, trigger)) {
                game.incrementCoinCount(2);
            }

            return Resolution.Advance;
        });
    }
}

class MinionDiscardEffect implements e.LabelledEffect {

    getTarget() { return e.Target.AllPlayers; }
    getLabel() { return 'Discard and draw four cards'; }

    process(game:Game, player:Player, trigger:cards.Card) {
        if (game.isActivePlayer(player) || player.hand.length >= 5) {
            game.discardHand(player);
            game.drawCards(player, 4);
        }

        return e.Resolution.Advance;
    }
}

class SaboteurEffect implements e.Effect {
    
    getTarget() { return e.Target.OtherPlayers; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var results = player.takeCardsFromDeckUntil(c => game.effectiveCardCost(c) >= 3);

        if (!results.foundCard) {
            game.addCardsToDiscard(player, results.otherCards);
            return e.Resolution.Advance;
        }

        var cost = game.effectiveCardCost(results.foundCard);
        var piles = game.filterGainablePiles(0, cost);

        game.addCardToTrash(player, results.foundCard);
        return player.gainsFromPiles(piles, trigger, base.GainDestination.Discard, c => {
            game.addCardsToDiscard(player, results.otherCards);
            return e.Resolution.Advance;
        });
    }
}

class ScoutEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var revealedCards = player.takeCardsFromDeck(4);

        if (revealedCards.length === 0) {
            return e.Resolution.Advance;
        }

        var victoryCards = cards.getVictories(revealedCards);
        var remaining = cards.difference(revealedCards, victoryCards);
        victoryCards.forEach(c => game.drawTakenCard(player, c, true));

        var decision = decisions.makeOrderCardsDecision(remaining, trigger);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                game.putCardsOnDeck(player, cs);
            }
            return e.Resolution.Advance;
        });
    }
}

class ShantyTownEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        game.revealPlayerHand(player);

        if (cards.getActions(player.hand).length === 0) {
            game.drawCards(player, 2);
        }

        return e.Resolution.Advance;
    }

}

class SwindlerEffect implements e.Effect {

    getTarget() { return e.Target.OtherPlayers; }

    process(game:Game, targetPlayer:Player, card:cards.Card) {
        var card = game.trashCardFromDeck(targetPlayer);
        if (!card) {
            return e.Resolution.Advance;
        }

        var cost = game.effectiveCardCost(card);
        var cs = cards.cardsFromPiles(game.filterGainablePiles(cost, cost));
        var decision = decisions.makeGainDecision(targetPlayer, cs, card, GainDestination.Discard);
        return game.activePlayer.promptForGainDecision(decision);
    }
}

class TributeEffect implements e.Effect {

    getTarget() { return e.Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var discardingPlayer = game.playerLeftOf(player);
        var discarded = cards.uniq(discardingPlayer.discardCardsFromDeck(2));

        discarded.forEach(c => {
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

    process(game:Game, player:Player, trigger:cards.Card) {
        var cs = cards.cardsFromPiles(game.kingdomPiles);
        var decision = decisions.makeNameCardDecision(cs, trigger);
        return player.promptForCardDecision(decision, cs => {
            var namedCard = cs[0];
            var revealed = game.revealCardFromDeck(player);
            if (revealed && revealed.isSameCard(namedCard)) {
                game.drawCards(player, 1);
            }
            return e.Resolution.Advance;
        });
    }
}

export var Baron = new cards.Card({
    name: 'Baron',
    cost: 4,
    effects: [
        e.GainOneBuy,
        new BaronDiscardEffect()
    ],
    set: SetName
});

export var Bridge = new cards.Card({
    name: 'Bridge',
    cost: 4,
    effects: [
        e.GainOneBuy,
        e.GainOneCoin,
        new e.CardDiscountEffect(1)
    ],
    set: SetName
});

export var Conspirator = new cards.Card({
    name: 'Conspirator',
    cost: 4,
    effects: [
        e.GainTwoCoins,
        new ConspiratorDrawEffect()
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
        e.DrawThreeCards,
        new e.DiscardEffect(1, e.Target.ActivePlayer, base.DiscardDestination.Deck)
    ],
    set: SetName
});

export var Duke = new cards.Card({
    name: 'Duke',
    cost: 5,
    vp: new DukeVPEffect(),
    set: SetName
});

export var GreatHall = new cards.Card({
    name: 'Great Hall',
    cost: 3,
    effects: [e.DrawOneCard, e.GainOneAction],
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

export var Masquerade = new cards.Card({
    name: 'Masquerade',
    cost: 3,
    effects: [
        e.DrawTwoCards,
        new MasqueradePassEffect(), new MasqueradeReceiveEffect(),
        new e.TrashEffect(0, 1)
    ],
    set: SetName
});

export var MiningVillage = new cards.Card({
    name: 'Mining Village',
    cost: 4,
    effects: [
        e.DrawOneCard,
        e.GainTwoActions,
        new MiningVillageTrashEffect()],
    set: SetName
});

export var MinionDiscard = new MinionDiscardEffect();

export var Minion = new cards.Card({
    name: 'Minion',
    cost: 5,
    effects: [
        e.GainOneAction,
        new e.EffectChoiceEffect([
            e.GainTwoCoins,
            MinionDiscard])
    ],
    attack: true,
    set: SetName
});

export var Nobles = new cards.Card({
    name: 'Nobles',
    cost: 6,
    effects: [
        new e.EffectChoiceEffect([e.GainTwoActions, e.DrawThreeCards])
    ],
    vp: new e.BasicVPEffect(2),
    set: SetName
});

export var Pawn = new cards.Card({
    name: 'Pawn',
    cost: 2,
    effects: [new e.EffectChoiceEffect(
        [e.GainOneAction, e.DrawOneCard, e.GainOneBuy, e.GainOneCoin],
        e.Target.ActivePlayer, 2)],
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
    reaction: [
        e.ReactionType.OnAttack,
        [e.DrawTwoCards, new e.DiscardEffect(2, e.Target.ActivePlayer, base.DiscardDestination.Deck)]],
    set: SetName
});

export var Scout = new cards.Card({
    name: 'Scout',
    cost: 4,
    effects: [
        e.GainOneAction,
        new ScoutEffect()],
    set: SetName
});

export var ShantyTown = new cards.Card({
    name: 'Shanty Town',
    cost: 3,
    effects: [
        e.GainTwoActions,
        new ShantyTownEffect()],
    set: SetName
});

export var Steward = new cards.Card({
    name: 'Steward',
    cost: 3,
    effects: [
        new e.EffectChoiceEffect([
            e.DrawTwoCards,
            e.GainTwoCoins,
            e.TrashTwoCards])
    ],
    set: SetName
});

export var Swindler = new cards.Card({
    name: 'Swindler',
    cost: 3,
    effects: [
        e.GainTwoCoins,
        new SwindlerEffect()],
    attack: true,
    set: SetName
});

export var TorturerDiscard = new e.DiscardEffect(2, e.Target.ChoosingPlayer);
export var GainCurseIntoHand = new e.GainCardEffect(cards.Curse, e.Target.ChoosingPlayer, base.GainDestination.Hand);

export var Torturer = new cards.Card({
    name: 'Torturer',
    cost: 5,
    effects: [
        e.DrawThreeCards,
        new e.EffectChoiceEffect([TorturerDiscard, GainCurseIntoHand], e.Target.OtherPlayers)],
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
        e.DrawOneCard,
        e.GainOneAction,
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
        e.DrawOneCard, e.GainOneAction,
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
    Masquerade,
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
