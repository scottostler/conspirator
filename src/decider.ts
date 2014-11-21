import util = require('./util');
import base = require('./base');
import decisions = require('./decisions');
import cards = require('./cards');
import game = require('./game');

export interface Decider {
    setPlayer(player:base.BasePlayer):void;
    promptForPileSelection(piles:cards.Pile[], allowTreasures:boolean, allowCancel:boolean, label:string, onSelect:cards.PurchaseCallback):void;
    promptForHandSelection(min:number, max:number, cards:cards.Card[], label:string, onSelect:cards.CardsCallback):void;
    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback):void;
    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback):void;
}

export var DecisionEvents = [
    'promptForPileSelection',
    'promptForHandSelection',
    'promptForCardOrdering',
    'promptForDecision'
];
