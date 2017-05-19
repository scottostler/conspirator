import * as _ from 'underscore';

import { CardType, DiscardDestination, GainDestination } from '../base';
import { Card, CardGroup, CardInPlay, CardPredicate, ReactionType, SupplyPile } from '../cards';
import * as decisions from '../decisions';
import { EffectTemplate, labelForTarget, Target, VPEffect } from '../effects';
import Game, { GameStep } from '../game';
import { Player, PlayerIdentifier } from '../player';
import { labelRange, pluralize, listToOption } from '../utils';

/// Common module defines cards / effects used by all sets.

export class BasicVPEffect extends VPEffect {

    numPoints: number;

    constructor(numPoints: number) {
        super();
        this.numPoints = numPoints;
    }

    calculatePoints(deck: Card[]) : number {
        return this.numPoints;
    }
}

export class CardDiscountEffect extends EffectTemplate {
    discount: number;

    constructor(discount: number) {
        super();
        this.discount = discount;
    }

    target = Target.ActivePlayer;
    get label() : string { return `Reduce card costs by ${this.discount}`; }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        game.incrementCardDiscount(this.discount);
        return null;
    }

}

export class GainCoinsEffect extends EffectTemplate {
    
    constructor(readonly numCoins: number) {
        super();
    }

    target = Target.ActivePlayer;
    get label() : string { return `+${this.numCoins} ${pluralize('coin', this.numCoins)}`; }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        game.incrementCoinCount(this.numCoins);
        return null;
    }
}

export class GainActionsEffect extends EffectTemplate {
    numActions:number;

    target = Target.ActivePlayer;
    get label() : string { return `+${this.numActions} ${pluralize('action', this.numActions)}`; }

    constructor(numActions:number) {
        super();
        this.numActions = numActions;
    }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        game.incrementActionCount(this.numActions);
        return null;
    }
}

export class GainBuysEffect extends EffectTemplate {
    numBuys:number;

    target = Target.ActivePlayer;
    get label() : string {
        return `+${this.numBuys} ${pluralize('buy', this.numBuys)}`;
    }

    constructor(numBuys:number) {
        super();
        this.numBuys = numBuys;
    }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        game.incrementBuyCount(this.numBuys);
        return null;
    }
}

export class DrawEffect extends EffectTemplate {
    numCards: number;
    target: Target;

    constructor(numCards:number, target:Target=Target.ActivePlayer) {
        super();
        this.numCards = numCards;
        this.target = target;
    }

    get label() : string {
        return '+' + this.numCards + ' ' + pluralize('card', this.numCards);
    }

    resolve(game:Game, player:Player, trigger: CardInPlay) : GameStep {
        game.drawCards(player, this.numCards);
        return null;
    }
}

export class DiscardEffect extends EffectTemplate {
    numCards: number;
    target: Target;
    destination: DiscardDestination;

    constructor(numCards:number, target = Target.ActivePlayer, destination = DiscardDestination.Discard) {
        if (numCards <= 0) {
            throw new Error(`Invalid numCards ${numCards} (must be positive)`);
        }
        super();
        this.numCards = numCards;
        this.target = target;
        this.destination = destination;
    }

    get label() : string {
        return `Discard ${this.numCards} ${pluralize('card', this.numCards)}`;
    }

    resolve(game:Game, player:Player, trigger: CardInPlay) : GameStep {
        const numToDiscard = Math.min(this.numCards, player.hand.count);
        if (numToDiscard > 0) {
            return new decisions.DiscardCardDecision(player.identifier, trigger, numToDiscard, numToDiscard,
                player.hand.cards, this.destination);
        } else {
            return null;
        }
    }
}

export class DiscardToEffect extends EffectTemplate {
    target: Target;
    targetNumCards: number;
    destination: DiscardDestination;

    constructor(target: Target, targetNumCards: number, destination = DiscardDestination.Discard) {
        super();
        this.target = target;
        this.targetNumCards = targetNumCards;
        this.destination = destination;
    }

    get label() : string {
        return `Discard to ${this.targetNumCards} ${pluralize('card', this.targetNumCards)}`;
    }

    resolve(game:Game, player:Player, trigger: CardInPlay) : GameStep {
        const numToDiscard = Math.max(0, player.hand.count - this.targetNumCards);
        if (numToDiscard == 0) {
            return null;
        } else {
            return new decisions.DiscardCardDecision(player.identifier, trigger, numToDiscard, numToDiscard, player.hand.cards, this.destination);
        }
    }
}

