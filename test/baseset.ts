/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import baseset = require('../src/sets/baseset');
import cards = require('../src/cards');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;
import expectDeckScore = testsupport.expectDeckScore;
import expectTopDeckCard = testsupport.expectTopDeckCard;

var copperHand = util.duplicate(cards.Copper, 5);
var copperEstateHand = util.duplicate(cards.Copper, 3).concat(util.duplicate(cards.Estate, 2));
var threeCopperHand = util.duplicate(cards.Copper, 3);

describe('Adventurer', () => {
    it('should draw two treasures', (done) => {
        var kingdomCards = [
            baseset.Adventurer, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var adventurerHand = [baseset.Adventurer, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, adventurerHand, copperHand);
        game.start();
        decider1.playAction(baseset.Adventurer);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        done();
    });
});

describe('Bureaucrat', () => {
    it('should gain silver and attack opponent', (done) => {
        var kingdomCards = [
            baseset.Bureaucrat, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var bureaucratHand = [baseset.Bureaucrat, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, bureaucratHand, copperEstateHand);
        game.start();

        decider1.playAction(baseset.Bureaucrat);
        decider2.discardCard(cards.Estate);
        expect(game.players[1].hand).to.have.length(4);
        expectTopDeckCard(game.players[1], cards.Estate);
        done();
    });
});

describe('Cellar', () => {
    it('should allow discard for draw', (done) => {
        var kingdomCards = [
            baseset.Cellar, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var cellarHand = [baseset.Cellar, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, cellarHand, copperHand);
        game.start();

        decider1.playAction(baseset.Cellar);
        decider1.discardCards([cards.Estate, cards.Estate, cards.Estate, cards.Estate]);
        expect(game.players[0].hand).to.have.length(4);
        expect(game.turnState.actionCount).to.eql(1);
        done();
    });
});

describe('Chapel', () => {
    it('should trash 0-4 cards', (done) => {
        var kingdomCards = [
            baseset.Chapel, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var chapelHand = [baseset.Chapel, cards.Estate, cards.Estate, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, chapelHand, copperHand);
        game.start();
        expect(game.players[0].hand).to.have.length(6);
        decider1.playAction(baseset.Chapel);
        decider1.hasSelectionCounts(0, 4);
        decider1.trashCards([cards.Copper, cards.Estate, cards.Estate]);
        expect(game.players[0].hand).to.have.length(2);
        done();
    });
});

describe('Chancellor', () => {
    var chancellorHand = [baseset.Chancellor].concat(util.duplicate(cards.Copper, 4));
    it('should let player discard deck', (done) => {
        var kingdomCards = [
            baseset.Chancellor, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, chancellorHand, copperHand);
        game.start();
        expect(game.activePlayer.deck).to.have.length(10);
        expect(game.activePlayer.discard).to.have.length(0);
        decider1.playAction(baseset.Chancellor);
        decider1.makeDiscardDeckDecision(true);
        expect(game.activePlayer.deck).to.have.length(0);
        expect(game.activePlayer.discard).to.have.length(10);
        done();
    });
});

describe('Council Room', () => {
    var councilRoomHand = [baseset.CouncilRoom].concat(util.duplicate(cards.Copper, 4));
    it('should give +4 cards, +1 buy, and draw opponent a card', (done) => {
        var kingdomCards = [
            baseset.CouncilRoom, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, councilRoomHand, copperHand);
        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.activePlayer.hand).to.have.length(8);
        expect(game.players[1].hand).to.have.length(6);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Curse);
        decider1.gainCard(cards.Copper);
        done();
    });

    it('should handle opponent with empty deck', (done) => {
        var kingdomCards = [
            baseset.CouncilRoom, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, councilRoomHand, copperHand);
        game.players[1].deck = [];
        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.activePlayer.hand).to.have.length(8);
        expect(game.players[1].hand).to.have.length(5);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Curse);
        decider1.gainCard(cards.Copper);
        done();
    });
});

describe('Feast', () => {
    it('should gain card costing 0-5', (done) => {
        var feastHand = [baseset.Feast].concat(util.duplicate(cards.Copper, 4));
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

describe('Festival', () => {
    it('should give +2 actions, +1 buy, +2 coin', (done) => {
        var festivalHand = [baseset.Festival].concat(util.duplicate(cards.Copper, 4));
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, festivalHand, copperHand);
        game.start();

        decider1.playAction(baseset.Festival);
        expect(game.turnState.actionCount).to.eql(2);
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.turnState.coinCount).to.eql(2);
        expect(game.activePlayer.hand).to.have.length(4);
        done();
    });
});

describe('Gardens', () => {
    it('should give 1 VP per 10 cards', (done) => {
        expectDeckScore([baseset.Gardens], 0);
        expectDeckScore([baseset.Gardens].concat(util.duplicate(cards.Copper, 9)), 1);
        expectDeckScore([baseset.Gardens, baseset.Gardens].concat(util.duplicate(cards.Copper, 9)), 2);
        expectDeckScore([baseset.Gardens, baseset.Gardens].concat(util.duplicate(cards.Copper, 18)), 4);
        done();
    });
});


describe('Laboratory', () => {
    it('should give +2 cards, +1 action', (done) => {
        var labHand = [baseset.Laboratory, baseset.Laboratory].concat(util.duplicate(cards.Copper, 3));
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Market, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, labHand, copperHand);
        game.start();

        expect(game.activePlayer.hand).to.have.length(5);
        decider1.playAction(baseset.Laboratory);
        decider1.playAction(baseset.Laboratory);
        expect(game.turnState.actionCount).to.eql(1)
        expect(game.activePlayer.hand).to.have.length(7);
        done();
    });
});

// Library

describe('Market', () => {
    it('should give +1 action, +1 card, +1 coin, +1 buy', (done) => {
        var marketHand = [baseset.Market].concat(util.duplicate(cards.Copper, 4));
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Market, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, marketHand, copperHand);
        game.start();

        var market = game.players[0].hand[0];

        expect(game.activePlayer.hand).to.have.length(5);
        decider1.playAction(baseset.Market);
        expect(game.isCardInPlay(market)).to.be.true;
        expect(game.turnState.actionCount).to.eql(1)
        expect(game.turnState.buyCount).to.eql(2);
        expect(game.turnState.coinCount).to.eql(1);
        expect(game.activePlayer.hand).to.have.length(5);
        done();
    });
});

