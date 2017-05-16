import { Card, CardInPlay, CardIdentifier, SupplyPile } from './cards';
import Game from './game';
import { Player, PlayerIdentifier } from './player';
import TurnState from './turnstate';

export interface CardRecord {
    set: string;
    name: string;
    identifier?: CardIdentifier;
}

export namespace CardRecord {
    export function fromCard(card: Card) : CardRecord {
        if (card instanceof CardInPlay) {
            return { set: card.set, name: card.name, identifier: card.identifier };            
        } else {
            return { set: card.set, name: card.name };
        }
    }
}

export interface PileRecord {
    card: CardRecord;
    count: number;
}

export namespace PileRecord {
    export function toRecord(pile: SupplyPile) : PileRecord | null {
        return null;
    }
}

export interface PlayerRecord {
    identifier: PlayerIdentifier;
    name: string;
    deckCount: number;
    topDiscard: CardRecord;
    handCount: number;
    hand?: CardRecord[];
}

export interface GameRecord {
    players: PlayerRecord[];
    piles: PileRecord[];
    trash: CardRecord[];
    turnState: TurnState;
}

export namespace GameRecord {
    export function fromGame(game: Game) : GameRecord | null {
        return null;
    }
}