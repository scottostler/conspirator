import { MiningVillage } from '../src/sets/intrigue';
import { expectCardContents, expectCardsContain, expectCardsNotContain } from './testsupport';
import { assert, expect } from 'chai';

import { Card, asNames } from '../src/cards';
import { DecisionValidationError } from '../src/decisions';
import * as effects from '../src/effects';
import * as baseset from '../src/sets/baseset';
import * as intrigue from '../src/sets/intrigue';
import * as testsupport from './testsupport';
import * as utils from '../src/utils';
import {
    Copper,
    Curse,
    DrawOneCard,
    DrawThreeCards,
    DrawTwoCards,
    Duchy,
    EffectChoice,
    Estate,
    GainOneAction,
    GainOneBuy,
    GainOneCoin,
    GainTwoActions,
    GainTwoCoins,
    Gold,
    Silver,
    TrashTwoCards
} from '../src/sets/common';

import expectDeckScore = testsupport.expectDeckScore;
import expectEqualCards = testsupport.expectEqualCards;
import expectRevealedCards = testsupport.expectRevealedCards;
import expectTopDeckCard = testsupport.expectTopDeckCard;
import expectDiscardCards = testsupport.expectDiscardCards;
import expectTopDiscardCard = testsupport.expectTopDiscardCard;
import expectTopTrashCard = testsupport.expectTopTrashCard;
import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

import copperHand = testsupport.copperHand;
import copperEstateHand = testsupport.copperEstateHand;
import threeCopperHand = testsupport.threeCopperHand;

describe('Baron', function() {
    const baronHand = [intrigue.Baron, Estate, Estate, Estate, Estate];

    it('should allow discarding an Estate for +4 coin', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(baronHand);
        game.start();
        decider1.playAction(intrigue.Baron);
        decider1.discardCard(Estate);
        expectBuyCount(game, 2);
        expectCoinCount(game, 4);
    });

    it('should otherwise gain an Estate', function() {
        const baronHand = [intrigue.Baron, Estate, Estate, Estate, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(baronHand);

        game.start();
        decider1.playAction(intrigue.Baron);
        decider1.discardCard(null);
        expectBuyCount(game, 2);
        expectCoinCount(game, 0);
        expectTopDiscardCard(game.activePlayer, Estate);
    });
});

describe('Bridge', function() {
    it('should give +1 buy and decrease card cost by 1', function() {
        const hand = [intrigue.Bridge, Copper, Copper, Copper, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();
        decider1.playAction(intrigue.Bridge);
        expectBuyCount(game, 2);
        expectCoinCount(game, 1);
        decider1.playTreasures([Copper, Copper, Copper]);
        decider1.buyCard(Duchy);
    });

    it('should stack with multiple plays', function() {
        const hand = [baseset.ThroneRoom, intrigue.Bridge, Copper, Copper, Copper, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();
        game.incrementActionCount(1);
        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(intrigue.Bridge);

        expectBuyCount(game, 3);
        expectCoinCount(game, 2);
        decider1.playTreasures([Copper, Copper, Copper]);
        decider1.buyCard(Gold);        
    });
});

describe('Conspirator', function() {
    const conspiratorHand = [intrigue.Conspirator, intrigue.Conspirator, intrigue.Conspirator, Estate, Estate];
    it('should give +2 coin, and +1 card, +1 action if 3+ actions were played', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(conspiratorHand);

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
    });
});

describe('Courtyard', function() {
    const courtyardHand = [intrigue.Courtyard, Copper, Copper, Estate, Estate];
    it('should draw 3 cards, discard 1 to deck', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(courtyardHand);

        game.setPlayerDeck(game.players[0], [Estate, Estate, Estate]);

        game.start();
        decider1.playAction(intrigue.Courtyard);
        expectPlayerHandSize(game.activePlayer, 7);
        decider1.discardCard(Copper);
        expectTopDeckCard(game.players[0], Copper);
        expectPlayerHandSize(game.activePlayer, 6);
    });
});

describe('Duke', function() {
    it('should give 1 VP per Duchy', function() {
        expectDeckScore([intrigue.Duke], 0);
        expectDeckScore([intrigue.Duke, Duchy], 4);
        expectDeckScore([intrigue.Duke, intrigue.Duke, Duchy, Duchy], 10);
    });
});

describe('Great Hall', function() {
    it('should give 1 VP', function() {
        expectDeckScore([intrigue.GreatHall], 1);
        expectDeckScore([intrigue.GreatHall, intrigue.GreatHall], 2);
    });

    it('should give +1 action, +1 card', function() {
        const hand = [intrigue.GreatHall, Copper, Copper, Copper, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();
        decider1.playAction(intrigue.GreatHall);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);
    });
});

