// A Conspirator decider that calls into rspeer's Dominiate.

import util = require('../util');
import Player = require('../player');
import cards = require('../cards');
import Game = require('../game');
import decisions = require('../decisions');
import decider = require('../decider');

export class SimulatorDecider implements decider.Decider {

    game:Game;
    player:Player;

    constructor() {
    }

    assertSetup() {
        if (!this.player) {
            throw new Error('Missing player');
        } else if (!this.game) {
            throw new Error('Missing game');
        }
    }

    setGame(game:Game):void {
        this.game = game;
    }

    setPlayer(player:Player):void {
        this.player = player;
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback):void {
        this.assertSetup();
        var count = _.random(decision.minSelections, decision.maxSelections);
        onDecide(_.sample<string>(decision.options, count));
    }
}
