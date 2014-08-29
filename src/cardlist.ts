import cards = require('./cards')
import baseset = require('./baseset');
import intrigue = require('./intrigue');

export var AllCards:cards.Card[] = baseset.Cardlist.concat(
    intrigue.Cardlist);
