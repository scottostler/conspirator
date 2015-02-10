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
import expectEqualCards = testsupport.expectEqualCards;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
import neutralCardsWith = testsupport.neutralCardsWith;

var copperHand = util.duplicate(cards.Copper, 5);
var copperEstateHand = util.duplicate(cards.Copper, 3).concat(util.duplicate(cards.Estate, 2));
var threeCopperHand = util.duplicate(cards.Copper, 3);

describe('Adventurer', () => {
    it('should draw two treasures', (done) => {
        var adventurerHand = [baseset.Adventurer, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Adventurer), decider1, decider2, adventurerHand);

        testsupport.setPlayerDeck(game, game.players[0], [cards.Copper, cards.Estate, cards.Copper]);

        game.start();
        decider1.playAction(baseset.Adventurer);
        expectRevealedCards(game, [cards.Copper]);
        expectRevealedCards(game, [cards.Estate]);
        expectRevealedCards(game, [cards.Copper]);
        decider1.playTreasures([cards.Copper, cards.Copper]);
        done();
    });
});

describe('Bureaucrat', () => {
    it('should gain silver, make opponent reveal and discard a victory card', (done) => {
        var bureaucratHand = [baseset.Bureaucrat, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(neutralCardsWith(baseset.Bureaucrat), decider1, decider2, bureaucratHand, copperEstateHand);
        game.start();

        decider1.playAction(baseset.Bureaucrat);
        decider2.discardCard(cards.Estate);
        expect(game.players[1].hand).to.have.length(4);
        expectRevealedCards(game, [cards.Estate]);
        expectTopDeckCard(game.players[1], cards.Estate);
        done();
    });

    it('should make opponent w/o victory cards reveal their hand', (done) => {
        var bureaucratHand = [baseset.Bureaucrat, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(neutralCardsWith(baseset.Bureaucrat), decider1, decider2, bureaucratHand, copperHand);
        game.start();

        decider1.playAction(baseset.Bureaucrat);
        expect(game.players[1].hand).to.have.length(5);
        expectRevealedCards(game, copperHand);
        done();
    });
});

describe('Cellar', () => {
    it('should allow discard for draw', (done) => {
        var cellarHand = [baseset.Cellar, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(neutralCardsWith(baseset.Cellar), decider1, decider2, cellarHand);
        game.start();

        decider1.playAction(baseset.Cellar);
        decider1.discardCards([cards.Estate, cards.Estate, cards.Estate, cards.Estate]);
        expect(game.players[0].hand).to.have.length(4);
        expectActionCount(game, 1);
        done();
    });
});

describe('Chapel', () => {
    it('should trash 0-4 cards', (done) => {
        var chapelHand = [baseset.Chapel, cards.Estate, cards.Estate, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(neutralCardsWith(baseset.Chapel), decider1, decider2, chapelHand);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Chancellor), decider1, decider2, chancellorHand);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.CouncilRoom), decider1, decider2, councilRoomHand);
        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expectBuyCount(game, 2);
        expect(game.activePlayer.hand).to.have.length(8);
        expect(game.players[1].hand).to.have.length(6);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Curse);
        decider1.gainCard(cards.Copper);
        done();
    });

    it('should handle opponent with empty deck', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.CouncilRoom), decider1, decider2, councilRoomHand, copperHand);
        testsupport.setPlayerDeck(game, game.players[1], []);

        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expectBuyCount(game, 2);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Feast), decider1, decider2, feastHand);
        game.start();

        decider1.playAction(baseset.Feast);
        decider1.gainCard(cards.Duchy);
        done();
    });
});

describe('Festival', () => {
    it('should give +2 actions, +1 buy, +2 coin', (done) => {
        var festivalHand = [baseset.Festival].concat(util.duplicate(cards.Copper, 4));
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Festival), decider1, decider2, festivalHand);
        game.start();

        decider1.playAction(baseset.Festival);
        expectActionCount(game, 2);
        expectBuyCount(game, 2);
        expectCoinCount(game, 2);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Laboratory), decider1, decider2, labHand);
        game.start();

        expect(game.activePlayer.hand).to.have.length(5);
        decider1.playAction(baseset.Laboratory);
        decider1.playAction(baseset.Laboratory);
        expectActionCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(7);
        done();
    });
});

