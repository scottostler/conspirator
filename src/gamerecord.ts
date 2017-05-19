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

export class PileRecord {
    constructor(readonly card: CardRecord, readonly count: number) {}
    static fromPile(pile: SupplyPile) : PileRecord {
        return new PileRecord(CardRecord.fromCard(pile.card), pile.count);
    }
}

export class PlayerRecord {
    constructor(readonly identifier: string,
                readonly name: string,
                readonly deckCount: number,
                readonly handCount: number,
                readonly topDiscard: CardRecord | null,
                readonly hand: CardRecord[] | null) {}
    
    static fromPlayer(player: Player, includeHand = false) {
        let topCard: Card | null;
        let topCardRecord: CardRecord | null;
        if (topCard = player.discard.topCard) {
            topCardRecord = CardRecord.fromCard(topCard);
        } else {
            topCardRecord = null;
        }
        
        const hand = includeHand ? player.hand.cards.map(CardRecord.fromCard) : null;

        return new PlayerRecord(player.identifier, player.name,
            player.deck.count, player.hand.count, topCardRecord, hand);
    }
}

export class GameRecord {
    constructor(readonly players: PlayerRecord[],
                readonly piles: PileRecord[],
                readonly trash: CardRecord[],
                readonly turnState: TurnState) {}

    static fromGame(game: Game) {
        return new GameRecord(
            game.players.map(p => PlayerRecord.fromPlayer(p)),
            game.buyablePiles.map(p => PileRecord.fromPile(p)),
            game.trash.map(c => CardRecord.fromCard(c)),
            game.turnState)
    }
}
