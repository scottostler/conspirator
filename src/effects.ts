import _ = require('underscore');

import base = require('./base');
import cards = require('./cards');
import decisions = require('./decisions');
import Game = require('./game');
import Player = require('./player');
import util = require('./util');

import DiscardDestination = base.DiscardDestination;
import GainDestination = base.GainDestination;

export interface VPEffect {
    calculatePoints(deck:cards.Card[]) : number;
}

export class BasicVPEffect implements VPEffect {

    numPoints:number;

    constructor(numPoints:number) {
        this.numPoints = numPoints;
    }

    calculatePoints(deck:cards.Card[]) : number {
        return this.numPoints;
    }
}

// TODO?: replace ChoosingPlayer with dynamic 'active player' rule
export enum Target {
    ActivePlayer,  // Either the player taking their turn, or revealing the reaction
    OtherPlayers,
    AllPlayers,
    ChoosingPlayer // For use with EffectChoiceEffect
}

// Effects resolve by either advancing the game state, or 
// waiting for an async callback to complete.
export enum Resolution {
    Advance,
    Wait
}

// Kingdom cards are modelled as a sequence of effects,
// which modify the game state, process player decisions,
// and potentially trigger more effects by adding
// them onto the stack of unresolved effects.
// When an effect is fully resolved, it calls Game.advanceGameState.
//
// As effects may require player decisions and are thus
// asynchronous, many don't immediately advance the game state.
// In those cases, the game state will be advanced in a callback.

export interface Effect {
    getTarget():Target;
    process(game:Game, target:Player, card:cards.Card) : Resolution;
}

export interface LabelledEffect extends Effect {
    getLabel() : string;
}

export class CardDiscountEffect implements Effect {
    num:number;

    constructor(num:number) {
        this.num = num;
    }

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, target:Player) : Resolution {
        game.incrementCardDiscount(this.num);
        return Resolution.Advance;
    }

}

export class GainCoinsEffect implements LabelledEffect {
    numCoins:number;

    constructor(numCoins:number) {
        this.numCoins = numCoins;
    }

    getTarget() { return Target.ActivePlayer; }
    getLabel() {
        return '+' + this.numCoins + ' ' + util.pluralize('coin', this.numCoins);
    }

    process(game:Game, target:Player) : Resolution {
        game.incrementCoinCount(this.numCoins);
        return Resolution.Advance;
    }
}

export class GainActionsEffect implements LabelledEffect {
    numActions:number;

    constructor(numActions:number) {
        this.numActions = numActions;
    }

    getTarget() { return Target.ActivePlayer; }
    getLabel() {
        return '+' + this.numActions + ' ' + util.pluralize('action', this.numActions);
    }

    process(game:Game, target:Player) : Resolution {
        game.incrementActionCount(this.numActions);
        return Resolution.Advance;
    }
}

export class GainBuysEffect implements LabelledEffect {
    numBuys:number;

    constructor(numBuys:number) {
        this.numBuys = numBuys;
    }

    getTarget() { return Target.ActivePlayer; }
    getLabel() {
        return '+' + this.numBuys + ' ' + util.pluralize('buy', this.numBuys);
    }

    process(game:Game, target:Player) : Resolution {
        game.incrementBuyCount(this.numBuys);
        return Resolution.Advance;
    }
}

export class DrawEffect implements LabelledEffect {
    numCards:number;
    target:Target;

    constructor(numCards:number, target:Target=Target.ActivePlayer) {
        this.numCards = numCards;
        this.target = target;
    }

    getTarget() { return this.target; }
    getLabel() {
        return '+' + this.numCards + ' ' + util.pluralize('card', this.numCards);
    }

    process(game:Game, player:Player, trigger:cards.Card) : Resolution {
        game.drawCards(player, this.numCards);
        return Resolution.Advance;
    }
}

function promptPlayerForDiscard(game:Game, trigger:cards.Card, player:Player, numToDiscard:number, dest:DiscardDestination) : Resolution {
    if (numToDiscard < 0) {
        throw new Error('Invalid numToDiscard: ' + numToDiscard);
    }

    var decision = decisions.makeDiscardCardDecision(player, player.hand, trigger, numToDiscard, numToDiscard, this.destination);
    return player.promptForCardDecision(decision, cs => {
        if (cs.length > 0) {
            game.discardCards(player, cs, dest);
        }
        return Resolution.Advance;
    });
}