describe('Library', () => {
    var libraryHand = [baseset.Library].concat(util.duplicate(cards.Copper, 4));

    it('should draw and let player set aside card', (done) => {
        var deck = [cards.Copper, cards.Estate, cards.Copper, baseset.Library, baseset.Library];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Library), decider1, decider2, libraryHand);

        testsupport.setPlayerDeck(game, game.players[0], deck);
        game.start();

        decider1.playAction(baseset.Library);
        decider1.setAsideCard(baseset.Library);
        decider1.setAsideCard(null);
        expect(game.activePlayer.hand).to.have.length(7);
        expectTopDiscardCard(game.activePlayer, baseset.Library);
        expectEqualCards(game.activePlayer.hand,
            [cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper,
             cards.Estate, baseset.Library]);
        done();
    });
});

describe('Market', () => {
    it('should give +1 action, +1 card, +1 coin, +1 buy', (done) => {
        var marketHand = [baseset.Market].concat(util.duplicate(cards.Copper, 4));
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Market), decider1, decider2, marketHand);
        game.start();

        var market = game.players[0].hand[0];

        expect(game.activePlayer.hand).to.have.length(5);
        decider1.playAction(baseset.Market);
        expect(game.isExactCardInPlay(market)).to.be.true;

        expectActionCount(game, 1);
        expectBuyCount(game, 2);
        expectCoinCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(5);
        done();
    });
});

describe('Militia', () => {
    var militiaHand = [baseset.Militia].concat(util.duplicate(cards.Copper, 4));
    it('should cause opponent w/ 5 cards to discard', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Militia), decider1, decider2, militiaHand);
        game.start();

        expect(game.players[1].hand).to.have.length(5);
        decider1.playAction(baseset.Militia);
        decider2.discardCards([cards.Copper, cards.Copper]);
        expect(game.players[1].hand).to.have.length(3);
        done();
    });

    it('should not cause opponent w/ 3 cards to discard', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Militia), decider1, decider2, militiaHand, threeCopperHand);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Mine), decider1, decider2, twoMineHand);
        game.start();
        game.incrementActionCount(1);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(cards.Copper);
        decider1.gainCard(cards.Silver);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(cards.Silver);
        decider1.gainCard(cards.Gold);
        decider1.playTreasures([cards.Gold, cards.Copper, cards.Copper]);
        decider1.gainCard(cards.Duchy);
        done();
    });
});

describe('Moat', () => {
    var moatHand = [baseset.Moat, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
    it('should give +2 cards', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Mine), decider1, decider2, moatHand);
        game.start();

        decider1.playAction(baseset.Moat);
        expect(game.activePlayer.hand).to.have.length(6);
        done();
    });
});

describe('Moneylender', () => {
    var moneylenderHand = [baseset.Moneylender].concat(util.duplicate(cards.Copper, 4));
    var moneylenderNoCopperHand = [baseset.Moneylender].concat(util.duplicate(cards.Estate, 4));    
    it('should let player trash Copper for +3 coin', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Moneylender), decider1, decider2, moneylenderHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        decider1.trashCard(cards.Copper);
        expectCoinCount(game, 3);
        done();
    });

    it('should do nothing if no Copper is trashed', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Moneylender), decider1, decider2, moneylenderNoCopperHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        expectCoinCount(game, 0);
        decider1.gainCard(cards.Copper);
        done();
    });
});

describe('Remodel', () => {
    var remodelHand = [baseset.Remodel].concat([cards.Duchy], util.duplicate(cards.Copper, 3));
    it('should replace card with card costing up to 2 more', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Remodel), decider1, decider2, remodelHand);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Smithy), decider1, decider2, smithyHand);
        game.start();

        decider1.playAction(baseset.Smithy);
        expect(game.activePlayer.hand).to.have.length(7);
        decider1.playTreasures([]);
        done();
    });
});

