import { expectPlayerHandSize } from './testsupport';
import * as _  from 'underscore';
import { assert, expect } from 'chai';

import * as baseset from '../src/sets/baseset';
import { Copper, Estate, Silver, Duchy, Gold, Curse } from '../src/sets/common';
import * as cards from '../src/cards';
import * as testsupport from './testsupport';
import * as util from '../src/utils';

import expectNonNull = testsupport.expectNonNull;
import expectDeckScore = testsupport.expectDeckScore;
import expectEqualCards = testsupport.expectEqualCards;
import expectCardContents = testsupport.expectCardContents;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import expectTopTrashCard = testsupport.expectTopTrashCard;
import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;

import duplicateCard = testsupport.duplicateCard;
import copperHand = testsupport.copperHand;
import copperEstateHand = testsupport.copperEstateHand;
import threeCopperHand = testsupport.threeCopperHand;

describe('Bureaucrat', function() {
    it('should gain silver, make opponent reveal and discard a victory card', function() {
        const bureaucratHand = [baseset.Bureaucrat, Estate, Estate, Estate, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(bureaucratHand, copperEstateHand);
        game.start();
        
        decider1.playAction(baseset.Bureaucrat);
        decider2.discardCard(Estate);
        
        expectPlayerHandSize(game.players[1], 4);
        expectRevealedCards(game, [Estate]);
        expectTopDeckCard(game.players[1], Estate);
    });

    it('should make opponent w/o victory cards reveal their hand', function() {
        const bureaucratHand = [baseset.Bureaucrat, Estate, Estate, Estate, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(bureaucratHand, copperHand);
        game.start();

        decider1.playAction(baseset.Bureaucrat);
        expectPlayerHandSize(game.players[1], 5);
        expectRevealedCards(game, copperHand);
    });
});

describe('Cellar', function() {
    it('should allow discard for draw', function() {
        const cellarHand = [baseset.Cellar, Estate, Estate, Estate, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(cellarHand);
        game.start();

        decider1.playAction(baseset.Cellar);
        decider1.discardCards([Estate, Estate, Estate, Estate]);
        expectPlayerHandSize(game.players[0], 4);
        expectActionCount(game, 1);
    });
});

describe('Chapel', function() {
    it('should trash 0-4 cards', function() {
        const chapelHand = [baseset.Chapel, Estate, Estate, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(chapelHand);
        
        game.start();
        expectPlayerHandSize(game.players[0], 6);
        decider1.playAction(baseset.Chapel);
        decider1.hasSelectionCounts(0, 4);
        decider1.trashCards([Copper, Estate, Estate]);
        expectPlayerHandSize(game.players[0], 2);
    });
});

describe('Chancellor', function() {
    const chancellorHand = [baseset.Chancellor].concat(duplicateCard(Copper, 4));
    it('should let player discard deck', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(chancellorHand);
        game.start();
        
        expect(game.activePlayer.deck.cards).to.have.length(10);
        expect(game.activePlayer.discard.cards).to.have.length(0);
        decider1.playAction(baseset.Chancellor);
        decider1.discardDeck(true);
        expect(game.activePlayer.deck.cards).to.have.length(0);
        expect(game.activePlayer.discard.cards).to.have.length(10);
    });
});

describe('Council Room', function() {
    var councilRoomHand = [baseset.CouncilRoom].concat(duplicateCard(Copper, 4));
    it('should give +4 cards, +1 buy, and draw opponent a card', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(councilRoomHand);
        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expectBuyCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 8);
        expectPlayerHandSize(game.players[1], 6);
        decider1.playTreasures([]);
        decider1.buyCard(Curse);
        decider1.buyCard(Copper);
    });

    it('should handle opponent with empty deck', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(councilRoomHand, copperHand);
        
        game.setPlayerDeck(game.players[1], []);
        game.start();

        decider1.playAction(baseset.CouncilRoom);
        expectBuyCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 8);
        expectPlayerHandSize(game.players[1], 5);
        decider1.playTreasures([]);
        decider1.buyCard(Curse);
        decider1.buyCard(Copper);
    });
});

describe('Feast', function() {
    it('should gain card costing 0-5', function() {
        const feastHand = [baseset.Feast].concat(duplicateCard(Copper, 4));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(feastHand);
        game.start();

        decider1.playAction(baseset.Feast);
        decider1.gainCard(Duchy);
    });

    it('should gain twice when played with Throne Room', function() {
        const hand = [baseset.Feast, baseset.ThroneRoom, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(baseset.Feast);

        decider1.gainCard(Duchy);
        decider1.gainCard(Silver);
    });
});

describe('Festival', function() {
    it('should give +2 actions, +1 buy, +2 coin', function() {
        const festivalHand = [baseset.Festival].concat(duplicateCard(Copper, 4));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(festivalHand);
        game.start();

        decider1.playAction(baseset.Festival);
        expectActionCount(game, 2);
        expectBuyCount(game, 2);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 4);
    });
});

