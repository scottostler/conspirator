import * as _ from 'underscore';

import { PlayerIdentifier } from './player';
import { EffectTemplate, AttackReactionEffectTemplate, VPEffect } from './effects';
import { BasicVPEffect } from './sets/common';
import { CardType } from './base';

export type CardIdentifier = string;

export enum ReactionType {
    OnAttack
}

export function reactionTypeLabel(reactionType: ReactionType) : string {
    switch (reactionType) {
        case ReactionType.OnAttack: return "Attack"
    }
    throw new Error(`Unknown reaction type: ${reactionType}`);
}

export interface CardProperties {
    set: string;
    name: string;
    cost?: number;
    effects?: EffectTemplate[];
    reaction?: [ReactionType, ReactionEffectTemplate[]];
    money?: number;
    moneyEffect?: EffectTemplate;
    vp?: VPEffect;
    attack?: boolean;
}

type ReactionEffectTemplate = AttackReactionEffectTemplate | EffectTemplate;

export class Card {
    set: string;
    name: string;
    cost: number;
    effects: EffectTemplate[];
    reaction: [ReactionType, ReactionEffectTemplate[]];
    money: number;
    moneyEffect: EffectTemplate;
    vp: VPEffect;
    attack: boolean;

    constructor(properties: CardProperties) {
        Object.assign(this, properties);
    }

    get debugDescription() : string {
        return this.name;
    }

    isSameCard(c: Card) : boolean {
        return this.name === c.name;
    }

   toString() {
        return this.name;
    }

    get isAction() : boolean {
        return !!this.effects;
    }

    get isAttack() : boolean {
        return !!this.attack;
    }

    get isReaction() : boolean {
        return !!this.reaction;
    }

    isReactionType(reactionType: ReactionType) : boolean {
        if (this.reaction) {
            return this.reaction[0] == reactionType;
        } else {
            return false;
        }
    }

    get isTreasure() : boolean {
        return !!this.money;
    }

    get isVictory() : boolean {
        return !!this.vp && !this.isCurse;
    }

    get isCurse() : boolean {
        return this.name === 'Curse';
    }

    matchesType(cardType:CardType) : boolean {
        switch (cardType) {
            case CardType.All:
                return true;
            case CardType.Action:
                return this.isAction;
            case CardType.Reaction:
                return this.isReaction;
            case CardType.Treasure:
                return this.isTreasure;
            case CardType.Victory:
                return this.isVictory;
            case CardType.Curse:
                return this.isCurse;
        }
    }
}

export class CardInPlay extends Card {

    // Used to track card instances where identity matters.
    // Can matter for cards like Mining Village, and for UI purposes. 
    identifier: CardIdentifier;

    location: CardGroup | null;

    constructor(card: Card, identifier: CardIdentifier) {
        super(card);
        this.identifier = identifier;
        this.location = null;
    }

    get debugDescription() : string {
        return `${this.name} (${this.identifier})`;
    }

    get inTrash() : boolean {
        return this.location !== null && this.location.groupType == CardGroupType.Trash;
    }

    get inPlay() : boolean {
        return this.location !== null && this.location.groupType == CardGroupType.InPlay;
    }

    isExactCard(c: CardInPlay) {
        return this.name === c.name && this.identifier === c.identifier;
    }

