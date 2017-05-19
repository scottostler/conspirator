import { expectNonNull } from '../../test/testsupport';
import { nextInRing } from '../utils';
import { PassCardDecision } from '../decisions';
import { CardType, DiscardDestination, GainDestination } from '../base';
import { Card, CardInPlay, countByCard, ReactionType, uniq } from '../cards';
import * as decisions from '../decisions';
import { Effect, EffectTemplate, Target, VPEffect } from '../effects';
import * as effects from '../effects';
import Game, { GameStep } from '../game';
import { Player, PlayerIdentifier } from '../player';
import * as utils from '../utils';
import {
    BasicVPEffect,
    CardDiscountEffect,
    Curse,
    DiscardConditions,
    DiscardEffect,
    DiscardForCoinsEffect,
    DiscardForEffect,
    DiscardHandEffect,
    DrawFourCards,
    DrawOneCard,
    DrawThreeCards,
    DrawTwoCards,
    Duchy,
    EffectChoice,
    EffectSequence,
    Estate,
    GainCardEffect,
    GainCostRestriction,
    GainFourCoins,
    GainOneAction,
    GainOneBuy,
    GainOneCoin,
    GainTwoActions,
    GainTwoCoins,
    MayTrashThisForEffect,
    Silver,
    TrashEffect,
    TrashForEffect,
    TrashToGainPlusCostEffect,
    TrashTwoCards
} from './common';


const SetName = 'Intrigue';

class ConspiratorDrawEffect extends EffectTemplate {
    
    target = Target.ActivePlayer;
    label = "Conspirator Bonus";

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        if (game.turnState.playedActionCount >= 3) {
            game.drawCards(player, 1);
            game.incrementActionCount(1);
        }
        return null;
    }
}


class DukeVPEffect implements VPEffect {
    calculatePoints(deck: Card[]) : number {
        return countByCard(deck, Duchy);
    }
}

class IronworksEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    label = "Ironworks Gain"

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const gainableCards = game.filterGainablePiles(0, 4, CardType.All).map(p => p.card);
        if (gainableCards.length == 0) {
            return null;
        }
        const followup = (game: Game, choice: CardInPlay[]) : GameStep => {
            const card = utils.listToOption(choice);
            if (card) {
                if (card.isAction) {
                    game.incrementActionCount(1);
                }
                if (card.isTreasure) {
                    game.incrementCoinCount(1);
                }
                if (card.isVictory) {
                    game.drawCards(player, 1);
                }
            }
            return null;
        }

        return new decisions.GainFromPileDecision(player.identifier, trigger, gainableCards, GainDestination.Discard, true, followup);
    }
}

class MasqueradeEffect extends EffectTemplate {
    target = Target.ActivePlayer;
    label = "Masquerade Effect"

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        return new MasqueradeEffectImpl(game, trigger);
    }
}

type CardPassPairs = [PlayerIdentifier, PlayerIdentifier, CardInPlay];

class MasqueradeEffectImpl extends Effect {
    label = "Masquerade Effect Impl"

    readonly participatingPlayers: PlayerIdentifier[];
    readonly remainingPlayers: PlayerIdentifier[];
    readonly cardsToPass : CardPassPairs[] = [];

    constructor(game: Game, readonly trigger: CardInPlay) {
        super();
        this.participatingPlayers = game.players.filter(p => !p.hand.empty).map(p => p.identifier);
        this.remainingPlayers = this.participatingPlayers.slice();
    }

    distributeCards(game: Game) : GameStep {
        for (const [fromPlayer, toPlayer, card] of this.cardsToPass) {
            game.playerPassesCard(game.playerForIdentifier(fromPlayer), game.playerForIdentifier(toPlayer), card);
        }
        return null;
    }