export class DiscardConditions {
    constructor(readonly numCards: number = 1, readonly card: Card | null = null) {
    }

    static card(card: Card) : DiscardConditions {
        return new DiscardConditions(1, card);
    }

    filter(hand: CardGroup) : CardInPlay[] {
        if (this.card) {
            return hand.ofCard(this.card);
        } else {
            return hand.cards;
        }
    }
}

export class DiscardForEffect extends EffectTemplate {
    get label() { return `Discard for ${this.effect.label} (${labelForTarget(this.target)})`; }

    constructor(readonly conditions: DiscardConditions, readonly effect: EffectTemplate, readonly elseEffect: EffectTemplate | null = null, readonly target = Target.ActivePlayer) {
        super();
    }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        const matching = this.conditions.filter(target.hand);
        if (matching.length == 0) {
            if (this.elseEffect) {
                game.queueEffectsForTemplate(this.elseEffect, trigger);
            }
            return null;
        }

        const followup = (game: Game, choice: CardInPlay[]) : GameStep => {
            if (choice.length >= this.conditions.numCards) {
                game.queueEffectsForTemplate(this.effect, trigger);
            } else if (this.elseEffect) {
                game.queueEffectsForTemplate(this.elseEffect, trigger);
            }
            return null;
        }

        return new decisions.DiscardCardDecision(target.identifier, trigger, 0, this.conditions.numCards,
                                                 matching, DiscardDestination.Discard, followup);
    }
}

export class DiscardHandEffect extends EffectTemplate {
    get label() { return `${labelForTarget(this.target)} Discard Hand`; }
    constructor(readonly target = Target.ActivePlayer) {
        super();
    }

    resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep {
        game.discardHand(target);
        return null;
    }
}

export class TrashEffect extends EffectTemplate {

    constructor(readonly min: number, readonly max: number, readonly cardType = CardType.All, readonly target = Target.ActivePlayer) {
        super();
    }

    get label() : string {
        return `Trash ${labelRange(this.min, this.max)} ${pluralize('card', this.max)}`;
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const matchingCards = player.hand.ofType(this.cardType);
        return new decisions.TrashCardDecision(player.identifier, trigger, this.min, this.max, matchingCards);
    }
}

export class TrashThisCardEffect extends EffectTemplate {
    label = "Trash this card";
    target = Target.ActivePlayer;

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        game.trashCards(player, [trigger]);
        return null;
    }
}

export class MayTrashThisForEffect extends EffectTemplate {
    get label() { return `Trash this card for ${this.effect.label}` }
    target = Target.ActivePlayer;

    constructor(readonly effect: EffectTemplate) {
        super();
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        // BAD RULES: trashing should use lose-track rules, not just check if card is in play
        if (!trigger.inPlay) {
            return null;
        }

        const followup = (game: Game, choice: CardInPlay[]) => {
            const trashed = listToOption(choice);
            if (trashed) {
                game.queueEffectsForTemplate(this.effect, trigger);
            }
            return null;
        };

        return new decisions.TrashCardDecision(player.identifier, trigger, 0, 1, [trigger], followup);
    }
}

export class GainCardEffect extends EffectTemplate {

    card: Card;
    target: Target;
    destination: GainDestination;

    constructor(card: Card, target = Target.ActivePlayer, destination = GainDestination.Discard) {
        super();
        this.card = card;
        this.target = target;
        this.destination = destination;
    }

    get label() : string { return 'Gain ' + this.card.name; }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const pile = game.pileForCard(this.card);
        if (pile.count > 0) {
            game.playerGainsFromSupply(player, this.card, this.destination)
        }

        return null; // BAD RULES: on-gain reactions will need to trigger
    }
}

export class GainCardWithCostEffect extends EffectTemplate {

    minCost: number;
    maxCost: number;
    target: Target;
    cardType: CardType;
    destination: GainDestination;
    mustGain: boolean;

    get label() : string {
        return `Gain card costing ${labelRange(this.minCost, this.maxCost)}`;
    }

