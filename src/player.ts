import * as _ from "underscore";

import { DiscardDestination, GainDestination } from './base';
import { Card, CardGroup, CardGroupType, CardInPlay, CardPredicate, CardStack, SupplyPile } from './cards';
import Decider from './decider';
import { Decision, DiscardCardDecision } from './decisions';
import Game from './game';
import { listToOption } from './utils';

export type PlayerIdentifier = string; 

export class Player {

    identifier: PlayerIdentifier;
    name: string;
    hand: CardGroup;
    deck: CardStack;
    discard: CardStack;

    constructor(name: string, startingDeck: CardInPlay[]) {
        this.identifier = name;
        this.name = name;
        this.hand = new CardGroup(this.identifier, CardGroupType.Hand);
        this.deck = new CardStack(this.identifier, CardGroupType.Deck, startingDeck);
        this.discard = new CardStack(this.identifier, CardGroupType.Discard);
    }

    get cardGroups() : [CardGroup] {
        return [this.hand, this.deck, this.discard];
    }

    toString() { return this.name; }

    canDraw() : boolean {
        return !this.deck.empty || !this.discard.empty;
    }

    // May trigger a shuffle
    topCardsOfDeck(game: Game, n: number) : CardInPlay[] {
        if (this.deck.count < n) {
            const reorderedDiscard = _.shuffle<CardInPlay>(this.discard.cards);
            game.moveCardsToBottom(reorderedDiscard, this.deck);

            game.log(`${this.name} shuffles`);
        }

        return _.last(this.deck.cards, n);
    }

    // May trigger a shuffle
    topCardOfDeck(game: Game) : CardInPlay | null {
        return listToOption(this.topCardsOfDeck(game, 1));
    }

    getFullDeck() : CardInPlay[] {
        return _.flatten(this.cardGroups.map(g => g.cards));
    }

    cardGroupForGainDestination(destination: GainDestination) : CardGroup {
        switch (destination) {
            case GainDestination.Discard:
                return this.discard;
            case GainDestination.Hand:
                return this.hand;
            case GainDestination.Deck:
                return this.deck;
        }
    }

    cardGroupForDiscardDestination(destination: DiscardDestination) : CardGroup {
        switch (destination) {
            case DiscardDestination.Deck:
                return this.deck;
            case DiscardDestination.Discard:
                return this.discard;
        }
    }

}