export class DiscardEffect implements LabelledEffect {
    numCards:number;
    target:Target;
    destination:DiscardDestination;

    constructor(numCards:number, target:Target=Target.ActivePlayer, destination:DiscardDestination=DiscardDestination.Discard) {
        this.numCards = numCards;
        this.target = target;
        this.destination = destination;
    }

    getTarget() { return this.target; }
    getLabel() {
        return 'Discard ' + this.numCards + ' ' + util.pluralize('card', this.numCards);
    }

    process(game:Game, player:Player, trigger:cards.Card) : Resolution {
        var numToDiscard = Math.min(this.numCards, player.hand.length);
        return promptPlayerForDiscard(game, trigger, player, numToDiscard, this.destination);
    }
}

export class DiscardToEffect implements Effect {
    target:Target;
    targetNumCards:number;
    destination:DiscardDestination;

    constructor(target:Target, targetNumCards:number, destination:DiscardDestination=DiscardDestination.Discard) {
        this.target = target;
        this.targetNumCards = targetNumCards;
        this.destination = destination;
    }

    getTarget() { return this.target; }

    process(game:Game, player:Player, trigger:cards.Card) : Resolution {
        var numToDiscard = Math.max(0, player.hand.length - this.targetNumCards);
        return promptPlayerForDiscard(game, trigger, player, numToDiscard, this.destination);
    }
}


export class TrashEffect implements LabelledEffect {
    min:number;
    max:number;
    cardType:cards.Type;
    target:Target;

    constructor(min:number, max:number, cardType:cards.Type=cards.Type.All, target:Target=Target.ActivePlayer) {
        this.min = min;
        this.max = max;
        this.cardType = cardType;
        this.target = target;
    }

    getTarget() { return this.target; }
    getLabel() {
        return 'Trash '
            + util.labelRange(this.min, this.max)
            + ' '
            + util.pluralize('card', this.max);
    }

    process(game:Game, player:Player, trigger:cards.Card) : Resolution {
        var matchingCards = cards.filterByType(player.hand, this.cardType);
        var decision = decisions.makeTrashCardDecision(player, matchingCards, trigger, this.min, this.max);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                game.trashCards(player, cs);
            }

            return Resolution.Advance;
        });
    }
}

export class GainCardEffect implements LabelledEffect {

    card:cards.Card;
    target:Target;
    destination:GainDestination;

    constructor(card:cards.Card, target:Target=Target.ActivePlayer, destination:GainDestination=GainDestination.Discard) {
        this.card = card;
        this.target = target;
        this.destination = destination;
    }

    getTarget() { return this.target; }
    getLabel() { return 'Gain ' + this.card.name; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var pile = game.pileForCard(this.card);
        if (pile.count > 0) {
            game.playerGainsCard(player, this.card, this.destination);
        }

        return Resolution.Advance;
    }
}

export class GainCardWithCostEffect implements Effect {

    minCost:number;
    maxCost:number;
    target:Target;
    cardType:cards.Type;
    destination:GainDestination;

    constructor(minCost:number, maxCost:number, target:Target=Target.ActivePlayer,
                cardType=cards.Type.All, destination=GainDestination.Discard) {
        this.minCost = minCost;
        this.maxCost = maxCost;
        this.target = target;
        this.cardType = cardType;
        this.destination = destination;
    }

    getTarget() { return this.target; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var piles = game.filterGainablePiles(this.minCost, this.maxCost, this.cardType);
        return game.playerGainsFromPiles(player, piles, trigger, this.destination);
    }
}


export enum GainCostRestriction {
    UpToCost,
    ExactlyCost
}

export class TrashToGainPlusCostEffect implements Effect {

    plusCost:number;
    cardType:cards.Type;
    destination:GainDestination;
    costRestriction:GainCostRestriction;

    getTarget() { return Target.ActivePlayer; }

    constructor(plusCost:number,
                cardType:cards.Type=cards.Type.All,
                destination:GainDestination=GainDestination.Discard,
                costRestriction:GainCostRestriction=GainCostRestriction.UpToCost) {
        this.plusCost = plusCost;
        this.cardType = cardType;
        this.destination = destination;
        this.costRestriction = costRestriction;
    }

