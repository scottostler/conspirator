import _ = require('underscore');
import util = require('../util');
import cards = require('../cards');
import Player = require('../player');
import cardlist = require('../sets/cardlist')

import Card = cards.Card;
import Pile = cards.Pile;

export interface PlayerState {
    _cType:string;
    name:string;
    deckCount:number;
    topDiscard:any;
    hand:any[];
}

export function serializePlayer(player:Player, forPlayer:Player) : PlayerState {
    var hand = player === forPlayer
        ? player.hand
        : util.duplicate(cards.Cardback, player.hand.length);

    return {
        _cType: 'player',
        name: player.name,
        deckCount: player.deckCount(),
        topDiscard: serialize(player.topDiscard()),
        hand: serialize(hand)
    };
}


export function serialize(o:any, forPlayer?:Player) : any {
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
        return _.map(o, c => { return serialize(c, forPlayer); });
    } else if (_.isObject(o) || _.isString(o) || _.isNumber(o) || _.isBoolean(o)) {
        return o;
    } else {
        throw new Error('Unable to serialize ' + o);
    }
};

// Players must be looked up from the game instance by id,
// so player deserialization requires a playerLookupFunc.
//
// The lookup function may also update the locally stored player state,
// if performed on the client.
export function deserialize(o:any, playerLookupFunc?:any) : any {
    if (o === null) {
        return null;
    } else if (o._cType === 'card') {
        return cardlist.getCardByName(o.name);
    } else if (o._cType === 'pile') {
        return new Pile(cardlist.getCardByName(o.card), o.count);
    } else if (o._cType === 'player') {
        return playerLookupFunc(o);
    } else if (_.isArray(o)) {
        return _.map(o, c => {
            return deserialize(c, playerLookupFunc);
        });
    } else if (_.isObject(o) || _.isString(o) || _.isNumber(o) || _.isBoolean(o)) {
        return o;
    } else {
        throw new Error('Unable to deserialize ' + o);
    }
};
