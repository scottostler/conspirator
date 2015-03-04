/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import baseset = require('../src/sets/baseset');
import cards = require('../src/cards');
import effects = require('../src/effects');
import intrigue = require('../src/sets/intrigue');
import testsupport = require('./testsupport');
import util = require('../src/util');

import expect = chai.expect;
import expectDeckScore = testsupport.expectDeckScore;
import expectEqualCards = testsupport.expectEqualCards;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import expectTopTrashCard = testsupport.expectTopTrashCard;
import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

import copperHand = testsupport.copperHand;
import copperEstateHand = testsupport.copperEstateHand;
import threeCopperHand = testsupport.threeCopperHand;

describe('Baron', () => {
    it('should allow discarding an Estate for +4 coin', (done) => {
        var baronHand = [intrigue.Baron, cards.Estate, cards.Estate, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, baronHand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, baronHand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, conspiratorHand);

        game.start();
        game.incrementActionCount(2);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 2);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 4);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 1);
        expectCoinCount(game, 4);
        expectPlayerHandSize(game.activePlayer, 3);

        decider1.playAction(intrigue.Conspirator);
        expectActionCount(game, 1);
        expectCoinCount(game, 6);
        expectPlayerHandSize(game.activePlayer, 3);

        done();
    });
});

describe('Coppersmith', () => {
    it('should increase Copper value by 1', (done) => {
        var hand = [intrigue.Coppersmith, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, courtyardHand);

        testsupport.setPlayerDeck(game, game.players[0], [cards.Estate, cards.Estate, cards.Estate]);

        game.start();
        decider1.playAction(intrigue.Courtyard);
        expectPlayerHandSize(game.activePlayer, 7);
        decider1.discardCard(cards.Copper);
        expectTopDeckCard(game.players[0], cards.Copper);
        expectPlayerHandSize(game.activePlayer, 6);
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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();
        decider1.playAction(intrigue.GreatHall);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);
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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, haremHand);

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
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, ironworksHand, copperHand, [intrigue.GreatHall]);

        game.start();
        decider1.playAction(intrigue.Ironworks);
        decider1.gainCard(intrigue.GreatHall);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);

        decider1.playAction(intrigue.Ironworks)
        decider1.gainCard(cards.Silver);
        expectActionCount(game, 0);
        expectCoinCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 4);

        done();
    });
});

describe('Masquerade', () => {
    it('should draw two cards, let all players pass one left, then let player trash one', done => {
        var masqueradeHand = [intrigue.Masquerade, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var decider3 = new testsupport.TestingDecider();
        var game = testsupport.setupThreePlayerGame(decider1, decider2, decider3, masqueradeHand, [], copperEstateHand);

        testsupport.setPlayerDeck(game, game.players[0],
            [cards.Silver, cards.Gold]);

        game.start();

        decider1.playAction(intrigue.Masquerade);
        expectPlayerHandSize(game.activePlayer, 6);

        decider1.passCard(cards.Estate);
        decider3.passCard(cards.Copper);

        decider1.trashCard(cards.Copper);
        expectPlayerHandSize(game.activePlayer, 5);

        expectEqualCards(game.players[0].hand,
            [cards.Copper, cards.Copper, cards.Silver, cards.Gold, cards.Estate]);

        expectEqualCards(game.players[1].hand,
            [cards.Estate]);

        expectEqualCards(game.players[2].hand,
            [cards.Copper, cards.Copper, cards.Estate, cards.Estate]);

        decider1.playTreasures([]);
        decider1.gainCard(null);

        // P2 has no treasures to play
        decider2.gainCard(null);

        done();
    });
});

describe('Mining Village', () => {
    it('should give +1, +2 actions and offer trash for +2 coin', done => {
        var hand = [intrigue.MiningVillage, intrigue.MiningVillage, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.MiningVillage);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 2);

        decider1.trashCard(intrigue.MiningVillage);
        expectCoinCount(game, 2);

        decider1.playAction(intrigue.MiningVillage);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 3);

        decider1.trashCard(null);
        expectCoinCount(game, 2);

        done();
    });

    it('should only be trashed once with Throne Room', done => {
        var hand = [baseset.ThroneRoom, intrigue.MiningVillage, intrigue.MiningVillage, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.MiningVillage);
        decider1.trashCard(null);

        decider1.playAction(baseset.ThroneRoom);
        decider1.trashCard(intrigue.MiningVillage);

        expectActionCount(game, 5);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 5);
        decider1.playTreasures([]);
        done();
    });
});