    constructor(minCost: number, maxCost: number, target = Target.ActivePlayer, cardType = CardType.All, destination = GainDestination.Discard, mustGain: boolean = true) {
        super();
        this.minCost = minCost;
        this.maxCost = maxCost;
        this.target = target;
        this.cardType = cardType;
        this.destination = destination;
        this.mustGain = mustGain;
    }

    resolve(game:Game, player:Player, trigger: CardInPlay) : GameStep {
        const piles = game.filterGainablePiles(this.minCost, this.maxCost, this.cardType);
        if (piles.length == 0) {
            return null;
        } else {
            return new decisions.GainFromPileDecision(player.identifier, trigger, piles.map(p => p.card), this.destination, this.mustGain);
        }
    }
}

export enum GainCostRestriction {
    UpToCost,
    ExactlyCost
}

function gainCostRestrictionLabel(r: GainCostRestriction) : string {
    switch (r) {
        case GainCostRestriction.UpToCost: return 'up to';
        case GainCostRestriction.ExactlyCost: return 'exactly';
    }
}

export class TrashToGainPlusCostEffect extends EffectTemplate {

    plusCost: number;
    cardType: CardType;
    destination: GainDestination;
    costRestriction: GainCostRestriction;
    mustGain = true;

    target = Target.ActivePlayer;
    get label() : string {
        return `Trash to gain card costing ${gainCostRestrictionLabel(this.costRestriction)} +${this.plusCost}`;
    }

    constructor(plusCost: number,
                cardType= CardType.All,
                destination = GainDestination.Discard,
                costRestriction = GainCostRestriction.UpToCost) {
        super();
        this.plusCost = plusCost;
        this.cardType = cardType;
        this.destination = destination;
        this.costRestriction = costRestriction;
    }

    resolve(game:Game, player:Player, trigger: CardInPlay) : GameStep {
        const trashableCards = player.hand.ofType(this.cardType);
        const gainFollowup = (game: Game, choice: CardInPlay[]) => {
            if (choice.length == 0) {
                return null;
            }

            const trashedCard = choice[0];
            const maxCost = game.effectiveCardCost(trashedCard) + this.plusCost;
            const minCost = this.costRestriction === GainCostRestriction.UpToCost ? 0 : maxCost;
            const cards = game.filterGainablePiles(minCost, maxCost, this.cardType).map(p => p.card);
            
            if (cards.length == 0) {
                return null;
            }

            return new decisions.GainFromPileDecision(player.identifier, trigger, cards, this.destination, this.mustGain);
        };

        return new decisions.TrashCardDecision(player.identifier, trigger, 1, 1, trashableCards, gainFollowup);
    }
}

export class TrashForEffect extends EffectTemplate {

    effect: EffectTemplate;
    cardPredicate: CardPredicate | null;
    numTrashed: number;

    target = Target.ActivePlayer;
    get label() : string { return `Trash ${pluralize('card', this.numTrashed)} for '${this.effect.label}' effect`; }

    constructor(effect: EffectTemplate, numTrashed: number = 1, cardPredicate?: CardPredicate) {
        super();
        this.effect = effect;
        this.numTrashed = numTrashed;
        this.cardPredicate = cardPredicate ? cardPredicate : null;
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const trashableCards = this.cardPredicate == null ? player.hand.cards : player.hand.cards.filter(this.cardPredicate);
        if (trashableCards.length == 0) {
            return null;
        }

        const followup = (game: Game, choice: CardInPlay[]) => {
            if (choice.length == this.numTrashed) {
                game.queueEffectsForTemplate(this.effect, trigger);
            }
            return null;
        };
        const num = Math.min(trashableCards.length, this.numTrashed);
        return new decisions.TrashCardDecision(player.identifier, trigger, num, num, trashableCards, followup);
    }
}

export class PlayActionManyTimesEffect extends EffectTemplate {

    target = Target.ActivePlayer;
    get label() : string { return `Play action card ${this.num} times`; }

    constructor(public num: number) {
        super();
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const actions = player.hand.ofType(CardType.Action);
        return new decisions.PlayActionDecision(player.identifier, trigger, actions, this.num, false);
    }
}

export class EffectChoice extends EffectTemplate {

    effects: EffectTemplate[];
    numChoices: number;
    target: Target;

    get label() : string {
        return `Choose ${this.numChoices} of ${this.effects.length} ${pluralize('effect', this.effects.length)}`;
    }

