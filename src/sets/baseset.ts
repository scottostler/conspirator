import * as _ from 'underscore';

import { CardType, DiscardDestination, GainDestination } from '../base';
import { makeIsCardPredicate, removeIdentical, Card, CardInPlay, ReactionType } from '../cards';
import * as decisions from '../decisions';
import {
    AttackReactionEffectTemplate,
    Effect,
    EffectTemplate,
    PlayActionEffect,
    Target,
    VPEffect
} from '../effects';

import {
    Copper,
    Curse,
    Silver,
    DiscardToEffect,
    DrawEffect,
    GainActionsEffect,
    GainBuysEffect,
    GainCardEffect,
    GainCardWithCostEffect,
    GainCoinsEffect,
    PlayActionManyTimesEffect,
    TrashEffect,
    TrashThisCardEffect,
    TrashForEffect,
    TrashToGainPlusCostEffect
} from './common';

import Game, { GameStep } from '../game';
import { Player } from '../player';
import * as utils from '../utils';

export const SetName = 'Base';

class BureaucratDiscardEffect extends EffectTemplate {

    get target() { return Target.OtherPlayers; }
    get label() : string { return 'Bureaucrat Attack'; }
    
    resolve(game: Game, target: Player, trigger: CardInPlay) {
        const vpCards = target.hand.ofType(CardType.Victory);
        if (vpCards.length > 0) {
            return new decisions.DiscardCardDecision(target.identifier, trigger, 1, 1, vpCards, DiscardDestination.Deck, null, true);
        } else {
            game.revealPlayerHand(target);
            return null;
        }
    }
}

class ChancellorEffect extends EffectTemplate {

    get target() { return Target.ActivePlayer; }
    get label() : string { return 'Chancellor Effect'; }

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        return new decisions.DiscardDeckDecision(player.identifier, trigger);
    }
}

class DiscardToDrawEffect extends EffectTemplate {

    get target() { return Target.ActivePlayer; }
    get label() : string { return 'Discard to Draw'; }

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        const drawFollowup = (game: Game, choices: CardInPlay[]) => {
            if (choices.length > 0) {
                game.drawCards(player, choices.length);
            }
            return null;
        }
        return new decisions.DiscardCardDecision(player.identifier, trigger, 0,
                                                 player.hand.count, player.hand.cards,
                                                 DiscardDestination.Discard, drawFollowup);
    }
}

class GardenVPEffect implements VPEffect {
    calculatePoints(deck: CardInPlay[]) : number {
        const cardsPerVP = 10;
        return Math.floor(deck.length / cardsPerVP);
    }
}

class LibraryDrawEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    label = "Library Draw"

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        return new LibraryDrawEffectImpl(player, trigger);
    }
}

class LibraryDrawEffectImpl extends Effect {
    label = "Library Draw"
    readonly setAsideCards: CardInPlay[] = [];

    constructor(readonly player: Player, readonly trigger: CardInPlay) {
        super();
    }

    resolve(game: Game) : GameStep {
        const handLimit = 7;
        let topCard: CardInPlay | null;

        if (this.player.hand.count >= handLimit || !(topCard = this.player.topCardOfDeck(game))) {
            game.discardCards(this.player, this.setAsideCards);
            return null;
        }

        game.drawCards(this.player, 1);

        if (topCard.isAction) {
            const followup = (game: Game, choice: CardInPlay[]) => {
                const card = utils.listToOption(choice);
                if (card) {
                    this.setAsideCards.push(card);
                }
                return this;
            };
            return new decisions.SetAsideCardDecision(this.player.identifier, this.trigger, topCard, followup);
        } else {
            return this;
        }
    }
}

class MoatReaction extends AttackReactionEffectTemplate {

    label = "Moat Reaction"

    resolve(game: Game, target: Player, trigger: CardInPlay, actionEffect: PlayActionEffect) : GameStep {
        actionEffect.giveAttackImmunity(target.identifier);
        return null;
    }
}

class SpyAttackEffect extends EffectTemplate {

    target = Target.AllPlayers;
    label = "Spy Attack";

    resolve(game: Game, player: Player, trigger: CardInPlay) {
        const attackingPlayer = game.activePlayer;
        const revealedCard = game.revealCardFromDeck(player);
        if (revealedCard) {
            return new decisions.DiscardCardDecision(attackingPlayer.identifier, trigger, 0, 1, [revealedCard], DiscardDestination.Discard);
        } else {
            return null;
        }
    }
}

// Cards

export const Bureaucrat = new Card({
    name: 'Bureaucrat',
    cost: 4,
    attack: true,
    effects: [
        new GainCardEffect(Silver, Target.ActivePlayer, GainDestination.Deck),
        new BureaucratDiscardEffect()],
    set: SetName
});

