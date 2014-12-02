import _ = require('underscore');
import cards = require('../cards')
import baseset = require('./baseset');
import intrigue = require('./intrigue');

export var AllCards:cards.Card[] = baseset.Cardlist.concat(
    intrigue.Cardlist);

export function getCardByName(cardName:string) : cards.Card {
    var card = _.find<cards.Card>(AllCards, c => c.name === cardName);
    if (!card) {
        throw new Error('Unable to find card: ' + cardName);
    }
    return card;
}
