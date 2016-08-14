import * as base from '../base';
import * as cards from '../cards';
import * as decider from '../decider';
import * as decisions from '../decisions';
import * as effects from '../effects';
import Game from '../game';
import Player from '../player';
import * as util from '../util';

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
