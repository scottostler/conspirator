import util = require('./util');
import base = require('./base');
import decisions = require('./decisions');
import cards = require('./cards');
import game = require('./game');

export interface Decider {
    setPlayer(player:base.BasePlayer):void;
    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback):void;
}