describe('Minion', () => {
    var hand = [intrigue.Minion, intrigue.Minion, cards.Copper, cards.Copper, cards.Estate];
    it('should give +1 action, and +2 coin or discard attack', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        testsupport.setPlayerDeck(game, game.players[0], [intrigue.Minion, intrigue.Minion, cards.Estate, cards.Estate]);

        game.start();

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(effects.GainTwoCoins);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.players[1], 5);

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(intrigue.MinionDiscard);

        expectActionCount(game, 1);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 4);
        expectPlayerHandSize(game.players[1], 4);

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(effects.GainTwoCoins);
        expectCoinCount(game, 4);

        var p2Hand = _.clone(game.players[1].hand);
        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(intrigue.MinionDiscard);
        expectEqualCards(game.players[1].hand, p2Hand);

        done();
    });
});

describe('Nobles', () => {
    it('should be worth 2 VP', done => {
        expectDeckScore([intrigue.Nobles], 2);
        expectDeckScore([intrigue.Nobles, intrigue.Nobles, intrigue.Nobles], 6);
        done();
    });

    it('should offer +2 actions or +3 cards', done => {
        var hand = [intrigue.Nobles, intrigue.Nobles, cards.Copper, cards.Copper, cards.Estate];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.Nobles);
        decider1.chooseEffect(effects.GainTwoActions);

        expectActionCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 4);

        decider1.playAction(intrigue.Nobles);
        decider1.chooseEffect(effects.DrawThreeCards);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 6);

        done();
    });
});

describe('Pawn', () => {
    var hand = [intrigue.Pawn, intrigue.Pawn, intrigue.Pawn, intrigue.Pawn, cards.Copper];

    it('should offer four choices', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([effects.GainOneAction, effects.GainOneCoin]);

        expectActionCount(game, 1);
        expectCoinCount(game, 1);


        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([effects.GainOneAction, effects.GainOneBuy]);

        expectActionCount(game, 1);
        expectBuyCount(game, 2);

        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([effects.GainOneAction, effects.DrawOneCard]);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 3);

        done();
    });

    it('should not allow invalid choice', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.Pawn);

        expect(() => {
            decider1.chooseEffects([effects.GainOneAction, effects.GainTwoCoins]);
            }).to.throw(Error);

        done();
    });

    it('should require two choices', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.Pawn);

        expect(() => {
            decider1.chooseEffects([]);
            }).to.throw(Error);

        done();
    });
});

describe('Saboteur', () => {
    var hand = [intrigue.Saboteur, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
    it('should trash 3+ cost card from opponent and offer replacement', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [cards.Duchy, cards.Estate, cards.Estate, cards.Copper]);

        game.start();
        decider1.playAction(intrigue.Saboteur);
        decider2.gainCard(cards.Silver);

        expectTopTrashCard(game, cards.Duchy);
        expectEqualCards(
            [cards.Estate, cards.Estate, cards.Copper, cards.Silver],
            game.players[1].discard);

        done();
    });

    it('should do nothing to 0-2 cost cards', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        var p2Deck = _.clone(game.players[1].deck);
        decider1.playAction(intrigue.Saboteur);
        expectEqualCards(p2Deck, game.players[1].discard);
        done();
    });
});

describe('Scout', () => {
    var hand = [intrigue.Scout, cards.Copper, cards.Copper];
    it('should draw up to four victory cards and re-order rest', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[0],
            [intrigue.Harem, intrigue.Nobles, cards.Silver, cards.Copper]);

        game.start();
        decider1.playAction(intrigue.Scout);
        decider1.orderCards([cards.Silver, cards.Copper]);

        expectActionCount(game, 1);
        expectEqualCards(game.activePlayer.hand,
            [intrigue.Harem, intrigue.Nobles, cards.Copper, cards.Copper]);

        done();
    });
});

