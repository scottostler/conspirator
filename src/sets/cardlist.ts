import _ = require('underscore');
import * as cards from '../cards';
import * as baseset from './baseset';
import * as intrigue from './intrigue';
import * as seaside from './seaside';

export var AllKingdomCards:cards.Card[] = [].concat(
    baseset.Cardlist, intrigue.Cardlist, seaside.Cardlist);

export var AllCards:cards.Card[] = AllKingdomCards.concat(cards.BaseCards);

export function getCardByName(cardName:string) : cards.Card {
    var card = _.find<cards.Card>(AllCards, c => c.name === cardName);
    if (!card) {
        throw new Error('Unable to find card: ' + cardName);
    }
    return card;
}

export function getCardsByNames(cardNames:string[]) : cards.Card[] {
    return _.map(cardNames, getCardByName);
}