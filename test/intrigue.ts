/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import cards = require('../src/cards');
import baseset = require('../src/sets/baseset');
import intrigue = require('../src/sets/intrigue');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;
import expectDeckScore = testsupport.expectDeckScore;
import expectEqualCards = testsupport.expectEqualCards;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
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
        expectBuyCount(game, 2);
        expectCoinCount(game, 4);
        done();
    });

    it('should otherwise gain an Estate', (done) => {
        var baronHand = [intrigue.Baron, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Baron), decider1, decider2, baronHand);

        game.start();
        decider1.playAction(intrigue.Baron);
        decider1.discardCard(null);
        expectBuyCount(game, 2);
        expectCoinCount(game, 0);
        expectTopDiscardCard(game.activePlayer, cards.Estate);
        done();
    });
});

describe('Bridge', () => {
    it('should give +1 buy and decrease card cost by 1', done => {
        var hand = [intrigue.Bridge, cards.Copper, cards.Copper, cards.Copper, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Bridge), decider1, decider2, hand);

        game.start();
        decider1.playAction(intrigue.Bridge);
        expectBuyCount(game, 2);
        expectCoinCount(game, 1);
        decider1.playTreasures([cards.Copper, cards.Copper, cards.Copper]);
        decider1.gainCard(cards.Duchy);
        done();
    });

    it('should stack with multiple plays', done => {
        var hand = [intrigue.Bridge, intrigue.Bridge, baseset.ThroneRoom, cards.Copper, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Bridge), decider1, decider2, hand);

        game.start();
        game.incrementActionCount(1);
        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(intrigue.Bridge);
        decider1.playAction(intrigue.Bridge);

        expectBuyCount(game, 4);
        expectCoinCount(game, 3);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Gold);
        done();
    });
});

describe('Conspirator', () => {
    var conspiratorHand = [intrigue.Conspirator, intrigue.Conspirator, intrigue.Conspirator, cards.Estate, cards.Estate];
    it('should give +2 coin, and +1 card, +1 action if 3+ actions were played', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Conspirator), decider1, decider2, conspiratorHand);

        game.start();
        game.incrementActionCount(2);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 2);
        expectCoinCount(game, 2);
        expect(game.activePlayer.hand).to.have.length(4);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 1);
        expectCoinCount(game, 4);
        expect(game.activePlayer.hand).to.have.length(3);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 1);
        expectCoinCount(game, 6);
        expect(game.activePlayer.hand).to.have.length(3);

        done();
    });
});

describe('Coppersmith', () => {
    it('should increase Copper value by 1', (done) => {
        var hand = [intrigue.Coppersmith, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Coppersmith), decider1, decider2, hand);

        game.start();
        decider1.playAction(intrigue.Coppersmith);
        expectCoinCount(game, 0);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        expectCoinCount(game, 4);
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
        expectCoinCount(game, 0);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        expectCoinCount(game, 6);
        done();
    });
});

describe('Courtyard', () => {
    var courtyardHand = [intrigue.Courtyard, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
    it('should draw 3 cards, discard 1 to deck', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Courtyard), decider1, decider2, courtyardHand);

        testsupport.setPlayerDeck(game, game.players[0], [cards.Estate, cards.Estate, cards.Estate]);

        game.start();
        decider1.playAction(intrigue.Courtyard);
        expect(game.activePlayer.hand).to.have.length(7);
        decider1.discardCard(cards.Copper);
        expectTopDeckCard(game.players[0], cards.Copper);
        expect(game.activePlayer.hand).to.have.length(6);
        done();
    });
});

describe('Duke', () => {
    it('should give 1 VP per Duchy', (done) => {
        expectDeckScore([intrigue.Duke], 0);
        expectDeckScore([intrigue.Duke].concat([cards.Duchy]), 4);
        expectDeckScore([intrigue.Duke, intrigue.Duke].concat([cards.Duchy, cards.Duchy]), 10);
        done();
    });
});

describe('Great Hall', () => {
    it('should give 1 VP', (done) => {
        expectDeckScore([intrigue.GreatHall], 1);
        expectDeckScore([intrigue.GreatHall, intrigue.GreatHall], 2);
        done();
    });

    it('should give +1 action, +1 card', (done) => {
        var hand = [intrigue.GreatHall, cards.Copper, cards.Copper, cards.Copper, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.GreatHall), decider1, decider2, hand);

        game.start();
        decider1.playAction(intrigue.GreatHall);
        expectActionCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(5);
        done();
    });
});

describe('Harem', () => {
    it('should give 2 VP', done => {
        expectDeckScore([intrigue.Harem], 2);
        expectDeckScore([intrigue.Harem, intrigue.Harem], 4);
        done();
    });

    var haremHand = [intrigue.Harem, cards.Copper, cards.Copper, cards.Copper, cards.Estate];
    it('should give +2 coin', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Harem), decider1, decider2, haremHand);

        game.start();
        decider1.playTreasures([intrigue.Harem, cards.Copper, cards.Copper, cards.Copper]);
        expectCoinCount(game, 5);
        done();
    });
});

describe('Ironworks', () => {
    it('should gain 0-4 cost card and give benefit', done => {
        var ironworksHand = [intrigue.Ironworks, intrigue.Ironworks, intrigue.Ironworks, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(intrigue.Ironworks, intrigue.GreatHall), decider1, decider2, ironworksHand);

        game.start();
        decider1.playAction(intrigue.Ironworks);
        decider1.gainCard(intrigue.GreatHall);
        expectActionCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(5);

        decider1.playAction(intrigue.Ironworks)
        decider1.gainCard(cards.Silver);
        expectActionCount(game, 0);
        expectCoinCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(4);

        done();
    });
});

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
