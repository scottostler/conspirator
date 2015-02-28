import _ = require('underscore');
import util = require('./util');
import effects = require('./effects')

export enum Type {
    Action,
    Treasure,
    Victory,
    Reaction,
    Curse,
    All
}

var AssetRoot = 'assets/cards-296x473';

function buildCardURL(set:string, name:string) : string {
    var filename = name.toLowerCase().replace(/\s+/g, '') + '.jpg';
    return [AssetRoot, set, filename].join('/');
}

export function cardbackURL() : string {
    return buildCardURL('basecards', 'cardback');
}

export interface CardProperties {
    set:string;
    name:string;
    cost?:number;
    effects?:effects.Effect[];
    reaction?:[effects.ReactionType, effects.Effect[]];
    money?:number;
    moneyEffect?:effects.Effect;
    vp?:effects.VPEffect;
    attack?:boolean;
}

export class Card {

    set:string;
    name:string;
    cost:number;
    effects:effects.Effect[];
    reaction:any;
    money:number;
    moneyEffect:effects.Effect;
    vp:effects.VPEffect;
    attack:boolean;

    assetURL:string;

    constructor(properties:CardProperties) {
        _.extend(this, properties);
        this.assetURL = buildCardURL(this.set, this.name);
    }

    isSameCard(c:Card) {
        return this.name === c.name;
    }

    isIdenticalCard(c:Card) {
        return this === c;
    }

    toString() {
        return this.name;
    }

    isAction() : boolean {
        return !!this.effects;
    }

    isAttack() : boolean {
        return !!this.attack;
    }

    isReaction() : boolean {
        return !!this.reaction;
    }

    isTreasure() : boolean {
        return !!this.money;
    }

    // A basic treasure is a treasure with a fixed number of coins
    // and no effects when played.
    // This isn't standard Dominion terminology, and is used for autoplaying coins.
    isBasicTreasure() : boolean {
        return this.isTreasure() && !this.moneyEffect;
    }

    isVictory() : boolean {
        return !!this.vp && !this.isCurse();
    }

    isCurse() : boolean {
        return this.name === 'Curse';
    }

    matchesType(cardType:Type) : boolean {
        switch (cardType) {
            case Type.All:
                return true;
            case Type.Action:
                return this.isAction();
            case Type.Reaction:
                return this.isReaction();
            case Type.Treasure:
                return this.isTreasure();
            case Type.Victory:
                return this.isVictory();
            case Type.Curse:
                return this.isCurse();
        }
    }
}

export interface CardCallback {
    (cards:Card[]) : void;
}

export interface CardsCallback {
    (cards:Card[]) : void;
}

export interface CardPredicate {
    (card:Card) : boolean;
}

export interface CardsPredicate {
    (cards:Card[]) : boolean;
}

export interface PurchaseCallback {
    (card:Card, treasures:Card[]) : void;
}

export function makeIsCardPredicate(card:Card) : CardPredicate {
    return (c:Card) => { return card.isSameCard(c); }
}

export function makeIsTypePredicate(cardType:Type) : CardPredicate {
    return (c:Card) => { return c.matchesType(cardType); }
}

export function makeIsCostPredicate(lower:number, upper:number) : CardPredicate {
    return (c:Card) => { return c.cost >= lower && c.cost <= upper; }
}

export var treasurePredicate:CardPredicate = makeIsTypePredicate(Type.Treasure)
export var allCardsPredicate:CardPredicate = makeIsTypePredicate(Type.All);

// Card utility functions

export function uniq(cards:Card[]) : Card[] {
    return _.uniq(cards, function(c) {
        return c.name;
    });
}

export function areUnique(cards:Card[]) : boolean {
    return cards.length === uniq(cards).length;
}

export function difference(first:Card[], second:Card[]) : Card[] {
    return _.difference<Card>(first, second);
}

export function without(cs:Card[], c:Card) : Card[] {
    return difference(cs, [c]);
}

export function clone(cards:Card[]) : Card[] {
    return _.map(cards, c => _.clone(c));
}

export function matchNone(cardType:Type) : CardsPredicate {
    return function(cards:Card[]) {
        return !_.some(cards, function(c:Card) {
            return c.matchesType(cardType) 
        });
    };
}