    resolve(game: Game) : GameStep {
        let fromPlayer: PlayerIdentifier | undefined;
        if (fromPlayer = this.remainingPlayers.shift()) {
            const playerObject = game.playerForIdentifier(fromPlayer);
            const toPlayer = nextInRing(this.participatingPlayers, fromPlayer);
            const followup = (game: Game, choice: CardInPlay[]) => {
                const card = choice[0];
                this.cardsToPass.push([fromPlayer!, toPlayer, card]);
                return this;
            };
            return new PassCardDecision(fromPlayer, toPlayer, this.trigger, playerObject.hand.cards, followup);
        } else {
            return this.distributeCards(game);
        }
    }
}

class MinionDiscardAttack extends EffectTemplate {

    target = Target.OtherPlayers;
    label = 'Minion Discard Attack'

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        if (player.hand.count >= 5) {
            game.discardHand(player);
            game.drawCards(player, 4);
        }
        return null;
    }
}

class ShantyTownEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    label = "Shanty Town Draw";

    resolve(game:Game, player: Player, trigger: CardInPlay) {
        game.revealPlayerHand(player);
        const actions = player.hand.ofType(CardType.Action);
        if (actions.length == 0) {
            game.drawCards(player, 2);
        }
        return null;
    }

}

class SwindlerAttack extends EffectTemplate {
    
    target = Target.OtherPlayers;
    label = "Swindler Attack";;

    resolve(game: Game, targetPlayer: Player, trigger: CardInPlay) {
        const trashedCard = targetPlayer.topCardOfDeck(game);
        if (!trashedCard) {
            return null;
        }

        game.trashCards(targetPlayer, [trashedCard]);

        const trashedCost = game.effectiveCardCost(trashedCard);
        const gainableCards = game.filterGainablePiles(trashedCost, trashedCost).map(p => p.card);

        if (gainableCards.length == 0) {
            return null;
        }
        
        return new decisions.GainFromPileDecision(
            game.activePlayer.identifier, trigger, gainableCards,
            GainDestination.Discard, true, null, targetPlayer.identifier);
    }
}

class TributeEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    label = "Tribute Effect"

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        const discardingPlayer = game.playerLeftOf(player);
        const discardedCards = game.discardFromDeck(discardingPlayer, 2);
        
        for (const c of uniq(discardedCards)) {
            if (c.isAction) {
                game.incrementActionCount(2);
            }

            if (c.isTreasure) {
                game.incrementCoinCount(2);
            }

            if (c.isVictory) {
                game.drawCards(player, 2);
            }
        }

        return null;
    }
}

class WishingWellEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    label = "Wishing Well Effect"

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        const followup = (game: Game, choice: Card[]) => {
            const named = choice[0];
            const revealed = game.revealCardFromDeck(player);
            if (revealed && revealed.isSameCard(named)) {
                game.drawCards(player, 1);
            }
            return null;
        }
        return new decisions.NameCardDecision(player.identifier, trigger, game.allCardsInGame(), followup);
    }
}

export const Baron = new Card({
    name: 'Baron',
    cost: 4,
    effects: [
        GainOneBuy,
        new DiscardForEffect(DiscardConditions.card(Estate), GainFourCoins, new GainCardEffect(Estate))
    ],
    set: SetName
});

export const Bridge = new Card({
    name: 'Bridge',
    cost: 4,
    effects: [
        GainOneBuy,
        GainOneCoin,
        new CardDiscountEffect(1)
    ],
    set: SetName
});

export const Conspirator = new Card({
    name: 'Conspirator',
    cost: 4,
    effects: [
        GainTwoCoins,
        new ConspiratorDrawEffect()
    ],
    set: SetName
});

export const Courtyard = new Card({
    name: 'Courtyard',
    cost: 2,
    effects: [
        DrawThreeCards,
        new DiscardEffect(1, Target.ActivePlayer, DiscardDestination.Deck)
    ],
    set: SetName
});

export const Duke = new Card({
    name: 'Duke',
    cost: 5,
    vp: new DukeVPEffect(),
    set: SetName
});

export const GreatHall = new Card({
    name: 'Great Hall',
    cost: 3,
    effects: [DrawOneCard, GainOneAction],
    vp: new BasicVPEffect(1),
    set: SetName
});

export const Harem = new Card({
    name: 'Harem',
    cost: 6,
    money: 2,
    vp: new BasicVPEffect(2),
    set: SetName
});

