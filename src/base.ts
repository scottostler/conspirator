import TurnState from './turnstate';

export enum TurnPhase {
    Action,
    BuyPlayTreasure,
    BuyPurchaseCard,
    Cleanup
}

export enum CardType {
    Action,
    Treasure,
    Victory,
    Reaction,
    Curse,
    All
}

export enum GainSource {
    Pile, Trash
}

export enum GainDestination {
    Deck, Discard, Hand
}

export enum DiscardSource {
    Deck, Hand, InPlay
}

export enum DiscardDestination {
    Discard, Deck
}

export interface GameState {
    activePlayer: string;
    turnCount: number;
    turnState: TurnState;
}

export enum RevealSource {
    Deck, Hand
}

export enum TrashSource {
    Deck, Discard, Hand, InPlay
}
