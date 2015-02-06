/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import cards = require('../src/cards');
import intrigue = require('../src/sets/intrigue');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;
import expectDeckScore = testsupport.expectDeckScore;
import expectEqualCards = testsupport.expectEqualCards;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import neutralCardsWith = testsupport.neutralCardsWith;

describe('Baron', () => {
    it('should allow discarding an Estate for +4 coin', (done) => {
        var baronHand = [intrigue.Baron, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Baron), decider1, decider2, baronHand);

        game.start();
        decider1.playAction(intrigue.Baron);
        decider1.discardCard(cards.Estate);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.turnState.coinCount).to.eql(4);
        done();
    });

    it('should otherwise gain Estate', (done) => {
        var baronHand = [intrigue.Baron, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Baron), decider1, decider2, baronHand);

        game.start();
        decider1.playAction(intrigue.Baron);
        decider1.discardCard(null);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.turnState.coinCount).to.eql(0);
        expectTopDiscardCard(game.activePlayer, cards.Estate);
        done();
    });
});

describe('Bridge', () => {
    it('should give +1 buy and decrease card cost by 1', (done) => {
        var bridgeHand = [intrigue.Bridge, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Bridge), decider1, decider2, bridgeHand);

        game.start();
        decider1.playAction(intrigue.Bridge);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.turnState.coinCount).to.eql(1);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        done();
    });

    // TODO: test with Throne Room
});

// TODO:
// Conspirator,

describe('Coppersmith', () => {
    it('should increase Copper value by 1', (done) => {
        var hand = [intrigue.Coppersmith, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Coppersmith), decider1, decider2, hand);

        game.start();
        decider1.playAction(intrigue.Coppersmith);
        expect(game.turnState.coinCount).to.eql(0);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        expect(game.turnState.coinCount).to.eql(4);
        done();
    });

    it('should stack with multiple plays', (done) => {
        var hand = [intrigue.Coppersmith, intrigue.Coppersmith, cards.Copper, cards.Copper, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Coppersmith), decider1, decider2, hand);

        game.start();
        game.incrementActionCount(1);
        decider1.playAction(intrigue.Coppersmith);
        decider1.playAction(intrigue.Coppersmith);
        expect(game.turnState.coinCount).to.eql(0);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        expect(game.turnState.coinCount).to.eql(6);
        done();
    });
});


// Courtyard,
// Duke,
// GreatHall,
// Harem,
// Ironworks,
// Masquerade,
// MiningVillage,
// Minion,
// Nobles,
// Pawn,
// Saboteur,
// Scout,
// SecretChamber,
// ShantyTown,
// Steward,
// Swindler,
// Torturer,
// TradingPost,
// Tribute,
// Upgrade,
// WishingWell
