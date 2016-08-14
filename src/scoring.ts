import _ = require('underscore');
import * as cards from './cards';
import * as util from './util';

export function calculateScore(deck:cards.Card[]) : number {
    return util.mapSum(deck, (card:cards.Card) => {
        if (card.vp) {
            return card.vp.calculatePoints(deck);
        } else {
            return 0;
        }
    });
}