export function filter(cards:Card[], predicate:CardPredicate) : Card[] {
    return _.filter(cards, (c:Card) => { return predicate(c); });
}

export function filterByType(cards:Card[], cardType:Type) : Card[] {
    return filter(cards, makeIsTypePredicate(cardType));
}

export function filterByCard(cards:Card[], card:Card) : Card[] {
    return filter(cards, makeIsCardPredicate(card));
}

export function filterByCost(cards:Card[], lower:number, upper:number) : Card[] {
    return filter(cards, makeIsCostPredicate(lower, upper));
}

export function countByCard(cards:Card[], card:Card) : number {
    return filterByCard(cards, card).length;
}

export function getActions(cards:Card[]) : Card[] {
    return filterByType(cards, Type.Action);
}

export function getReactions(cards:Card[], reactionType:effects.ReactionType) : Card[] {
    return _.filter(cards, (c:Card) => c.isReaction() && c.reaction[0] === reactionType);
}

export function getTreasures(cards:Card[]) : Card[] {
    return filterByType(cards, Type.Treasure);
}

export function getVictories(cards:Card[]) : Card[] {
    return filterByType(cards, Type.Victory);
}

export function getBasicTreasures(cards:Card[]) : Card[] {
    return _.filter(cards, (c:Card) => {
        return c.isBasicTreasure();
    });
}

export function getNames(cards:Card[]) : string[] {
    return _.pluck(cards, 'name');
}

export function contains(cards:Card[], card:Card) {
    return _.some<Card>(cards, makeIsCardPredicate(card));
}

export function containsIdentical(cards:Card[], card:Card) {
    return _.contains(cards, card);
}

// TODO:
// Mutating the removeFirst/removeIdentical input arrays shortens caller code, but
// can cause bugs due to mutating shared state.

// Removes a card of the same type.
// Throws an error if the card isn't present.
export function removeFirst(cards:Card[], card:Card) : Card {
    var match = _.find<Card>(cards, makeIsCardPredicate(card));
    var index = cards.indexOf(match);

    if (index === -1) {
        throw new Error('Unable to remove ' + card.name + ' from ' + getNames(cards));
    }

    cards.splice(index, 1);
    return match;
}

// Removes the exact card object. Card identity can matter for effects like Mining Village.
// Throws an error if the card isn't present.
export function removeIdentical(cards:Card[], card:Card) : void {
    var index = cards.indexOf(card);

    if (index === -1) {
        throw new Error('Unable to remove ' + card.name + ' from ' + getNames(cards));
    }

    cards.splice(index, 1);
}

// Dummy Cards
// TODO: make views instead of cards.

export var Trash = new Card({
    name: 'Trash',
    set: 'basecards'
});

export var Cardback = new Card({
    name: 'Cardback',
    set: 'basecards'
});

// Basic Cards

export var Copper = new Card({
    name: 'Copper',
    cost: 0,
    money: 1,
    set: 'basecards'
});

export var Silver = new Card({
    name: 'Silver',
    cost: 3,
    money: 2,
    set: 'basecards'
});

export var Gold = new Card({
    name: 'Gold',
    cost: 6,
    money: 3,
    set: 'basecards'
});

export var Estate = new Card({
    name: 'Estate',
    cost: 2,
    vp: new effects.BasicVPEffect(1),
    set: 'basecards'
});

export var Duchy = new Card({
    name: 'Duchy',
    cost: 5,
    vp: new effects.BasicVPEffect(3),
    set: 'basecards'
});

export var Province = new Card({
    name: 'Province',
    cost: 8,
    vp: new effects.BasicVPEffect(6),
    set: 'basecards'
});

export var Curse = new Card({
    name: 'Curse',
    cost: 0,
    vp: new effects.BasicVPEffect(-1),
    set: 'basecards'
});

export class Pile {
    card:Card;
    count:number;
    constructor(card:Card, count:number) {
        this.card = card;
        this.count = count;
    }
}

export var BaseCards = [Copper, Silver, Gold, Estate, Duchy, Province, Curse];

export function cardsFromPiles(piles:Pile[]) : Card[] {
    return _.pluck(piles, 'card');
}

export interface CardSearchResult {
    foundCard?:Card;
    otherCards:Card[];
}