    process(game:Game, player:Player, trigger:cards.Card) {
        var trashableCards = cards.filterByType(player.getHand(), this.cardType);
        var decision = decisions.makeTrashCardDecision(player, trashableCards, trigger, 1, 1);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length === 0) {
                return Resolution.Advance;
            }

            game.trashCards(player, cs);

            var trashedCard = cs[0];
            var maxCost = game.effectiveCardCost(trashedCard) + this.plusCost;
            var minCost = this.costRestriction === GainCostRestriction.UpToCost ? 0 : maxCost;
            var piles = game.filterGainablePiles(minCost, maxCost, this.cardType);

            return game.playerGainsFromPiles(player, piles, trigger, this.destination);
        });
    }
}

export class TrashForEffect implements Effect {

    effect:Effect;
    cardPredicate:cards.CardPredicate;
    n:number;

    getTarget() { return Target.ActivePlayer; }

    constructor(effect:Effect, cardPredicate?:cards.CardPredicate, n:number=1) {
        this.effect = effect;
        this.cardPredicate = cardPredicate;
        this.n = n;
    }

    process(game:Game, player:Player, trigger:cards.Card) {
        var trashableCards = cards.filter(player.hand, this.cardPredicate);
        var decision = decisions.makeTrashCardDecision(player, trashableCards, trigger, this.n, this.n);
        return player.promptForCardDecision(decision, cs => {
            game.trashCards(player, cs);

            if (cs.length === this.n) {
                game.pushEvent(() => {
                    return this.effect.process(game, player, trigger);
                });
            }

            return Resolution.Advance;
        });
    }
}

export class PlayActionManyTimesEffect implements Effect {
    num:number;
    getTarget() { return Target.ActivePlayer; }

    constructor(num:number) {
        this.num = num;
    }

    process(game:Game, player:Player, trigger:cards.Card) {
        var actions = cards.getActions(player.getHand());
        var decision = decisions.makePlayMultipliedActionDecision(actions, trigger, this.num);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                return game.playActionMultipleTimes(cs[0], this.num);
            } else {
                return Resolution.Advance;
            }
        });
    }
}

export class EffectChoiceEffect implements Effect {

    effects:LabelledEffect[];
    numChoices:number;
    target:Target;

    getTarget() { return this.target; }

    constructor(effects:LabelledEffect[], target:Target=Target.ActivePlayer, numChoices:number=1) {
        this.effects = effects;
        this.target = target;
        this.numChoices = numChoices;
    }

    process(game:Game, player:Player, trigger:cards.Card) {
        var decision = decisions.makeEffectsDecision(this.effects, trigger, this.numChoices);
        return player.promptForEffectDecision(decision, this.effects, es => {
            if (es.length > 0) {
                game.playerChoosesEffects(player, es, trigger);
            }

            return Resolution.Advance;
        });
    }
}

export class DiscardForCoinsEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var decision = decisions.makeDiscardCardDecision(player, player.hand, trigger, 0, player.hand.length, DiscardDestination.Discard);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                game.incrementCoinCount(cs.length);
            }
            return Resolution.Advance;
        });
    }
}

export enum ReactionType {
    OnAttack
}

export class MoatReaction implements Effect {

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        game.givePlayerAttackImmunity(player);
        return Resolution.Advance;
    }
}

// Callback Types

// TODO?: replace with generics

export interface DecisionCallback {
    (choice:any) : Resolution;
}

export interface BooleanCallback {
    (choice:boolean) : Resolution;
}

export interface CardCallback {
    (card:cards.Card) : Resolution;
}

export interface CardsCallback {
    (cards:cards.Card[]) : Resolution;
}

export interface LabelledEffectsCallback {
    (effect:LabelledEffect[]) : Resolution;
}

export interface PurchaseCallback {
    (card:cards.Card, treasures:cards.Card[]) : Resolution;
}

export interface StringsCallback {
    (xs:string[]) : Resolution;
}


export var DrawOneCard = new DrawEffect(1);
export var DrawTwoCards = new DrawEffect(2);
export var DrawThreeCards = new DrawEffect(3);

export var GainOneAction = new GainActionsEffect(1);
export var GainTwoActions = new GainActionsEffect(2);

export var GainOneCoin = new GainCoinsEffect(1);
export var GainTwoCoins = new GainCoinsEffect(2);

export var GainOneBuy = new GainBuysEffect(1);
export var GainTwoBuys = new GainBuysEffect(2);

export var TrashTwoCards = new TrashEffect(2, 2);
