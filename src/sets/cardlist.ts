import { Card } from '../cards';
import * as core from './common';
import * as baseset from './baseset';
import * as intrigue from './intrigue';
import * as seaside from './seaside';

export var AllKingdomCards: Card[] = baseset.Cardlist.concat(intrigue.Cardlist, seaside.Cardlist);

export var AllCards: Card[] = AllKingdomCards.concat(core.Cardlist);

export function getCardByName(cardName: string) : Card {
    const card = AllCards.find(c => c.name == cardName);
    if (!card) {
        throw new Error('Unable to find card: ' + cardName);
    }
    return card;
}

export function getCardsByNames(cardNames: string[]) : Card[] {
    return cardNames.map(n => getCardByName(n));
}
