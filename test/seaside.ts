import * as common from '../src/sets/common';
import * as seaside from '../src/sets/seaside';
import * as testsupport from './testsupport';
import * as util from '../src/utils';

import expectActionCount = testsupport.expectActionCount;
import expectBuyCount = testsupport.expectBuyCount;
import expectCoinCount = testsupport.expectCoinCount;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

describe('Bazaar', () => {
    it('should give +1, +2 actions, +1 coin', done => {
        const hand = [seaside.Bazaar, common.Copper, common.Copper, common.Copper, common.Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

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
        const hand = [seaside.Warehouse, common.Copper, common.Copper, common.Copper, common.Copper];
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(hand);

        game.start();
        
        decider1.playAction(seaside.Warehouse);
        expectActionCount(game, 1);
        expectPlayerHandSize(game.activePlayer, 7);
        decider1.discardCards([common.Copper, common.Copper, common.Copper]);

        decider1.playTreasures([common.Copper]);

        done();
    });
});