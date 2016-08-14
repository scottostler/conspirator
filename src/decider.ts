import * as base from './base';
import * as cards from './cards';
import * as decisions from './decisions';
import * as util from './util';

export interface Decider {
    setPlayer(player:base.BasePlayer):void;
    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback):void;
}