describe('Gardens', function() {
    it('should give 1 VP per 10 cards', function() {
        expectDeckScore([baseset.Gardens], 0);
        expectDeckScore([baseset.Gardens].concat(duplicateCard(Copper, 9)), 1);
        expectDeckScore([baseset.Gardens, baseset.Gardens].concat(duplicateCard(Copper, 9)), 2);
        expectDeckScore([baseset.Gardens, baseset.Gardens].concat(duplicateCard(Copper, 18)), 4);
    });
});

describe('Laboratory', function() {
    it('should give +2 cards, +1 action', function() {
        const labHand = [baseset.Laboratory, baseset.Laboratory].concat(duplicateCard(Copper, 3));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(labHand);
        game.start();

        expectPlayerHandSize(game.activePlayer, 5);
        decider1.playAction(baseset.Laboratory);
        decider1.playAction(baseset.Laboratory);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 7);
    });
});

describe('Library', function() {
    const libraryHand = [baseset.Library].concat(duplicateCard(Copper, 4));

    it('should draw and let player set aside card', function() {
        const deck = [Copper, Estate, Copper, baseset.Feast, baseset.Library];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(libraryHand);

        game.setPlayerDeck(game.players[0], deck);
        game.start();

        decider1.playAction(baseset.Library);
        decider1.setAsideCard(false, baseset.Library);
        decider1.setAsideCard(true, baseset.Feast);
        
        expectTopDiscardCard(game.activePlayer, baseset.Feast);
        expectPlayerHandSize(game.activePlayer, 7);
        assert.sameMembers(
            game.activePlayer.hand.cards.map(c => c.name),
            [Copper, Copper, Copper, Copper, Copper, Estate, baseset.Library].map(c => c.name));
    });
});

describe('Market', function() {
    it('should give +1 action, +1 card, +1 coin, +1 buy', function() {
        const marketHand = [baseset.Market].concat(duplicateCard(Copper, 4));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(marketHand);
        game.start();

        expectPlayerHandSize(game.activePlayer, 5);
        decider1.playAction(baseset.Market);

        expectActionCount(game, 1);
        expectBuyCount(game, 2);
        expectCoinCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);
    });
});

describe('Militia', function() {
    const militiaHand = [baseset.Militia, baseset.Militia].concat(duplicateCard(Copper, 3));

    it('should cause opponent w/ 5 cards to discard', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand);
        game.start();

        expectPlayerHandSize(game.players[1], 5);
        decider1.playAction(baseset.Militia);
        decider2.discardCards([Copper, Copper]);
        expectPlayerHandSize(game.players[1], 3);
    });

    it('should not cause opponent w/ 3 cards to discard', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand, threeCopperHand);
        game.start();

        expectPlayerHandSize(game.players[1], 3);
        decider1.playAction(baseset.Militia);
        expectPlayerHandSize(game.players[1], 3);
        decider1.playTreasures([]);
        decider1.buyCard(Copper);
    });

    it('should be prevented by Moat', function() {
        const moatHand = [baseset.Moat, Copper, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand, moatHand);
        game.start();

        game.incrementActionCount(1);

        decider1.playAction(baseset.Militia);
        decider2.revealCard(baseset.Moat);
        decider2.revealCard(baseset.Moat);
        decider2.revealCard(baseset.Moat); // lol
        decider2.revealCard(null);
        expectPlayerHandSize(game.players[1], 5);

        decider1.playAction(baseset.Militia);
        decider2.revealCard(null);
        decider2.discardCards([Copper, Copper]);
        expectPlayerHandSize(game.players[1], 3);

        decider1.playTreasures([Copper]);
    });
});

describe('Mine', function() {
    const twoMineHand = [baseset.Mine, baseset.Mine].concat(duplicateCard(Copper, 3));
    it('should let player upgrade treasure', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(twoMineHand);
        game.start();
        game.incrementActionCount(1);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(Copper);
        decider1.gainCard(Silver);
        decider1.playAction(baseset.Mine);
        decider1.trashCard(Silver);
        decider1.gainCard(Gold);
        decider1.playTreasures([Gold, Copper, Copper]);
        decider1.buyCard(Duchy);
    });
});

describe('Moat', function() {
    const moatHand = [baseset.Moat, Copper, Copper, Copper, Copper];
    it('should give +2 cards', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(moatHand);
        game.start();

        decider1.playAction(baseset.Moat);
        expectPlayerHandSize(game.activePlayer, 6);
    });
});