    constructor(effects: EffectTemplate[], target = Target.ActivePlayer, numChoices = 1) {
        super();
        this.effects = effects;
        this.target = target;
        this.numChoices = numChoices;
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        return new decisions.ChooseEffectDecision(player.identifier, trigger, this.effects, this.numChoices);
    }
}

export class EffectSequence extends EffectTemplate {
    target = Target.ChoosingPlayer;
    get label() { return this.effects.map(e => e.label).join(', '); }
    
    readonly effects: EffectTemplate[];

    constructor(...effects: EffectTemplate[]) {
        super();
        this.effects = effects;
    }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        game.queueEffectsForTemplates(this.effects, trigger, []);
        return null;
    }
}

export class DiscardForCoinsEffect extends EffectTemplate {
    target = Target.ActivePlayer;
    get label() { return "Discard cards for coins"; }

    resolve(game: Game, player: Player, trigger: CardInPlay) : GameStep {
        const followup = (game: Game, choice: CardInPlay[]) => {
            if (choice.length > 0) {
                game.incrementCoinCount(choice.length);
            }
            return null;
        };
        return new decisions.DiscardCardDecision(player.identifier, trigger, 0, player.hand.count, player.hand.cards, DiscardDestination.Discard, followup);
    }
}

// Common Effect definitions

export const DrawOneCard = new DrawEffect(1);
export const DrawTwoCards = new DrawEffect(2);
export const DrawThreeCards = new DrawEffect(3);
export const DrawFourCards = new DrawEffect(4);

export const DiscardThreeCards = new DiscardEffect(3);

export const GainOneAction = new GainActionsEffect(1);
export const GainTwoActions = new GainActionsEffect(2);

export const GainOneCoin = new GainCoinsEffect(1);
export const GainTwoCoins = new GainCoinsEffect(2);
export const GainThreeCoins = new GainCoinsEffect(3);
export const GainFourCoins = new GainCoinsEffect(4);

export const GainOneBuy = new GainBuysEffect(1);
export const GainTwoBuys = new GainBuysEffect(2);

export const TrashTwoCards = new TrashEffect(2, 2);

const SetName = 'Common';

export const Copper = new Card({
    name: 'Copper',
    cost: 0,
    money: 1,
    set: SetName
});

export const Silver = new Card({
    name: 'Silver',
    cost: 3,
    money: 2,
    set: SetName
});

export const Gold = new Card({
    name: 'Gold',
    cost: 6,
    money: 3,
    set: SetName
});

export const Estate = new Card({
    name: 'Estate',
    cost: 2,
    vp: new BasicVPEffect(1),
    set: SetName
});

export const Duchy = new Card({
    name: 'Duchy',
    cost: 5,
    vp: new BasicVPEffect(3),
    set: SetName
});

export const Province = new Card({
    name: 'Province',
    cost: 8,
    vp: new BasicVPEffect(6),
    set: SetName
});

export const Curse = new Card({
    name: 'Curse',
    cost: 0,
    vp: new BasicVPEffect(-1),
    set: SetName
});

export function generateDefaultPiles(kingdomCards: Card[], numPlayers: number) : SupplyPile[] {
    const vpCount = numPlayers == 2 ? 8 : 12;
    const curseCount = (numPlayers - 1) * 10;
    const actionPileSize = 10;
    const sortedKingdomCards = _.sortBy(kingdomCards, 'cost');
    const kingdomPiles: SupplyPile[] = sortedKingdomCards.map(c => {
        return new SupplyPile(c, c.isVictory ? vpCount : actionPileSize);
    });

    kingdomPiles.push(new SupplyPile(Estate, vpCount));
    kingdomPiles.push(new SupplyPile(Duchy, vpCount));
    kingdomPiles.push(new SupplyPile(Province, vpCount));
    kingdomPiles.push(new SupplyPile(Copper, 48));
    kingdomPiles.push(new SupplyPile(Silver, 40));
    kingdomPiles.push(new SupplyPile(Gold, 30));
    kingdomPiles.push(new SupplyPile(Curse, curseCount));
    return kingdomPiles;
}

export function defaultStartingDeck() : Card[] {
    return [Copper, Copper, Copper, Copper, Copper, Copper, Copper,
            Estate, Estate, Estate];
}

export const Cardlist = [Copper, Silver, Gold, Estate, Duchy, Province, Curse];
