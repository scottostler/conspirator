import { DiscardDestination, DiscardSource, GainSource, GainDestination, GameState, RevealSource, TrashSource } from './base';
import { Card, CardInPlay, CardIdentifier } from './cards';
import { CardRecord } from './gamerecord';
import { Player, PlayerIdentifier } from './player';


//// Game Events

export abstract class GameEvent {

    // Automatically set in the base class constructor.
    // Optional so EventProperties objects don't need it.
    //
    // Type subtraction could improve this: https://github.com/Microsoft/TypeScript/issues/4183
    readonly name?: string;

    constructor() {
        // Remove trailing 'Event' from class names, e.g. CardsDrawnEvent => CardsDrawn
        this.name = this.constructor.name.replace(/Event$/, "");
    }

    static build<T extends GameEvent>(eventClass: { new(): T; }, properties: EventProperties<T>) : T {
        const event = new eventClass();
        Object.assign(event, properties);
        return event;
    }

}

type EventProperties<T extends GameEvent> = {
    [P in keyof T]: T[P];
}

export class CardsDrawnEvent extends GameEvent {
    player: PlayerIdentifier;
    numCards: number;
    cards?: CardRecord[];
}

export class CardBoughtEvent extends GameEvent {
    player: PlayerIdentifier;
    card: CardRecord;
}

export class CardsGainedEvent extends GameEvent {
    player: PlayerIdentifier;
    cards: CardRecord[];
    source: GainSource;
    destination: GainDestination;
}

export class CardPlayedEvent extends GameEvent {
    player: PlayerIdentifier;
    card: CardRecord;
    fromHand: boolean;
}

export class CardPassedEvent extends GameEvent {
    fromPlayer: PlayerIdentifier;
    toPlayer: PlayerIdentifier;
    card?: CardRecord;
}

export class CardsDiscardedEvent extends GameEvent {
    player: PlayerIdentifier;
    numCards: number;
    cards?: CardRecord[];
    source: DiscardSource;
    destination: DiscardDestination;
}

export class CardsTrashedEvent extends GameEvent {
    player: PlayerIdentifier;
    cards: CardRecord[];
    source: TrashSource;
}

export class CardsRevealedEvent extends GameEvent {
    player: PlayerIdentifier;
    cards: CardRecord[];
    source: RevealSource;
}

export class GameEndsEvent extends GameEvent {
    decks: [PlayerIdentifier, CardRecord][];
}

export interface EventListener {
    handleEvent(event: GameEvent): void;
}

export class EventEmitter {

    eventListeners: EventListener[] = [];

    emitEvent(event: GameEvent) {
        for (const listener of this.eventListeners) {
            listener.handleEvent(event);
        }
    }

    addEventListener(listener: EventListener) {
        this.eventListeners.push(listener);
    }

    removeEventListener(listener: EventListener) {
        const idx = this.eventListeners.indexOf(listener);
        if (idx !== -1) {
            this.eventListeners.splice(idx, 1);
        }
    }

    //// Game Events 

    playerDrewCards(player: Player, cards: CardInPlay[]) {
        const event = GameEvent.build<CardsDrawnEvent>(CardsDrawnEvent, {
            player: player.identifier,
            numCards: cards.length,
            cards: cards.map(c => CardRecord.fromCard(c))
        });
        this.emitEvent(event);
    }

    playerBuysCard(player: Player, card: Card) {
        const event = GameEvent.build<CardBoughtEvent>(CardBoughtEvent, {
            player: player.identifier,
            card: CardRecord.fromCard(card)
        });
        this.emitEvent(event);
    }

    playerGainedCards(player: Player, cards: CardInPlay[], source: GainSource, destination: GainDestination) {
        const event = GameEvent.build<CardsGainedEvent>(CardsGainedEvent, {
            player: player.identifier,
            cards: cards.map(c => CardRecord.fromCard(c)),
            source: source,
            destination: destination
        });
        this.emitEvent(event);
    }

    playerDiscardedCards(player: Player, cards: CardInPlay[], source: DiscardSource, destination: DiscardDestination) {
        const event = GameEvent.build<CardsDiscardedEvent>(CardsDiscardedEvent, {
            player: player.identifier,
            numCards: cards.length,
            cards: cards.map(c => CardRecord.fromCard(c)),
            source: source,
            destination: destination
        });
        this.emitEvent(event);
    }

    playerPlayedCard(player: Player, card: CardInPlay, fromHand: boolean) {
        const event = GameEvent.build<CardPlayedEvent>(CardPlayedEvent, {
            player: player.identifier,
            card: CardRecord.fromCard(card),
            fromHand: fromHand
        });
        this.emitEvent(event);
    }

    playerPassedCard(fromPlayer: Player, toPlayer: Player, card: CardInPlay) {
        const event = GameEvent.build<CardPassedEvent>(CardPassedEvent, {
            fromPlayer: fromPlayer.identifier,
            toPlayer: toPlayer.identifier,
            card: CardRecord.fromCard(card)
        });
        this.emitEvent(event);
    }

    playerTrashedCards(player: Player, cards: CardInPlay[], source: TrashSource) {
        const event = GameEvent.build<CardsTrashedEvent>(CardsTrashedEvent, {
            player: player.identifier,
            cards: cards.map(c => CardRecord.fromCard(c)),
            source: source
        });
        this.emitEvent(event);
    }

    playerRevealsCards(player: Player, cards: CardInPlay[], source: RevealSource) {
        const event = GameEvent.build<CardsRevealedEvent>(CardsRevealedEvent, {
            player: player.identifier,
            cards: cards.map(c => CardRecord.fromCard(c)),
            source: source
        });
        this.emitEvent(event);
    }

    gameEnds() {
        this.emitEvent(new GameEndsEvent());
    }

}