describe('Moneylender', function() {
    const moneylenderHand = [baseset.Moneylender, Copper, Copper, Copper, Copper];
    const moneylenderNoCopperHand = [baseset.Moneylender, Estate, Estate, Estate, Estate];
    it('should let player trash Copper for +3 coin', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(moneylenderHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        decider1.trashCard(Copper);

        expectTopTrashCard(game, Copper);
        expectCardContents(game.activePlayer.hand, [Copper, Copper, Copper]);

        expectCoinCount(game, 3);
    });

    it('should do nothing if no Copper is trashed', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(moneylenderNoCopperHand);
        game.start();

        decider1.playAction(baseset.Moneylender);
        expectCoinCount(game, 0);
        decider1.buyCard(Copper);
    });
});

describe('Remodel', function() {
    const remodelHand = [baseset.Remodel, Duchy, Copper, Copper, Copper];
    it('should replace card with card costing up to 2 more', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(remodelHand);
        game.start();

        decider1.playAction(baseset.Remodel);
        decider1.trashCard(Duchy);
        expectCardContents(game.activePlayer.hand, [Copper, Copper, Copper]);

        decider1.gainCard(Gold);
        decider1.playTreasures([Copper, Copper]);
    });
});

describe('Smithy', function() {
    const smithyHand = [baseset.Smithy].concat(duplicateCard(Copper, 4));
    it('should draw 3 cards', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(smithyHand);
        game.start();

        decider1.playAction(baseset.Smithy);
        expectPlayerHandSize(game.activePlayer, 7);
        decider1.playTreasures([]);
    });
});

describe('Spy', function() {
    const spyHand = [baseset.Spy].concat(duplicateCard(Copper, 4));
    it('should give +1 card, +1 action, and discard option', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(spyHand);
        game.start();

        decider1.playAction(baseset.Spy);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);

        const player1TopCard = expectNonNull(game.players[0].deck.topCard);
        decider1.discardCard(player1TopCard);
        expectRevealedCards(game, [player1TopCard]);
        expectTopDiscardCard(game.activePlayer, player1TopCard);

        const player2TopCard = expectNonNull(game.players[1].deck.topCard);
        decider1.discardCard(null);
        expectRevealedCards(game, [player2TopCard]);
        expectTopDeckCard(game.players[1], player2TopCard);
    });
});

describe('Throne Room', function() {
    it('should play action twice', function() {
        const hand = [baseset.ThroneRoom, baseset.Festival, baseset.Market];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);
        game.start();

        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(baseset.Festival);
        expectActionCount(game, 4);
        expectBuyCount(game, 3);
        expectCoinCount(game, 4);
    });

    it('should play itself twice', function() {
        const hand = [
            baseset.ThroneRoom, baseset.ThroneRoom,
            baseset.Moneylender, baseset.Woodcutter, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);
        game.start();

        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(baseset.Moneylender);
        decider1.trashCard(Copper);
        expectCoinCount(game, 3);
        decider1.trashCard(Copper);
        expectCoinCount(game, 6);
        decider1.playAction(baseset.Woodcutter);

        expectBuyCount(game, 3);
        expectCoinCount(game, 10);
    });
});

describe('Village', function() {
    const villageHand = [baseset.Village, baseset.Village].concat(duplicateCard(Copper, 3));
    it('should give +1 card, +2 actions', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(villageHand);        
        game.start();

        decider1.playAction(baseset.Village);
        decider1.playAction(baseset.Village);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 3);
        decider1.playTreasures([]);
    });
});

describe('Witch', function() {
    const witchHand = [baseset.Witch].concat(duplicateCard(Copper, 4));
    it('should curse opponent and give +2 cards', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(witchHand);
        game.start();

        decider1.playAction(baseset.Witch);
        expectPlayerHandSize(game.activePlayer, 6);
        expectDeckScore(game.players[1].getFullDeck(), 2);
    });
});

describe('Woodcutter', function() {
    it('should let player buy twice', function() {
        const woodcutterHand = [baseset.Woodcutter].concat(duplicateCard(Copper, 4));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(woodcutterHand);
        game.start();

        decider1.playAction(baseset.Woodcutter);
        decider1.playTreasures([]);
        expectBuyCount(game, 2);
        decider1.buyCard(Estate);
        expectBuyCount(game, 1);
        decider1.buyCard(Copper);

        decider2.playTreasures([]);
        decider2.buyCard(Copper);
    });
});

describe('Workshop', function() {
    it('should let player gain 0-4 cost card', function() {
        const workshopHand = [baseset.Workshop, baseset.Workshop].concat(duplicateCard(Copper, 3));
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(workshopHand, copperHand);
        game.start();

        const gainableCards = game.filterGainablePiles(0, 4).map(p => p.card);

        decider1.playAction(baseset.Workshop);
        decider1.canGain(gainableCards);
        decider1.gainCard(Silver);
        decider1.playTreasures([]);
        decider1.buyCard(Copper);
    });
});