    toString() {
        return this.name;
    }
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

export function makeIsCardPredicate(card: Card) : CardPredicate {
    return (c: Card) => { return card.isSameCard(c); }
}

export function makeIsTypePredicate(cardType: CardType) : CardPredicate {
    return (c: Card) => { return c.matchesType(cardType); }
}

export function makeIsCostPredicate(lower: number, upper: number) : CardPredicate {
    return (c: Card) => { return c.cost >= lower && c.cost <= upper; }
}

export var allCardsPredicate: CardPredicate = makeIsTypePredicate(CardType.All);

// Card utility functions

export function uniq(cards: Card[]) : Card[] {
    return _.uniq(cards, c => c.name); 
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

export function filter(cards:Card[], predicate:CardPredicate) : Card[] {
    return cards.filter(c => { return predicate(c) });
}

export function filterByType(cards:Card[], cardType:CardType) : Card[] {
    return filter(cards, makeIsTypePredicate(cardType));
}

export function filterByCard(cards:Card[], card:Card) : Card[] {
    return filter(cards, makeIsCardPredicate(card));
}

export function countByCard(cards: Card[], card: Card) : number {
    return filterByCard(cards, card).length;
}

export function contains(cards: Card[], card: Card) {
    return _.some<Card>(cards, makeIsCardPredicate(card));
}

export function asNames(cards: Card[], includeDebug = false) : string[] {
    return cards.map(c => includeDebug ? c.debugDescription : c.name);
}

/// Removes a card of the same type.
/// Throws an error if the card isn't present.
export function removeFirst(cards: Card[], card: Card) {
    var index = cards.findIndex(c => c.isSameCard(card));

    if (index === -1) {
        throw new Error('Unable to remove ' + card.name);
    }

    cards.splice(index, 1);
}

/// Removes the exact card object. Card identity can matter for effects like Mining Village.
/// Throws an error if the card isn't present.
export function removeIdentical(cards: CardInPlay[], card: CardInPlay) {
    const index = cards.findIndex(c => c.identifier == card.identifier);
    if (index === -1) {
        throw new Error('Unable to remove ' + card.identifier);
    }
    cards.splice(index, 1);
}

export class SupplyPile {
    constructor(readonly card: Card, public count:number) {
        this.card = card;
        this.count = count;
    }
}

export enum CardGroupType {
    Hand, Deck, Discard,
    InPlay,
    SetAside, Trash
}

export class CardGroup {

    protected _cards: CardInPlay[];
    
    /// Return copies of internal array
    get cards() : CardInPlay[] {
        return this._cards.slice();
    }

    get empty() : boolean { return this._cards.length == 0; }
    get count() : number { return this._cards.length; }

    get label() : string {
        const typeLabel = CardGroupType[this.groupType];
        if (this.owner) {
            return  `${this.owner} ${typeLabel}`;
        } else {
            return typeLabel;
        }
    }

    constructor(readonly owner: PlayerIdentifier | null,
                readonly groupType: CardGroupType,
                cards: CardInPlay[] = []) {
        this._cards = cards;
        for (const card of cards) {
            if (card.location) {
                throw new Error(`Cannot insert card to ${this.toString()}: card ${card.name} already in ${card.location}`);
            }
            card.location = this;
        }
    }

    toString() : string {
        return CardGroupType[this.groupType];
    }

    map<T>(f: (c: CardInPlay) => T) : T[] {
        return this._cards.map(f);
    }

    insertCard(card: CardInPlay) {
        if (card.location) {
            throw new Error(`Cannot insert card to ${this.toString()}: card ${card.name} already in ${card.location}`);
        }
        card.location = this;
        this._cards.push(card);
    }

    removeCard(card: CardInPlay) {
        if (card.location !== this) {
            throw new Error(`Cannot remove card from ${this}: card located in ${card.location}`);
        }

        const index = this._cards.indexOf(card);
        if (index == -1) {
            throw new Error(`Cannot remove card from ${this}: card missing from internal array ${this._cards}`);
        }
        
        this._cards.splice(index, 1);
        card.location = null;
    }

    includes(card: CardInPlay) : boolean {
        return this._cards.includes(card);
    }

    ofType(cardType: CardType) : CardInPlay[] {
        return this._cards.filter(c => c.matchesType(cardType));
    }

    ofReactionType(reactionType: ReactionType) : CardInPlay[] {
        return this._cards.filter(c => c.isReactionType(reactionType));
    }

    ofCard(card: Card) {
        return this._cards.filter(c => c.isSameCard(card));
    }

    // For debuging and testing

    setCards(cards: CardInPlay[]) {
        if (!this.empty) {
            throw new Error("Can only call setCards on empty CardGroup");
        }

        for (let c of cards) {
            if (c.location !== null) {
                throw new Error(`Card ${c} already has location: ${c.location}`);
            }
            this.insertCard(c);
        }
    }

    dropAllCards() {
        for (let c of this.cards) {
            this.removeCard(c);
        }
    }
}

export class CardStack extends CardGroup {
    get topCard() : CardInPlay | null {
        return this.count == 0 ? null : this._cards[this.count - 1];
    }

    topCards(n: number) : CardInPlay[] {
        return _.tail(this._cards, n);
    }

    insertCardAtBottom(card: CardInPlay) {
        if (card.location) {
            throw new Error(`Cannot insert card to ${this}: card ${card.name} still in ${card.location}`);
        }

        card.location = this;
        this._cards.unshift(card);
    }
}



export function randomizedKingdomCards(forcedCards: Card[], allCards: Card[], numCards: number) : Card[] {
    if (forcedCards.length >= numCards) {
        return forcedCards;
    }

    const randomOptions = _.difference<Card>(allCards, forcedCards);
    const randomCards = _.sample<Card>(randomOptions, numCards - forcedCards.length);
    return forcedCards.concat(randomCards);
};
