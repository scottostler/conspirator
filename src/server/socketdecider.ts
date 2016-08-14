// SocketDecider proxies decisions to a connected socketio client.

import _ = require('underscore');

import * as util from './util';
import * as cards from '../cards';
import Player from '../player';
import * as base from './base';
import Game from './game';
import * as decider from './decider';
import * as decisions from './decisions';
import * as serialization from './serialization';

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

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        this.assertPlayer();
        this.assertNoCallback();
        this.pendingRequestCallback = onDecide;
        this.socket.emit('promptForDecision', serialization.serialize(decision));
    }

}