describe('Spy', () => {
    var spyHand = [baseset.Spy].concat(util.duplicate(cards.Copper, 4));
    it('should give +1 card, +1 action, and discard option', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Spy), decider1, decider2, spyHand);
        game.start();

        decider1.playAction(baseset.Spy);
        expectActionCount(game, 1);
        expect(game.activePlayer.hand).to.have.length(5);

        var player1TopCard = game.players[0].topCardOfDeck();
        var player2TopCard = game.players[1].topCardOfDeck();

        decider1.discardCard(player1TopCard);
        expectRevealedCards(game, [player1TopCard]);
        expectTopDiscardCard(game.activePlayer, player1TopCard);

        decider1.discardCard(null);
        expectRevealedCards(game, [player2TopCard]);
        expectTopDeckCard(game.players[1], player2TopCard);

        done();
    });
});

describe('Throne Room', () => {
    it('should play action twice', done => {
        var hand = [baseset.ThroneRoom, baseset.Festival, baseset.Market];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.ThroneRoom), decider1, decider2, hand);
        game.start();

        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(baseset.Festival);
        expectActionCount(game, 4);
        expectBuyCount(game, 3);
        expectCoinCount(game, 4);
        done();
    });
});

describe('Thief', () => {
    var thiefHand = [baseset.Thief].concat(util.duplicate(cards.Copper, 4));
    it("should reveal 2 cards from opponent's deck, trash and optionally gain one treasure", (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var decider3 = new testsupport.TestingDecider();
        var game = testsupport.setupThreePlayerGame(
            neutralCardsWith(baseset.Thief), decider1, decider2, decider3, thiefHand, copperHand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1], [cards.Estate, cards.Silver]);
        testsupport.setPlayerDeck(game, game.players[2], [cards.Copper, cards.Gold]);

        game.start();

        decider1.playAction(baseset.Thief);
        expectRevealedCards(game, [cards.Estate, cards.Silver]);
        expectRevealedCards(game, [cards.Copper, cards.Gold]);

        decider1.trashCard(cards.Gold);
        decider1.gainCard(cards.Gold);

        expectTopDiscardCard(game.players[1], cards.Estate);
        expectTopDiscardCard(game.players[2], cards.Copper);

        done();
    });
});

describe('Village', () => {
    var villageHand = [baseset.Village, baseset.Village].concat(util.duplicate(cards.Copper, 3));
    it('should give +1 card, +2 actions', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Village), decider1, decider2, villageHand);
        game.start();

        decider1.playAction(baseset.Village);
        decider1.playAction(baseset.Village);
        expect(game.activePlayer.hand).to.have.length(5);
        expectActionCount(game, 3);
        decider1.playTreasures([]);
        done();
    });
});

describe('Witch', () => {
    var witchHand = [baseset.Witch].concat(util.duplicate(cards.Copper, 4));
    it('should curse opponent and give +2 cards', (done) => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Witch), decider1, decider2, witchHand);
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
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(
            neutralCardsWith(baseset.Woodcutter), decider1, decider2, woodcutterHand);
        game.start();

        decider1.playAction(baseset.Woodcutter);
        expectBuyCount(game, 2);
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
        var kingdomCards = neutralCardsWith(baseset.Workshop);
        var gainableKingdomCard = cards.filterByCost(kingdomCards, 0, 4);

        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(kingdomCards, decider1, decider2, workshopHand, copperHand);
        game.start();

        decider1.playAction(baseset.Workshop);
        decider1.canGain([cards.Copper, cards.Curse, cards.Estate, cards.Silver].concat(gainableKingdomCard));
        decider1.gainCard(baseset.Workshop);
        decider1.playTreasures([]);
        decider1.gainCard(cards.Copper);
        done();
    });
});