describe('Harem', function() {
    it('should give 2 VP', function() {
        expectDeckScore([intrigue.Harem], 2);
        expectDeckScore([intrigue.Harem, intrigue.Harem], 4);
    });

    const haremHand = [intrigue.Harem, Copper, Copper, Copper, Estate];
    it('should give +2 coin', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(haremHand);

        game.start();
        decider1.playTreasures([intrigue.Harem, Copper, Copper, Copper]);
        expectCoinCount(game, 5);
    });
});

describe('Ironworks', function() {
    it('should gain 0-4 cost card and give benefit', function() {
        const ironworksHand = [intrigue.Ironworks, intrigue.Ironworks, intrigue.Ironworks, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(ironworksHand, copperHand, [intrigue.GreatHall]);
        game.start();

        decider1.playAction(intrigue.Ironworks);
        decider1.gainCard(intrigue.GreatHall);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 5);
        expectDiscardCards(game.activePlayer, [intrigue.GreatHall]);

        decider1.playAction(intrigue.Ironworks)
        decider1.gainCard(Silver);
        expectActionCount(game, 0);
        expectCoinCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 4);
    });
});

describe('Masquerade', function() {
    it('should draw two cards, let players with cards pass one left, then let player trash one', function() {
        const masqueradeHand = [intrigue.Masquerade, Copper, Copper, Estate, Estate];
        const [game, decider1, decider2, decider3] = testsupport.setupThreePlayerGame(masqueradeHand, [], copperEstateHand);

        game.setPlayerDeck(game.players[0], [Silver, Gold]);
        game.start();

        decider1.playAction(intrigue.Masquerade);
        expectPlayerHandSize(game.activePlayer, 6);

        decider1.passCard(Estate);
        decider3.passCard(Copper);
        decider1.trashCard(Copper);
        expectPlayerHandSize(game.activePlayer, 5);
        expectCardContents(game.players[0].hand,
            [Copper, Copper, Silver, Gold, Estate]);
        expectCardContents(game.players[1].hand,
            []);
        expectCardContents(game.players[2].hand,
            [Copper, Copper, Estate, Estate, Estate]);

        decider1.playTreasures([]);
        decider1.buyCard(null);

        // P2 has no treasures to play
        decider2.buyCard(null);
    });
});

describe('Mining Village', function() {
    it('should give +1, +2 actions and offer trash for +2 coin', function() {
        const hand = [intrigue.MiningVillage, intrigue.MiningVillage, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);
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
    });

    it('should only be trashed once with Throne Room', function() {
        const hand = [baseset.ThroneRoom, intrigue.MiningVillage, intrigue.MiningVillage, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);
        game.start();

        decider1.playAction(intrigue.MiningVillage);
        decider1.trashCard(null);

        decider1.playAction(baseset.ThroneRoom);
        decider1.playAction(intrigue.MiningVillage);
        decider1.trashCard(intrigue.MiningVillage);
        // MV shouldn't offer trash after leaving play

        expectActionCount(game, 5);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 5);
        decider1.playTreasures([]);
    });
});

describe('Minion', function() {
    const [minionCoins, minionDiscard] = intrigue.MinionChoiceEffect.effects;
    console.log(minionCoins.label);
    console.log(minionDiscard.label);

    const hand = [intrigue.Minion, intrigue.Minion, Copper, Copper, Estate];
    it('should give +1 action, and +2 coin or discard attack', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.setPlayerDeck(game.players[0], [intrigue.Minion, intrigue.Minion, intrigue.Minion, Estate, Estate]);
        game.start();

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(minionCoins);
        expectCoinCount(game, 2);
        expectPlayerHandSize(game.players[1], 5);

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(minionDiscard);

        expectActionCount(game, 1);
        expectCoinCount(game, 2);

        expectPlayerHandSize(game.activePlayer, 4);
        expectPlayerHandSize(game.players[1], 4);

        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(minionCoins);
        expectCoinCount(game, 4);
        
        const p2Hand = game.players[1].hand.cards;
        decider1.playAction(intrigue.Minion);
        decider1.chooseEffect(minionDiscard);
        expectCardContents(game.players[1].hand, p2Hand);
    });
});

describe('Nobles', function() {
    it('should be worth 2 VP', function() {
        expectDeckScore([intrigue.Nobles], 2);
        expectDeckScore([intrigue.Nobles, intrigue.Nobles, intrigue.Nobles], 6);
    });

    it('should offer +2 actions or +3 cards', function() {
        const hand = [intrigue.Nobles, intrigue.Nobles, Copper, Copper, Estate];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.Nobles);
        decider1.chooseEffect(GainTwoActions);

        expectActionCount(game, 2);
        expectPlayerHandSize(game.activePlayer, 4);

        decider1.playAction(intrigue.Nobles);
        decider1.chooseEffect(DrawThreeCards);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 6);
    });
});

