import _ = require('underscore');
import cards = require('./cards');
import util = require('./util');

export function calculateScore(deck:cards.Card[]) : number {
    return util.mapSum(deck, (card:cards.Card) => {
        if (card.vp) {
            return card.vp.calculatePoints(deck);
        } else {
            return 0;
        }
    });
}
