import { expect } from 'chai';

import * as cards from '../src/cards';
import { Copper, Estate } from '../src/sets/common';
import * as testsupport from './testsupport';
import * as util from '../src/utils';

import expectEqualCards = testsupport.expectEqualCards;
import expectPlayerHandSize = testsupport.expectPlayerHandSize;

var fiveCopperHand = [Copper, Copper, Copper, Copper, Copper];

describe('Game.beginNewTurn', () => {
   it('players should discard hand, and draw 5 cards after turn', () => {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame();
        game.start();

        const player1Hand = game.activePlayer.hand.cards;
        decider1.playTreasures([]);
        decider1.buyCard(null);
        decider2.playTreasures([]);

        expect(game.players[0].getFullDeck()).to.have.lengthOf(10);
        expect(cards.asNames(game.inPlay.cards)).to.be.empty;
        
        expectEqualCards(game.players[0].discard.cards, player1Hand);
        expect(game.players[0].deck.cards).to.be.empty;
        expectPlayerHandSize(game.players[0], 5);
    });
});

describe('Game.isExactCardInPlay', () => {
    it('should match exact cards in play', () => {
        const [game, decider1, decider2] = testsupport.setupTwoPlayerGame(fiveCopperHand);

        game.start();
        decider1.playTreasures([Copper, Copper, Copper]);
        expect(game.inPlay.includes(game.activePlayer.hand.cards[0])).to.be.false;
        expect(game.inPlay.includes(game.inPlay.cards[0])).to.be.true;
    });
});