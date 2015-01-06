/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

import _ = require('underscore');
import chai = require('chai');

import base = require('../src/base');
import util = require('../src/util');
import decider = require('../src/decider');
import decisions = require('../src/decisions');
import cards = require('../src/cards');
import Game = require('../src/game');
import Player = require('../src/player');
import baseset = require('../src/sets/baseset');

import expect = chai.expect;

import BasePlayer = base.BasePlayer;
import GainDestination = base.GainDestination;
import GameState = base.GameState;

class TestingGameListener implements base.BaseGameListener {
    log(msg:string) {}
    stateUpdated(state:GameState) {}
    playAreaEmptied() {}
    playerDrewCards(player:BasePlayer, cards:cards.Card[]) {}
    playerGainedCard(player:BasePlayer, card:cards.Card, newCount:number, dest:GainDestination) {}
    playerGainedCardFromTrash(player:BasePlayer, card:cards.Card) {}
    playerPassedCard(player:BasePlayer, targetPlayer:BasePlayer, card:cards.Card) {}
    playerPlayedCard(player:BasePlayer, card:cards.Card) {}
    playerPlayedClonedCard(player:BasePlayer, card:cards.Card) {}
    playerDiscardedCards(player:BasePlayer, cards:cards.Card[]) {}
    playerDiscardedCardsFromDeck(player:BasePlayer, cards:cards.Card[]) {}
    playerTrashedCards(player:BasePlayer, cards:cards.Card[]) {}
    playerTrashedCardFromDeck(player:BasePlayer, card:cards.Card) {}
    playerDrewAndDiscardedCards(player:BasePlayer, drawn:cards.Card[], discard:cards.Card[]) {}
    trashCardFromPlay(card:cards.Card) {}
    addCardToTrash(card:cards.Card) {}
    gameEnded(decks:cards.Card[][]) {}
}

class TestingDecider implements decider.Decider {

    setPlayer(player:base.BasePlayer) {}

    pileSelectionCallback:cards.PurchaseCallback;
    handSelectionCallback:cards.CardsCallback;
    cardOrderingCallback:cards.CardsCallback;
    decisionCallback:util.AnyCallback;

    assertNoCallback() {
        if (this.pileSelectionCallback) {
            throw new Error('TestingDecider.pileSelectionCallback is not null');
        }

        if (this.handSelectionCallback) {
            throw new Error('TestingDecider.handSelectionCallback is not null');
        }

        if (this.cardOrderingCallback) {
            throw new Error('TestingDecider.cardOrderingCallback is not null');
        }

        if (this.decisionCallback) {
            throw new Error('TestingDecider.decisionCallback is not null');
        }
    }

    promptForPileSelection(piles:cards.Pile[], allowTreasures:boolean, allowCancel:boolean, label:string, onSelect:cards.PurchaseCallback) {
        this.assertNoCallback();
        this.pileSelectionCallback = onSelect;
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], label:string, onSelect:cards.CardsCallback) {
        this.assertNoCallback();
        this.handSelectionCallback = onSelect;
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
        this.assertNoCallback();
        this.cardOrderingCallback = onOrder;
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback) {
        this.assertNoCallback();
        this.decisionCallback = onDecide;
    }

    playAction(card:cards.Card) {
        if (this.handSelectionCallback === null) {
            throw new Error('TestingDecider.handSelectionCallback is null, cannot play action');
        }

        var callback = this.handSelectionCallback;
        this.handSelectionCallback = null;
        callback([card]);
    }

}

function setupTwoPlayerGame(kingdomCards:cards.Card[], decider1:TestingDecider, decider2:TestingDecider, hand1:cards.Card[]=null, hand2:cards.Card[]=null) : Game {
    var player1 = new Player('Player 1', decider1);
    if (hand1 !== null) {
        player1.hand = hand1;
    }

    var player2 = new Player('Player 2', decider2);
    if (hand2 !== null) {
        player2.hand = hand2;
    }

    var game = new Game([player1, player2], kingdomCards);
    game.gameListener = new TestingGameListener();
    return game;
}

describe('feast', () => {
    it('should let player gain card costing 0-4', (done) => {
        var kingdomCards = [
            baseset.Feast, baseset.Festival, baseset.Gardens, baseset.Market,
            baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moat,
            baseset.Moneylender, baseset.Militia];

        var decider1 = new TestingDecider();
        var decider2 = new TestingDecider();

        var bridgeHand = [baseset.Feast, cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var copperHand = [cards.Copper, cards.Copper, cards.Copper, cards.Copper, cards.Copper];
        var game = setupTwoPlayerGame(kingdomCards, decider1, decider2, bridgeHand, copperHand);

        game.start();
        decider1.playAction(baseset.Feast);
        if (decider1.pileSelectionCallback === null) {
            throw new Error('Player1 missing pileSelectionCallback');
        }

        done();
    });
});
