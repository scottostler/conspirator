/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import cards = require('../src/cards');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;

import neutralCardsWith = testsupport.neutralCardsWith;

var fiveCopperHand = util.duplicate(cards.Copper, 5);

describe('Game.isExactCardInPlay', () => {
    it('should match exact cards in play', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(), decider1, decider2, fiveCopperHand);

        game.start();
        decider1.playTreasures([cards.Copper, cards.Copper, cards.Copper]);
        expect(game.isExactCardInPlay(game.activePlayer.hand[0])).to.eql(false, 'Hello!');
        expect(game.isExactCardInPlay(game.inPlay[0])).to.eql(true, 'Goodbye');
        done();
    });
});