export const Ironworks = new Card({
    name: 'Ironworks',
    cost: 4,
    effects: [new IronworksEffect()],
    set: SetName
});

export const Masquerade = new Card({
    name: 'Masquerade',
    cost: 3,
    effects: [
        DrawTwoCards,
        new MasqueradeEffect(),
        new TrashEffect(0, 1)
    ],
    set: SetName
});

export const MiningVillage = new Card({
    name: 'Mining Village',
    cost: 4,
    effects: [
        DrawOneCard,
        GainTwoActions,
        new MayTrashThisForEffect(GainTwoCoins)
    ],
    set: SetName
});

export const MinionChoiceEffect = new EffectChoice([
    GainTwoCoins,
    new EffectSequence(new DiscardHandEffect(), DrawFourCards, new MinionDiscardAttack())]);

export const Minion = new Card({
    name: 'Minion',
    cost: 5,
    effects: [GainOneAction, MinionChoiceEffect],
    attack: true,
    set: SetName
});

export const Nobles = new Card({
    name: 'Nobles',
    cost: 6,
    effects: [
        new EffectChoice([GainTwoActions, DrawThreeCards])
    ],
    vp: new BasicVPEffect(2),
    set: SetName
});

export const Pawn = new Card({
    name: 'Pawn',
    cost: 2,
    effects: [new EffectChoice(
        [GainOneAction, DrawOneCard, GainOneBuy, GainOneCoin],
        Target.ActivePlayer,
        2)],
    set: SetName
});

export const SecretChamber = new Card({
    name: 'Secret Chamber',
    cost: 2,
    effects: [new DiscardForCoinsEffect()],
    reaction: [ReactionType.OnAttack,
        [DrawTwoCards, new DiscardEffect(2, Target.ActivePlayer, DiscardDestination.Deck)]],
    set: SetName
});

export const ShantyTown = new Card({
    name: 'Shanty Town',
    cost: 3,
    effects: [
        GainTwoActions,
        new ShantyTownEffect()],
    set: SetName
});

export const Steward = new Card({
    name: 'Steward',
    cost: 3,
    effects: [
        new EffectChoice([DrawTwoCards, GainTwoCoins, TrashTwoCards])
    ],
    set: SetName
});

export const Swindler = new Card({
    name: 'Swindler',
    cost: 3,
    effects: [
        GainTwoCoins,
        new SwindlerAttack()],
    attack: true,
    set: SetName
});

export const TorturerDiscard = new DiscardEffect(2, Target.ChoosingPlayer);
export const GainCurseIntoHand = new GainCardEffect(Curse, Target.ChoosingPlayer, GainDestination.Hand);

export const Torturer = new Card({
    name: 'Torturer',
    cost: 5,
    effects: [
        DrawThreeCards,
        new EffectChoice([TorturerDiscard, GainCurseIntoHand], Target.OtherPlayers)],
    attack: true,
    set: SetName
});

const GainSilverEffect = new GainCardEffect(
    Silver, Target.ActivePlayer, GainDestination.Hand);

export const TradingPost = new Card({
    name: 'Trading Post',
    cost: 5,
    effects: [
        new TrashForEffect(GainSilverEffect, 2)
    ],
    set: SetName
});

export const Tribute = new Card({
    name: 'Tribute',
    cost: 5,
    effects: [new TributeEffect()],
    set: SetName
});

export const Upgrade = new Card({
    name: 'Upgrade',
    cost: 5,
    effects: [
        DrawOneCard,
        GainOneAction,
        new TrashToGainPlusCostEffect(
            1, CardType.All,
            GainDestination.Discard,
            GainCostRestriction.ExactlyCost)
    ],
    set: SetName
});

export const WishingWell = new Card({
    name: 'Wishing Well',
    cost: 3,
    effects: [ DrawOneCard, GainOneAction, new WishingWellEffect()],
    set: SetName
});

export const Cardlist: Card[] = [
    Baron,
    Bridge,
    Conspirator,
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
