/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import chai = require('chai');

import baseset = require('../src/sets/baseset');
import cards = require('../src/cards');
import testsupport = require('./testsupport');

import expect = chai.expect;

var copperHand = [cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
var feastHand = [baseset.Feast, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];

describe('feast', () => {
    it('should let player gain card costing 0-5', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, feastHand, copperHand);
        game.start();

        decider1.playAction(baseset.Feast);
        decider1.canGain([cards.Copper, cards.Curse, cards.Estate, cards.Silver, cards.Duchy].concat(kingdomCards));
        decider1.gainCard(baseset.Laboratory);
        done();
    });
});