describe('Militia', () => {
    var militiaHand = [baseset.Militia].concat(util.duplicate(cards.Copper, 4));
    it('should cause opponent w/ 5 cards to discard', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, militiaHand, copperHand);
        game.start();

        expect(game.players[1].hand).to.have.length(5);
        decider1.playAction(baseset.Militia);
        decider2.discardCards([cards.Copper, cards.Copper]);
        expect(game.players[1].hand).to.have.length(3);
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
        decider1.playTreasures([]);
        decider1.gainCard(cards.Copper);
        done();
    });

    // TODO: test against Moat
});

describe('Mine', () => {
    var twoMineHand = [baseset.Mine, baseset.Mine].concat(util.duplicate(cards.Copper, 3));
    it('should let player upgrade treasure', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, twoMineHand, copperHand);
        game.start();
        game.incrementActionCount(1);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(cards.Copper);
        decider1.gainCard(cards.Silver);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(cards.Silver);
        decider1.gainCard(cards.Gold);
        decider1.playTreasures([cards.Gold, cards.Copper, cards.Copper]);
        decider1.gainCard(baseset.Festival);
        done();
    });
});

// TODO: Moat

describe('Moneylender', () => {
    var moneylenderHand = [baseset.Moneylender].concat(util.duplicate(cards.Copper, 4));
    var moneylenderNoCopperHand = [baseset.Moneylender].concat(util.duplicate(cards.Estate, 4));    
    it('should let player trash Copper for +3 coin', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, moneylenderHand, copperHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        decider1.trashCard(cards.Copper);
        expect(game.turnState.coinCount).to.eql(3);
        done();
    });

    it('should do nothing if no Copper is trashed', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, moneylenderNoCopperHand, copperHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        expect(game.turnState.coinCount).to.eql(0);
        decider1.gainCard(cards.Copper);
        done();
    });
});

describe('Remodel', () => {
    var remodelHand = [baseset.Remodel].concat([cards.Duchy], util.duplicate(cards.Copper, 3));
    it('should replace card with card costing up to 2 more', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Remodel];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, remodelHand, copperHand);
        game.start();

        decider1.playAction(baseset.Remodel);
        decider1.trashCard(cards.Duchy);
        decider1.gainCard(cards.Gold);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        decider1.gainCard(cards.Estate);
        done();
    });
});

describe('Smithy', () => {
    var smithyHand = [baseset.Smithy].concat(util.duplicate(cards.Copper, 4));
    it('should draw 3 cards', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Smithy, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, smithyHand, copperHand);
        game.start();

        decider1.playAction(baseset.Smithy);
        expect(game.activePlayer.hand).to.have.length(7);
        decider1.playTreasures([]);
        done();
    });
});

// Spy
// Thief
// ThroneRoom

describe('Village', () => {
    var villageHand = [baseset.Village, baseset.Village].concat(util.duplicate(cards.Copper, 3));
    it('should give +1 card, +2 actions', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Smithy, baseset.Village];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, villageHand, copperHand);
        game.start();

        decider1.playAction(baseset.Village);
        decider1.playAction(baseset.Village);
        expect(game.activePlayer.hand).to.have.length(5);
        expect(game.turnState.actionCount).to.eql(3);
        decider1.playTreasures([]);
        done();
    });
});

describe('Witch', () => {
    var witchHand = [baseset.Witch].concat(util.duplicate(cards.Copper, 4));
    it('should curse opponent and give +2 cards', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Smithy, baseset.Witch];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, witchHand, copperHand);
        game.start();

        decider1.playAction(baseset.Witch);
        expect(game.activePlayer.hand).to.have.length(6);
        expectDeckScore(game.players[1].getFullDeck(), 2);
        done();
    });
});

describe('Woodcutter', () => {
    it('should let player buy twice', (done) => {
        var woodcutterHand = [baseset.Woodcutter].concat(util.duplicate(cards.Copper, 4));
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Woodcutter];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, woodcutterHand, copperHand);
        game.start();

        decider1.playAction(baseset.Woodcutter);
        expect(game.turnState.buyCount).to.eql(2);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Estate);
        decider1.gainCard(cards.Copper);
        decider2.playTreasures([]);
        decider2.gainCard(cards.Copper);
        done();
    });
});

describe('Workshop', () => {
    it('should let player gain 0-4 cost card', (done) => {
        var workshopHand = [baseset.Workshop, baseset.Workshop].concat(util.duplicate(cards.Copper, 3));
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Workshop];

        var gainableKingdomCard = [baseset.Feast, baseset.Gardens, baseset.Moat, baseset.Workshop];

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, workshopHand, copperHand);
        game.start();

        _.times(10, () => {
            game.playerGainsCard(game.activePlayer, baseset.Moneylender);
        });

        decider1.playAction(baseset.Workshop);
        decider1.canGain([cards.Copper, cards.Curse, cards.Estate, cards.Silver].concat(gainableKingdomCard));
        decider1.gainCard(baseset.Workshop);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Copper);
        done();
    });
});