describe('Secret Chamber', () => {
    var militiaHand = [baseset.Militia, cards.Copper, cards.Copper, cards.Estate, cards.Estate];
    var secretChamberHand = [intrigue.SecretChamber, cards.Copper, cards.Copper, cards.Estate, cards.Estate];

    it('should discard cards for 1 coin each', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, secretChamberHand);

        game.start();
        decider1.playAction(intrigue.SecretChamber);
        decider1.discardCards([cards.Copper, cards.Estate, cards.Estate]);
        expectCoinCount(game, 3);
        done();
    });

    it('should draw then discard two cards when revealed as reaction', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, militiaHand, secretChamberHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [cards.Silver, cards.Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);
        decider2.discardCards([cards.Copper, cards.Copper]);

        decider2.revealCard(intrigue.SecretChamber);
        decider2.discardCards([cards.Copper, cards.Copper]);

        decider2.revealCard(null);
        decider2.discardCards([cards.Estate, cards.Estate]);
        expectPlayerHandSize(game.players[1], 3);
        expectEqualCards(game.players[1].hand,
            [intrigue.SecretChamber, cards.Silver, cards.Gold]);

        done();
    });

    it('should allow itself to be discarded as reaction', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, militiaHand, secretChamberHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [cards.Silver, cards.Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);
        decider2.discardCards([intrigue.SecretChamber, cards.Copper]);
        decider2.discardCards([cards.Estate, cards.Estate]);
        expectPlayerHandSize(game.players[1], 3);
        expectEqualCards(game.players[1].hand,
            [cards.Copper, cards.Silver, cards.Gold]);

        done();
    });

    it('should allow drawing for Moat as reaction', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, militiaHand, secretChamberHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [baseset.Moat, cards.Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);

        decider2.discardCards([intrigue.SecretChamber, cards.Copper]);
        decider2.revealCard(baseset.Moat);
        decider2.revealCard(null);
        decider1.playTreasures([cards.Copper, cards.Copper]);

        expectPlayerHandSize(game.players[1], 5);
        expectEqualCards(game.players[1].hand,
            [baseset.Moat, cards.Gold, cards.Copper, cards.Estate, cards.Estate]);

        done();
    });
});

describe('Shanty Town', () => {
    it('should give +2 actions, reveal hand to possibly draw', done => {
        var hand = [intrigue.ShantyTown, intrigue.ShantyTown, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.ShantyTown);
        expectPlayerHandSize(game.activePlayer, 4);
        expectActionCount(game, 2);
        expectRevealedCards(game, [intrigue.ShantyTown, cards.Copper, cards.Copper, cards.Copper]);

        decider1.playAction(intrigue.ShantyTown);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 3);
        expectRevealedCards(game, [cards.Copper, cards.Copper, cards.Copper]);

        done();
    });
});

describe('Steward', () => {
    var hand = [intrigue.Steward, intrigue.Steward, intrigue.Steward, cards.Copper, cards.Copper];
    it('should give choice of +2 cards, +2 coins, or trash two cards', done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();
        game.incrementActionCount(2);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(effects.DrawTwoCards);
        expectPlayerHandSize(game.activePlayer, 6);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(effects.GainTwoCoins);
        expectCoinCount(game, 2);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(effects.TrashTwoCards);
        decider1.trashCards([cards.Copper, cards.Copper]);

        done();
    });
});

describe('Swindler', () => {
    var hand = [intrigue.Swindler, cards.Copper, cards.Copper, cards.Copper, cards.Copper];

    it("should trash top card of opponent's deck and replace with one of same cost", done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [cards.Copper]);

        game.start();

        decider1.playAction(intrigue.Swindler);
        decider1.gainCard(cards.Curse);
        expectTopDiscardCard(game.players[1], cards.Curse);
        expectTopTrashCard(game, cards.Copper);
        expectCoinCount(game, 2);
        done();
    });

    it("should do nothing if opponent's deck is empty", done => {
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1], []);

        game.start();
        decider1.playAction(intrigue.Swindler);
        expectCoinCount(game, 2);
        decider1.playTreasures([cards.Copper])
        done();
    });

    it("should decrease value of replacement card if Bridge is in play", done => {
        var bridgeSwindlerHand = [intrigue.Bridge, intrigue.Bridge, intrigue.Swindler, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, bridgeSwindlerHand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1],
            [cards.Estate]);

        game.start();
        game.incrementActionCount(2);
        decider1.playAction(intrigue.Bridge);
        decider1.playAction(intrigue.Bridge);
        decider1.playAction(intrigue.Swindler);
        decider1.gainCard(cards.Curse);
        done();
    })

});

