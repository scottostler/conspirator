/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import base = require('../src/base');
import util = require('../src/util');
import decider = require('../src/decider');
import decisions = require('../src/decisions');
import cards = require('../src/cards');
import Game = require('../src/game');
import Player = require('../src/player');
import baseset = require('../src/sets/baseset');

var expect = chai.expect;

class TestingDecider implements decider.Decider {

    setPlayer(player:base.BasePlayer) {}

    promptForPileSelection(piles:cards.Pile[], allowTreasures:boolean, allowCancel:boolean, label:string, onSelect:cards.PurchaseCallback) {
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], label:string, onSelect:cards.CardsCallback) {
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback) {
    }
}

function setupGame(hand1:cards.Card[], hand2:cards.Card[], kingdomCards:cards.Card[]) : Game {
    var decider1 = new TestingDecider();
    var player1 = new Player('Player 1', decider1);
    player1.hand = hand1;

    var decider2 = new TestingDecider();
    var player2 = new Player('Player 2', decider2);
    player2.hand = hand2;

    return new Game([player1, player2], kingdomCards);
}

describe('feast', () => {
    it('should let player gain card costing 0-4', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var bridgeHand = [baseset.Feast, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var copperHand = [cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var game = setupGame(bridgeHand, copperHand, kingdomCards);

        done();
    });
});
