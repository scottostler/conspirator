/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import cards = require('../src/cards');
import seaside = require('../src/sets/seaside');
import testsupport = require('./testsupport');

import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

describe('Bazaar', () => {
    it('should give +1, +2 actions, +1 coin', done => {
        var hand = [seaside.Bazaar, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(seaside.Bazaar);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 2);
        expectCoinCount(game, 1);

        done();
    });
});

describe('Warehouse', () => {

    it('should give +1 action and +3 cards, then discard 3 cards', done => {
        var hand = [seaside.Warehouse, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(seaside.Warehouse);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 7);
        decider1.discardCards([cards.Copper, cards.Copper, cards.Copper]);

        decider1.playTreasures([cards.Copper]);

        done();
    });
});