/// <reference path="../typings/underscore/underscore.d.ts" />
import _ = require('underscore');
import util = require('./util');
import g = require('./game');
import Player = require('./player');
import cards = require('./cards');
import decisions = require('./decisions');
import base = require('./base');

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

export enum Target {
    ActivePlayer,
    OtherPlayers,
    AllPlayers,
    ChoosingPlayer // Only for use with EffectChoiceEffect
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
    process(game:g.Game, target:Player) : Resolution;
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

    process(game:g.Game, target:Player) : Resolution {
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

    process(game:g.Game, target:Player) : Resolution {
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

    process(game:g.Game, target:Player) : Resolution {
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

    process(game:g.Game, target:Player) : Resolution {
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

    process(game:g.Game, player:Player) : Resolution {
        game.drawCards(player, this.numCards);
        return Resolution.Advance;
    }
}

export class DiscardEffect implements LabelledEffect {
    numCards:number;
    target:Target;
    destination:base.DiscardDestination;

    constructor(numCards:number, target:Target=Target.ActivePlayer, destination:base.DiscardDestination=base.DiscardDestination.Discard) {
        this.numCards = numCards;
        this.target = target;
        this.destination = destination;
    }

    getTarget() { return this.target; }
    getLabel() {
        return 'Discard ' + this.numCards + ' ' + util.pluralize('card', this.numCards);
    }

    process(game:g.Game, player:Player) : Resolution {
        var numToDiscard = Math.min(this.numCards, player.hand.length);
        if (numToDiscard > 0) {
            return player.promptForDiscard(game, numToDiscard, numToDiscard, player.hand, this.destination);
        } else {
            return Resolution.Advance;
        }
    }
}

export class DiscardToEffect implements Effect {
    target:Target;
    targetNumCards:number;

    constructor(target:Target, targetNumCards:number) {
        this.target = target;
        this.targetNumCards = targetNumCards;
    }

    getTarget() { return this.target; }

    process(game:g.Game, player:Player) : Resolution {
        var numToDiscard = Math.max(0, player.hand.length - this.targetNumCards);
        if (numToDiscard > 0) {
            return player.promptForDiscard(game, numToDiscard, numToDiscard, player.hand);
        } else {
            return Resolution.Advance;
        }
    }
}


export class TrashEffect implements LabelledEffect {
    target:Target;
    min:number;
    max:number;
    cardType:cards.Type;

    constructor(target:Target, min:number, max:number, cardType:cards.Type=cards.Type.All) {
        this.target = target;
        this.min = min;
        this.max = max;
        this.cardType = cardType;
    }

    getTarget() { return this.target; }
    getLabel() {
        return 'Trash '
            + util.labelRange(this.min, this.max)
            + ' '
            + util.pluralize('card', this.max);
    }

    process(game:g.Game, player:Player) : Resolution {
        var matchingCards = cards.filterByType(player.hand, this.cardType);
        if (matchingCards.length < this.min) {
            if (matchingCards.length > 0) {
                game.trashCards(player, matchingCards);
            }

            return Resolution.Advance;
        } else {
            return player.promptForTrashing(game, this.min, this.max, matchingCards);
        }
    }
}

export class GainCardEffect implements LabelledEffect {

    card:cards.Card;
    target:Target;
    destination:base.GainDestination;

    constructor(card:cards.Card, target:Target=Target.ActivePlayer, destination:base.GainDestination=base.GainDestination.Discard) {
        this.card = card;
        this.target = target;
        this.destination = destination;
    }

    getTarget() { return this.target; }
    getLabel() { return 'Gain ' + this.card.name; }

    process(game:g.Game, player:Player) {
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
    destination:base.GainDestination;

    constructor(minCost:number, maxCost:number,
                target:Target=Target.ActivePlayer,
                cardType=cards.Type.All,
                destination=base.GainDestination.Discard) {
        this.minCost = minCost;
        this.maxCost = maxCost;
        this.target = target;
        this.cardType = cardType;
        this.destination = destination;
    }

    getTarget() { return this.target; }

    process(game:g.Game, player:Player) {
        var piles = game.filterGainablePiles(
            this.minCost, this.maxCost, this.cardType);
        return game.playerGainsFromPiles(player, piles, this.destination);
    }
}


export enum GainCostRestriction {
    UpToCost,
    ExactlyCost
}

export class TrashToGainPlusCostEffect implements Effect {

    plusCost:number;
    cardType:cards.Type;
    destination:base.GainDestination;
    costRestriction:GainCostRestriction;

    getTarget() { return Target.ActivePlayer; }

    constructor(plusCost:number,
                cardType:cards.Type=cards.Type.All,
                destination:base.GainDestination=base.GainDestination.Discard,
                costRestriction:GainCostRestriction=GainCostRestriction.UpToCost) {
        this.plusCost = plusCost;
        this.cardType = cardType;
        this.destination = destination;
        this.costRestriction = costRestriction;
    }

    process(game:g.Game, player:Player) {
        var trashableCards = cards.filterByType(player.getHand(), this.cardType);
        return player.promptForTrashing(game, 1, 1, trashableCards, (selectedCards) => {
            if (selectedCards.length === 1) {
                var maxCost = game.effectiveCardCost(selectedCards[0]) + this.plusCost;
                var minCost = this.costRestriction === GainCostRestriction.UpToCost ? 0 : maxCost;
                var piles = game.filterGainablePiles(minCost, maxCost, this.cardType);
                return game.playerGainsFromPiles(player, piles, this.destination);
            } else {
                return Resolution.Advance;
            }
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

    process(game:g.Game, player:Player) {
        var hand = player.getHand();
        if (hand.length > 0) {
            return player.promptForTrashing(game, this.n, this.n, hand, (cards) => {
                if (cards.length == this.n) {
                    game.pushEventsForEffect(this.effect);
                }

                return Resolution.Advance;
            });
        } else {
            return Resolution.Advance;
        }
    }
}

export class PlayActionManyTimesEffect implements Effect {
    num:number;
    getTarget() { return Target.ActivePlayer; }

    constructor(num:number) {
        this.num = num;
    }

    process(game:g.Game, player:Player) {
        var actions = cards.getActions(player.getHand());
        if (actions.length > 0) {
            return player.promptForHandSelection(game, 1, 1, actions, (actions) => {
                game.playActionMultipleTimes(actions[0], this.num);
                return Resolution.Advance;
            });
        } else {
            return Resolution.Advance;
        }
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

    process(game:g.Game, player:Player) {
        return player.promptForEffectChoice(game, this.effects, this.numChoices);
    }
}

export class DiscardForCoinsEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:g.Game, player:Player) {
        if (player.hand.length === 0) {
            return Resolution.Advance;
        }

        return player.promptForDiscard(game, 0, player.hand.length, player.hand, base.DiscardDestination.Discard, (cards) => {
            if (cards.length > 0) {
                game.incrementCoinCount(cards.length);
            }
            return Resolution.Advance;
        });
    }
}

export enum ReactionTrigger {
    OnAttack
}

export interface ReactionEffect {
    getTrigger() : ReactionTrigger;
    process(game:g.Game, player:Player) : Resolution;
}

export class MoatReaction implements ReactionEffect {
    getTrigger() { return ReactionTrigger.OnAttack; }
    process(game:g.Game, player:Player) {
        game.givePlayerAttackImmunity(player);
        return Resolution.Advance;
    }
}

// Callback Types

export interface DecisionCallback {
    (choice:any) : Resolution;
}

export interface CardCallback {
    (card:cards.Card) : Resolution;
}

export interface CardsCallback {
    (cards:cards.Card[]) : Resolution;
}

export interface LabelledEffectCallback {
    (effect:LabelledEffect) : Resolution;
}

export interface PurchaseCallback {
    (card:cards.Card, treasures:cards.Card[]) : Resolution;
}