export const Cellar = new Card({
    name: 'Cellar',
    cost: 2,
    effects: [
        new GainActionsEffect(1),
        new DiscardToDrawEffect()],
    set: SetName
});

export const Chancellor = new Card({
    name: 'Chancellor',
    cost: 3,
    effects: [
        new GainCoinsEffect(2),
        new ChancellorEffect()],
    set: SetName
});

export const Chapel = new Card({
    name: 'Chapel',
    cost: 2,
    effects: [new TrashEffect(0, 4)],
    set: SetName
});

export const CouncilRoom = new Card({
    name: 'Council Room',
    cost: 5,
    effects: [
        new DrawEffect(4),
        new GainBuysEffect(1),
        new DrawEffect(1, Target.OtherPlayers)],
    set: SetName
});

export const Feast = new Card({
    name: 'Feast',
    cost: 4,
    effects: [
        new TrashThisCardEffect(),
        new GainCardWithCostEffect(0, 5)],
    set: SetName
});

export const Festival = new Card({
    name: 'Festival',
    cost: 5,
    effects: [
        new GainActionsEffect(2),
        new GainBuysEffect(1),
        new GainCoinsEffect(2)],
    set: SetName
});

export const Gardens = new Card({
    name: 'Gardens',
    cost: 4,
    vp: new GardenVPEffect(),
    set: SetName
});

export const Laboratory = new Card({
    name: 'Laboratory',
    cost: 5,
    effects: [
        new DrawEffect(2),
        new GainActionsEffect(1)],
    set: SetName
});

export const Library = new Card({
    name: 'Library',
    cost: 5,
    effects: [new LibraryDrawEffect()],
    set: SetName
});

export const Market = new Card({
    name: 'Market',
    cost: 5,
    effects: [
        new DrawEffect(1),
        new GainActionsEffect(1),
        new GainBuysEffect(1),
        new GainCoinsEffect(1)],
    set: SetName
});

export const Mine = new Card({
    name: 'Mine',
    cost: 5,
    effects: [new TrashToGainPlusCostEffect(3, CardType.Treasure, GainDestination.Hand)],
    set: SetName
});

export const Militia = new Card({
    name: 'Militia',
    cost: 4,
    effects: [
        new GainCoinsEffect(2),
        new DiscardToEffect(Target.OtherPlayers, 3)],
    attack: true,
    set: SetName
});

export const Moat = new Card({
    name: 'Moat',
    cost: 2,
    effects: [new DrawEffect(2)],
    reaction: [ReactionType.OnAttack, [new MoatReaction()]],
    set: SetName
});

export const Moneylender = new Card({
    name: 'Moneylender',
    cost: 4,
    effects: [
        new TrashForEffect(
            new GainCoinsEffect(3), 1,
            makeIsCardPredicate(Copper))],
    set: SetName
});

export const Remodel = new Card({
    name: 'Remodel',
    cost: 4,
    effects: [
        new TrashToGainPlusCostEffect(2)],
    set: SetName
});

export const Smithy = new Card({
    name: 'Smithy',
    cost: 4,
    effects: [new DrawEffect(3)],
    set: SetName
});

export const Spy = new Card({
    name: 'Spy',
    cost: 4,
    effects: [
        new DrawEffect(1),
        new GainActionsEffect(1),
        new SpyAttackEffect()],
    attack: true,
    set: SetName
});

export const ThroneRoom = new Card({
    name: 'Throne Room',
    cost: 4,
    effects: [new PlayActionManyTimesEffect(2)],
    set: SetName
});

export const Village = new Card({
    name: 'Village',
    cost: 3,
    effects: [new DrawEffect(1), new GainActionsEffect(2)],
    set: SetName
});

export const Witch = new Card({
    name: 'Witch',
    cost: 5,
    effects: [
        new DrawEffect(2),
        new GainCardEffect(Curse, Target.OtherPlayers, GainDestination.Discard)],
    attack: true,
    set: SetName
});

export const Woodcutter = new Card({
    name: 'Woodcutter',
    cost: 3,
    effects: [new GainCoinsEffect(2), new GainBuysEffect(1)],
    set: SetName
});

export const Workshop = new Card({
    name: 'Workshop',
    cost: 3,
    effects: [new GainCardWithCostEffect(0, 4)],
    set: SetName
});

export const Cardlist = [
    Bureaucrat,
    Cellar,
    Chapel,
    Chancellor,
    CouncilRoom,
    Feast,
    Festival,
    Gardens,
    Laboratory,
    Library,
    Market,
    Militia,
    Mine,
    Moat,
    Moneylender,
    Remodel,
    Smithy,
    Spy,
    ThroneRoom,
    Village,
    Witch,
    Woodcutter,
    Workshop
];
