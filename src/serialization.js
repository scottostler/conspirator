var _ = require('underscore');
var util = require('./util.js');
var Cards = require('./cards.js').Cards;
var Card = require('./cards.js').Card;
var Pile = require('./cards.js').Pile;
var Player = require('./player.js');

function serializePlayer(player, forPlayer) {
    if (!forPlayer) {
        throw new Error('Asked to serialize player without providing forPlayer');
    }

    var hand = player === forPlayer
        ? player.hand
        : util.repeat(Cards.Cardback, player.hand.length);

    return {
        _cType: 'player',
        id: player.id,
        name: player.name,
        deckCount: player.deckCount(),
        topDiscard: serialize(player.topDiscard()),
        hand: serialize(hand)
    };
}


function serialize(o, forPlayer) {
    if (_.isFunction(o)) {
        throw new Error('Unable to serialize function' + o.toString());
    } else if (o === null) {
        return null;
    } else if (o instanceof Card) {
        return { _cType: 'card', name: o.name };
    } else if (o instanceof Player) {
        return serializePlayer(o, forPlayer);
    } else if (o instanceof Pile) {
        return { _cType: 'pile', card: o.card.name, count: o.count };
    } else if (_.isArray(o)) {
        return _.map(o, function(c) { return serialize(c, forPlayer); });
    } else if (_.isObject(o) || _.isString(o) || _.isNumber(o) || _.isBoolean(o)) {
        return o;
    } else {
        throw new Error('Unable to serialize ' + o);
    }
};

module.exports.serialize = serialize;

// Players must be looked up from the game instance by id,
// ergo player deserialization requires a playerLookupFunc.
//
// The lookup function may also update the locally stored player state,
// if performed on the client.
function deserialize(o, playerLookupFunc) {
    if (o === null) {
        return null;
    } else if (o._cType === 'card') {
        return Cards.getCardByName(o.name);
    } else if (o._cType === 'pile') {
        return new Pile(Cards.getCardByName(o.card), o.count);
    } else if (o._cType === 'player') {
        return playerLookupFunc(o);
    } else if (_.isArray(o)) {
        return _.map(o, function(c) {
            return deserialize(c, playerLookupFunc);
        });
    } else if (_.isObject(o) || _.isString(o) || _.isNumber(o) || _.isBoolean(o)) {
        return o;
    } else {
        throw new Error('Unable to deserialize ' + o);
    }
};

module.exports.deserialize = deserialize;