describe('Pawn', function() {
    const hand = [intrigue.Pawn, intrigue.Pawn, intrigue.Pawn, intrigue.Pawn, Copper];

    it('should offer four choices', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([GainOneAction, GainOneCoin]);

        expectActionCount(game, 1);
        expectCoinCount(game, 1);


        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([GainOneAction, GainOneBuy]);

        expectActionCount(game, 1);
        expectBuyCount(game, 2);

        decider1.playAction(intrigue.Pawn);
        decider1.chooseEffects([GainOneAction, DrawOneCard]);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 3);
    });

    it('should not allow invalid choice', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.Pawn);

        expect(function() {
            decider1.chooseEffects([GainOneAction, GainTwoCoins]);
        }).to.throw(DecisionValidationError);
    });

    it('should require two choices', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.Pawn);

        expect(function() {
            decider1.chooseEffects([]);
        }).to.throw(DecisionValidationError);
    });
});

describe('Secret Chamber', function() {
    const militiaHand = [baseset.Militia, Copper, Copper, Estate, Estate];
    const secretChamberHand = [intrigue.SecretChamber, Copper, Copper, Estate, Estate];

    it('should discard cards for 1 coin each', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(secretChamberHand);

        game.start();
        decider1.playAction(intrigue.SecretChamber);
        decider1.discardCards([Copper, Estate, Estate]);
        expectCoinCount(game, 3);
    });

    it('should draw then discard two cards when revealed as reaction', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand, secretChamberHand);

        game.setPlayerDeck(game.players[1], [Silver, Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);
        decider2.discardCards([Copper, Copper]);

        decider2.revealCard(intrigue.SecretChamber);
        decider2.discardCards([Copper, Copper]);

        decider2.revealCard(null);
        decider2.discardCards([Estate, Estate]);
        expectPlayerHandSize(game.players[1], 3);
        expectCardContents(
            game.players[1].hand,
            [intrigue.SecretChamber, Silver, Gold]);
    });

    it('should allow itself to be discarded as reaction', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand, secretChamberHand);

        game.setPlayerDeck(game.players[1], [Silver, Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);
        decider2.discardCards([intrigue.SecretChamber, Copper]);
        decider2.discardCards([Estate, Estate]);
        expectPlayerHandSize(game.players[1], 3);
        expectCardContents(game.players[1].hand,
            [Copper, Silver, Gold]);
    });

    it('should allow drawing for Moat as reaction', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(militiaHand, secretChamberHand);

        game.setPlayerDeck(game.players[1], [baseset.Moat, Gold]);

        game.start();
        decider1.playAction(baseset.Militia);

        expectPlayerHandSize(game.players[1], 5);
        decider2.revealCard(intrigue.SecretChamber);

        expectPlayerHandSize(game.players[1], 7);

        decider2.discardCards([intrigue.SecretChamber, Copper]);
        decider2.revealCard(baseset.Moat);
        decider2.revealCard(null);
        decider1.playTreasures([Copper, Copper]);

        expectCardContents(game.players[1].hand,
            [baseset.Moat, Gold, Copper, Estate, Estate]);
    });
});

describe('Shanty Town', function() {
    it('should give +2 actions, reveal hand to possibly draw', function() {
        const hand = [intrigue.ShantyTown, intrigue.ShantyTown, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.ShantyTown);
        expectPlayerHandSize(game.activePlayer, 4);
        expectActionCount(game, 2);
        expectRevealedCards(game, [intrigue.ShantyTown, Copper, Copper, Copper]);

        decider1.playAction(intrigue.ShantyTown);
        expectPlayerHandSize(game.activePlayer, 5);
        expectActionCount(game, 3);
        expectRevealedCards(game, [Copper, Copper, Copper]);
    });
});

describe('Steward', function() {
    const hand = [intrigue.Steward, intrigue.Steward, intrigue.Steward, Copper, Copper];
    it('should give choice of +2 cards, +2 coins, or trash two cards', function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();
        game.incrementActionCount(2);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(DrawTwoCards);
        expectPlayerHandSize(game.activePlayer, 6);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(GainTwoCoins);
        expectCoinCount(game, 2);

        decider1.playAction(intrigue.Steward);
        decider1.chooseEffect(TrashTwoCards);
        decider1.trashCards([Copper, Copper]);
    });
});

