import _ = require('underscore');
import events = require("events");

import util = require('./util');
import cards = require('./cards');
import base = require('./base');
import decider = require('./decider');
import Player = require('./player');
import serialization = require('./serialization');
import PlayerInterface = require('./playerinterface');


// RemoteGame acts as a local proxy for a server-hosted game.
export class RemoteGame extends base.BaseGame {

    socket:any;
    gameState:any;
    humanInterface:PlayerInterface;
    players:RemotePlayer[];
    kingdomPileGroups:cards.Pile[][];
    gameListener:base.BaseGameListener;

    constructor(socket:any, gameState:any, humanInterface:PlayerInterface) {
        super();
        this.socket = socket;
        this.gameState = gameState;
        this.humanInterface = humanInterface;

        this.players = _.map(gameState.players, (playerState:any) => {
            return new RemotePlayer(playerState);
        });
        this.kingdomPileGroups = serialization.deserialize(gameState.kingdomPileGroups);

        if (gameState.playerIndex >= 0) {
            this.humanInterface.player = this.players[gameState.playerIndex];
        }

        var playerLookupFunc = _.bind(this.lookupAndUpdatePlayer, this);
        _.each(base.GameEvents, eventName => {
            socket.on(eventName, () => {
                this.assertListenerProperty(eventName);
                var eventArgs = serialization.deserialize(_.toArray(arguments), playerLookupFunc);
                (<any>this.gameListener)[eventName].apply(this.gameListener, eventArgs);
            });
        });

        var decisionCallback = _.bind(this.emitDecision, this);
        _.each(decider.DecisionEvents, decisionName => {
            this.socket.on(decisionName, () => {
                this.assertListenerProperty(decisionName);

                var args:any[] = serialization.deserialize(_.toArray(arguments));
                args.push(decisionCallback);

                (<any>this.humanInterface)[decisionName].apply(this.humanInterface, args);
            });
        });
    }

    assertListenerProperty(propertyName:string) {
        if (!(propertyName in this.gameListener)) {
            console.error('Missing property in RemoteGameListener',
                propertyName, this.gameListener);
            throw new Error('RemoteGameListener missing property: ' + propertyName);
        }
    }

    emitDecision(decisionArgs:any) {
        var eventArgs = ['decision'].concat(serialization.serialize(decisionArgs));
        this.socket.emit.apply(this.socket, eventArgs);
    }

    lookupAndUpdatePlayer(o:any) {
        var player = _.find(this.players, function(p:RemotePlayer) {
            return p.name === o.name;
        });

        if (player) {
            player.updateLocalState(o);
            return player;
        } else {
            console.error('Unable to lookup player', o)
            return null;
        }
    }
}



// RemotePlayer represents what this client knows about this player.
// Since RemoteGame will never ask its players for decisions, no decision
// logic is needed.
export class RemotePlayer extends base.BasePlayer {

    name:string;
    state:any;
    hand:cards.Card[];

    constructor(playerState:serialization.PlayerState) {
        super();
        this.name = playerState.name;
        this.updateLocalState(playerState);
    }

    updateLocalState(playerState:serialization.PlayerState) {
        this.state = playerState;
        this.state.topDiscard = playerState.topDiscard
            ? serialization.deserialize(playerState.topDiscard)
            : null;
        this.hand = serialization.deserialize(playerState.hand);
    }

    // Abstract methods

    getName() : string { return this.name; }
    getHand() : cards.Card[] { return this.hand; }
    deckCount() : number { return this.state.deckCount; }
    topDiscard() : cards.Card { return this.state.topDiscard; }
};
