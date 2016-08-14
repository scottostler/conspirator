import _ = require('underscore');

import * as util from '../util';
import Player from '../player';
import * as cards from '../cards';
import Game from '../game';
import * as decisions from '../decisions';
import * as decider from '../decider';

export class AIDecider implements decider.Decider {

    player:Player;

    assertPlayer() {
        if (!this.player) {
            throw new Error('Missing valid player');
        }
    }

    setPlayer(player:Player):void {
        this.player = player;
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback):void {
        this.assertPlayer();
        var count = _.random(decision.minSelections, decision.maxSelections);
        onDecide(_.sample<string>(decision.options, count));
    }
}

export function makeComputerPlayers(numPlayers:number) : Player[] {
    if (numPlayers > 4 || numPlayers == 0) {
        throw new Error('Invalid number of players: ' + numPlayers);
    }

    var computerNames = ['Alice', 'Bob', 'Carl', 'Doug'];
    return _.take(computerNames, numPlayers).map(function(name) {
        return new Player(name, new AIDecider());
    });
}