describe('Torturer', () => {
    it('should draw 3 cards and give choice of discard or gaining curse', done => {
        var hand = [intrigue.Torturer, intrigue.Torturer, intrigue.Torturer, intrigue.Torturer, intrigue.Torturer];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        game.start();
        game.incrementActionCount(4);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.GainCurseIntoHand);
        expectPlayerHandSize(game.activePlayer, 7);
        expectPlayerHandSize(game.players[1], 6);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        decider2.discardCards([cards.Curse, cards.Copper]);
        expectPlayerHandSize(game.players[1], 4);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        decider2.discardCards([cards.Copper, cards.Copper]);
        expectPlayerHandSize(game.players[1], 2);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        expectPlayerHandSize(game.players[1], 0);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        expectPlayerHandSize(game.players[1], 0);

        decider1.playTreasures([cards.Copper]);

        done();
    });
});

describe('Trading Post', () => {
    it('should trash 2 cards to gain Silver in hand', done => {
        var hand = [intrigue.TradingPost, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.TradingPost);
        decider1.trashCards([cards.Copper, cards.Copper]);
        decider1.playTreasures([cards.Copper, cards.Copper, cards.Silver]);
        done();
    });

    it('should only gain Silver if 2 cards are trashed', done => {
        var hand = [intrigue.TradingPost, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.TradingPost);
        expectPlayerHandSize(game.activePlayer, 0);
        done();
    });
});

describe('Tribute', () => {
    it("should discard opponent's top cards and give appropriate benefit", done => {
        var hand = [intrigue.Tribute, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1], [intrigue.Nobles, cards.Copper]);

        game.start();

        decider1.playAction(intrigue.Tribute);
        expectPlayerHandSize(game.activePlayer, 6);
        expectActionCount(game, 2);
        expectCoinCount(game, 2);
        done();
    });

    it("should only give benefit for distinct cards revealed", done => {
        var hand = [intrigue.Tribute, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand, copperHand);

        testsupport.setPlayerDeck(game, game.players[1], [cards.Copper, cards.Copper]);
        game.start();

        decider1.playAction(intrigue.Tribute);
        expectCoinCount(game, 2);
        done();
    });
});

describe('Upgrade', () => {
    it('should give +1 card, +1 action, and trash card to gain one costing +1', done => {
        var hand = [intrigue.Upgrade, intrigue.Upgrade, cards.Estate, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        game.start();

        decider1.playAction(intrigue.Upgrade);
        decider1.trashCard(cards.Estate);
        decider1.gainCard(cards.Silver);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 4);

        decider1.playAction(intrigue.Upgrade);
        decider1.trashCard(cards.Copper);

        decider1.playTreasures([cards.Copper]);
        done();
    });
});

describe('Wishing Well', () => {
    it('should give +1 card, +1 action, and allow wishing for a card to draw', done => {
        var hand = [intrigue.WishingWell, intrigue.WishingWell, cards.Estate, cards.Copper, cards.Copper];
        var decider1 = new testsupport.TestingDecider();
        var decider2 = new testsupport.TestingDecider();
        var game = testsupport.setupTwoPlayerGame(decider1, decider2, hand);

        testsupport.setPlayerDeck(game, game.players[0], [cards.Estate, cards.Estate, cards.Estate]);

        game.start();

        decider1.playAction(intrigue.WishingWell);
        decider1.nameCard(cards.Copper);

        expectPlayerHandSize(game.activePlayer, 5);

        decider1.playAction(intrigue.WishingWell);
        decider1.nameCard(cards.Estate);

        expectEqualCards(game.activePlayer.hand,
            [cards.Estate, cards.Estate, cards.Estate, cards.Estate, cards.Copper, cards.Copper]);

        done();
    });
});
