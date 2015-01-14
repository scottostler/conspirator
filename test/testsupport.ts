import _ = require('underscore');
import chai = require('chai');

import base = require('../src/base');
import cards = require('../src/cards');
import decider = require('../src/decider');
import decisions = require('../src/decisions');
import Game = require('../src/game');
import Player = require('../src/player');
import util = require('../src/util');

import expect = chai.expect;

import BasePlayer = base.BasePlayer;
import GainDestination = base.GainDestination;
import GameState = base.GameState;

function expectEqualCardNames(a:string[], b:cards.Card[]) {
    expect(a.concat().sort()).to.eql(cards.getNames(b).concat().sort());
}

export class TestingGameListener implements base.BaseGameListener {
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

export class TestingDecider implements decider.Decider {

    pendingCallback:util.StringArrayCallback;
    pendingDecision:decisions.Decision;

    setPlayer(player:base.BasePlayer) {}

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        if (this.pendingDecision) {
            throw new Error('TestingDecider already has pending decision');
        }

        this.pendingCallback = onDecide;
        this.pendingDecision = decision;
    }

    playAction(card:cards.Card) {
        expect(this.pendingDecision).not.to.be.null;
        expect(this.pendingDecision.decisionType).to.eql(decisions.DecisionType.PlayAction);

        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback([card.name]);
    }

    canGain(cs:cards.Card[]) {
        expect(this.pendingDecision).not.to.be.null;
        expect(this.pendingDecision.decisionType).to.eql(decisions.DecisionType.GainCard);
        expectEqualCardNames(this.pendingDecision.options, cs);
    }

    gainCard(card:cards.Card) {
        expect(this.pendingDecision).not.to.be.null;
        expect(this.pendingDecision.decisionType).to.eql(decisions.DecisionType.GainCard);

        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback([card.name]);
    }
}

export function setupTwoPlayerGame(kingdomCards:cards.Card[], decider1:TestingDecider, decider2:TestingDecider, hand1:cards.Card[]=null, hand2:cards.Card[]=null) : Game {
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
