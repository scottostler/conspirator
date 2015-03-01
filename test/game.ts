/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import cards = require('../src/cards');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;

import expectEqualCards = testsupport.expectEqualCards;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

var fiveCopperHand = util.duplicate(cards.Copper, 5);

describe('Game.advanceTurn', () => {
   it('players should discard hand, and draw 5 cards after turn', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2);

        game.start();

        var player1Hand = _.clone(game.activePlayer.hand);
        decider1.playTreasures([]);
        decider1.gainCard(null);
        decider2.playTreasures([]);

        expectEqualCards(game.players[0].discard, player1Hand);
        expectPlayerHandSize(game.players[0], 5);

        done();
    });
});

describe('Game.isExactCardInPlay', () => {
    it('should match exact cards in play', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, fiveCopperHand);

        game.start();
        decider1.playTreasures([cards.Copper, cards.Copper, cards.Copper]);
        expect(game.isExactCardInPlay(game.activePlayer.hand[0])).to.eql(false, 'Hello!');
        expect(game.isExactCardInPlay(game.inPlay[0])).to.eql(true, 'Goodbye');
        done();
    });
});