describe('Swindler', function() {
    const hand = [intrigue.Swindler, Copper, Copper, Copper, Copper];

    it("should trash top card of opponent's deck and replace with one of same cost", function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand, copperHand);

        game.setPlayerDeck(game.players[1], [Copper]);

        game.start();

        decider1.playAction(intrigue.Swindler);
        decider1.gainCard(Curse);
        expectDiscardCards(game.players[1], [Curse]);
        expectTopTrashCard(game, Copper);
        expectCoinCount(game, 2);
    });

    it("should do nothing if opponent's deck is empty", function() {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand, copperHand);
        
        game.setPlayerDeck(game.players[1], []);

        game.start();
        decider1.playAction(intrigue.Swindler);
        expectCoinCount(game, 2);
        decider1.playTreasures([Copper])
    });

    it("should decrease value of replacement card if Bridge is in play", function() {
        const bridgeSwindlerHand = [intrigue.Bridge, intrigue.Bridge, intrigue.Swindler, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(bridgeSwindlerHand, copperHand);

        game.setPlayerDeck(game.players[1], [Estate]);

        game.start();
        game.incrementActionCount(2);
        decider1.playAction(intrigue.Bridge);
        decider1.playAction(intrigue.Bridge);
        decider1.playAction(intrigue.Swindler);
        decider1.gainCard(Curse);
    })

});

describe('Torturer', function() {
    it('should draw 3 cards and give choice of discard or gaining curse', function() {
        const hand = [intrigue.Torturer, intrigue.Torturer, intrigue.Torturer, intrigue.Torturer, intrigue.Torturer];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand, copperHand);

        game.start();
        game.incrementActionCount(4);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.GainCurseIntoHand);
        expectPlayerHandSize(game.activePlayer, 7);
        expectPlayerHandSize(game.players[1], 6);
        expectCardsNotContain(game.players[0].hand, Curse);
        expectCardsContain(game.players[1].hand, Curse);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        decider2.discardCards([Curse, Copper]);
        expectPlayerHandSize(game.players[1], 4);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        decider2.discardCards([Copper, Copper]);
        expectPlayerHandSize(game.players[1], 2);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        decider2.discardCards(game.players[1].hand.cards);
        expectPlayerHandSize(game.players[1], 0);

        decider1.playAction(intrigue.Torturer);
        decider2.chooseEffect(intrigue.TorturerDiscard);
        // No cards to discard, so no decision
        expectPlayerHandSize(game.players[1], 0);

        decider1.playTreasures([Copper]);
    });
});

describe('Trading Post', function() {
    it('should trash 2 cards to gain Silver in hand', function() {
        const hand = [intrigue.TradingPost, Copper, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.TradingPost);
        decider1.trashCards([Copper, Copper]);
        decider1.playTreasures([Copper, Copper, Silver]);
    });

    it('should only gain Silver if 2 cards are trashed', function() {
        const hand = [intrigue.TradingPost, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.TradingPost);
        decider1.trashCard(Copper);
        expectPlayerHandSize(game.activePlayer, 0);
    });
});

describe('Tribute', function() {
    it("should discard opponent's top cards and give appropriate benefit", function() {
        const hand = [intrigue.Tribute, Copper, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand, copperHand);

        game.setPlayerDeck(game.players[1], [intrigue.Nobles, Copper]);

        game.start();

        decider1.playAction(intrigue.Tribute);
        expectPlayerHandSize(game.activePlayer, 6);
        expectActionCount(game, 2);
        expectCoinCount(game, 2);
    });

    it("should only give benefit for distinct cards revealed", function() {
        const hand = [intrigue.Tribute, Copper, Copper, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand, copperHand);

        game.setPlayerDeck(game.players[1], [Copper, Copper]);
        game.start();

        decider1.playAction(intrigue.Tribute);
        expectCoinCount(game, 2);
    });
});

describe('Upgrade', function() {
    it('should give +1 card, +1 action, and trash card to gain one costing +1', function() {
        const hand = [intrigue.Upgrade, intrigue.Upgrade, Estate, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();

        decider1.playAction(intrigue.Upgrade);
        decider1.trashCard(Estate);
        decider1.gainCard(Silver);

        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 4);

        decider1.playAction(intrigue.Upgrade);
        decider1.trashCard(Copper);

        decider1.playTreasures([Copper]);
    });
});

describe('Wishing Well', function() {
    it('should give +1 card, +1 action, and allow wishing for a card to draw', function() {
        const hand = [intrigue.WishingWell, intrigue.WishingWell, Estate, Copper, Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.setPlayerDeck(game.players[0], [Estate, Estate, Estate]);

        game.start();

        decider1.playAction(intrigue.WishingWell);
        decider1.nameCard(Copper);

        expectPlayerHandSize(game.activePlayer, 5);

        decider1.playAction(intrigue.WishingWell);
        decider1.nameCard(Estate);

        expectCardContents(game.activePlayer.hand,
            [Estate, Estate, Estate, Estate, Copper, Copper]);
    });
});
