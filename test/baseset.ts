/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import chai = require('chai');

import baseset = require('../src/sets/baseset');
import cards = require('../src/cards');
import testsupport = require('./testsupport');

import expect = chai.expect;

var copperHand = [cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
var threeCopperHand = [cards.Copper, cards.Copper, cards.Copper];
var feastHand = [baseset.Feast, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];

describe('Feast', () => {
    it('should gain card costing 0-5', (done) => {
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

var militiaHand = [baseset.Militia, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];

describe('Militia', () => {
    it('should cause opponent w/ 5 cards to discard', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, militiaHand, copperHand);
        game.start();

        expect(game.players[1].hand.length).to.eql(5);
        decider1.playAction(baseset.Militia);
        decider2.discardCards([cards.Copper, cards.Copper]);
        expect(game.players[1].hand.length).to.eql(3);
        done();
    });

    it('should not cause opponent w/ 3 cards to discard', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, militiaHand, threeCopperHand);
        game.start();

        expect(game.players[1].hand.length).to.eql(3);
        decider1.playAction(baseset.Militia);
        expect(game.players[1].hand.length).to.eql(3);
        decider1.gainCard(cards.Copper);
        done();
    });

    // TODO: test against Moat
});

var woodcutterHand = [baseset.Woodcutter, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];

describe('Woodcutter', () => {
    it('should let player buy twice', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, woodcutterHand, threeCopperHand);
        game.start();

        decider1.playAction(baseset.Woodcutter);
        decider1.gainCard(cards.Estate);
        decider1.gainCard(cards.Copper);
        decider2.gainCard(cards.Copper);
        done();
    });
});
