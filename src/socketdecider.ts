// SocketDecider proxies decisions to a connected socketio client.

/// <reference path="../typings/underscore/underscore.d.ts" />

import _ = require('underscore');
import util = require('./util');
import cards = require('./cards');
import serialization = require('./serialization');
import Player = require('./player');
import base = require('./base');
import game = require('./game');
import decisions = require('./decisions');
import decider = require('./decider');

export class SocketDecider implements decider.Decider {

    socket:any;
    pendingRequestCallback:any;
    player:Player;

    constructor(socket:any) {
        this.socket = socket;
        this.pendingRequestCallback = null;

        this.socket.on('decision', () => {
            if (!this.pendingRequestCallback) {
                console.error('Error: decision made with no pending callback');
                return;
            }

            // Decisions don't return players, so no lookup func.
            var callbackArgs = serialization.deserialize(_.toArray(arguments));

            // Clear before invoking.
            var callback = this.pendingRequestCallback;
            this.pendingRequestCallback = null;
            callback.apply(null, callbackArgs);
        });
    }

    // When a SocketDecider is asked to make a decision, the
    // callback is saved until the player responds via the socket.
    // As players can only make one decision at a time,
    // at most one callback should be stored.
    assertNoCallback() {
        if (this.pendingRequestCallback) {
            console.error('SocketDecider already has a stored callback', this.pendingRequestCallback);
        }
    }

    assertPlayer() {
        if (!this.player) {
            console.error('Missing valid player', this);
        }
    }

    setPlayer(player:Player) {
        this.player = player;
    }

    // Prompts

    promptForPileSelection(piles:any, allowTreasures:boolean, allowCancel:boolean, onSelect:cards.PurchaseCallback) {
        this.assertPlayer();
        this.assertNoCallback();
        this.pendingRequestCallback = onSelect;
        this.socket.emit('promptForPileSelection', serialization.serialize(piles), allowTreasures, allowCancel);
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], onSelect:cards.CardsCallback) {
        this.assertPlayer();
        this.assertNoCallback();
        this.pendingRequestCallback = onSelect;
        this.socket.emit('promptForHandSelection', min, max, serialization.serialize(cards));
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
        this.assertPlayer();
        this.assertNoCallback();
        this.pendingRequestCallback = onOrder;
        this.socket.emit('promptForCardOrdering', serialization.serialize(cards));
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback) {
        this.assertPlayer();
        this.assertNoCallback();
        this.pendingRequestCallback = onDecide;
        this.socket.emit('promptForDecision', serialization.serialize(decision));
    }

}
