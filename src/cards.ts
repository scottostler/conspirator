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
    reaction?:any;
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
    return (c:Card) => { return c.name == card.name; }
}

export function makeIsTypePredicate(cardType:Type) : CardPredicate {
    return (c:Card) => { return c.matchesType(cardType); }
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

export function filterByCard(cards:Card[], card:Card) {
    return filter(cards, makeIsCardPredicate(card));
}

export function getCardByName(cardName:string) : Card {
    throw new Error('TODO');
}

export function getActions(cards:Card[]) : Card[] {
    return filterByType(cards, Type.Action);
}

export function getReactions(cards:Card[]) : Card[] {
    return filterByType(cards, Type.Reaction);
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

export interface CardSearchResult {
    foundCard?:Card;
    otherCards:Card[];
}
