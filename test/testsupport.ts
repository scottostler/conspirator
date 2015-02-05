import _ = require('underscore');
import chai = require('chai');

import base = require('../src/base');
import cards = require('../src/cards');
import decider = require('../src/decider');
import decisions = require('../src/decisions');
import scoring = require('../src/scoring');
import Game = require('../src/game');
import Player = require('../src/player');
import util = require('../src/util');

import expect = chai.expect;

import BasePlayer = base.BasePlayer;
import DecisionType = decisions.DecisionType;
import GainDestination = base.GainDestination;
import GameState = base.GameState;

function expectEqualCardNames(a:string[], b:cards.Card[]) {
    expect(a.concat().sort()).to.eql(cards.getNames(b).concat().sort());
}

function expectEqualCards(a:cards.Card[], b:cards.Card[]) {
    expectEqualCardNames(cards.getNames(a), b);
}

export function expectDeckScore(cs:cards.Card[], score:number) {
    expect(scoring.calculateScore(cs)).to.eql(score);
}

export function expectTopDeckCard(player:Player, c:cards.Card) {
    expect(player.deck).to.have.length.of.at.least(1);
    expect(_.last(player.deck)).to.equal(c);
}

export class TestingGameListener implements base.BaseGameListener {
    revealedCards:cards.Card[];

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
    playerRevealedCards(player:BasePlayer, cards:cards.Card[]) {
        this.revealedCards = cards;
    }
    trashCardFromPlay(card:cards.Card) {}
    addCardToTrash(card:cards.Card) {}
    gameEnded(decks:cards.Card[][]) {}
}

export function expectRevealedCards(game:Game, cs:cards.Card[]) {
    var revealed = (<TestingGameListener>game.gameListener).revealedCards;
    expect(revealed).to.be.not.null;
    expectEqualCards(revealed, cs);
    (<TestingGameListener>game.gameListener).revealedCards = null;
}

export class TestingDecider implements decider.Decider {

    pendingCallback:util.StringArrayCallback;
    pendingDecision:decisions.Decision;

    setPlayer(player:base.BasePlayer) {}

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        expect(this.pendingDecision).to.not.exist;
        this.pendingCallback = onDecide;
        this.pendingDecision = decision;
    }

    hasSelectionCounts(minSelections:number, maxSelections:number) {
        expect(this.pendingDecision.minSelections).to.eql(minSelections);
        expect(this.pendingDecision.maxSelections).to.eql(maxSelections);
    }

    makeDiscardDeckDecision(result:boolean) {
        expect(this.pendingDecision).to.exist;
        expect(DecisionType[this.pendingDecision.decisionType]).to.eql(DecisionType[DecisionType.DiscardDeck]);

        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback([result ? decisions.Yes : decisions.No]);
    }


    makeCardsDecision(d:DecisionType, cs:cards.Card[]) {
        expect(this.pendingDecision).to.exist;
        expect(DecisionType[this.pendingDecision.decisionType]).to.eql(DecisionType[d]);

        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback(cards.getNames(cs));
    }

    makeCardDecision(d:DecisionType, card:cards.Card) {
        this.makeCardsDecision(d, card !== null ? [card] : []);
    }

    playAction(card:cards.Card) {
        this.makeCardDecision(DecisionType.PlayAction, card);
    }

    playTreasures(cs:cards.Card[]) {
        this.makeCardsDecision(DecisionType.PlayTreasure, cs);
    }

    canGain(cs:cards.Card[]) {
        expect(this.pendingDecision).not.to.be.null;
        expect(this.pendingDecision.decisionType).to.eql(DecisionType.GainCard);
        expectEqualCardNames(this.pendingDecision.options, cs);
    }

    gainCard(card:cards.Card) {
        this.makeCardDecision(DecisionType.GainCard, card);
    }

    discardCards(cs:cards.Card[]) {
        this.makeCardsDecision(DecisionType.DiscardCard, cs);
    }

    discardCard(c:cards.Card) {
        this.makeCardDecision(DecisionType.DiscardCard, c);
    }

    trashCard(c:cards.Card) {
        this.makeCardDecision(DecisionType.TrashCard, c);
    }

    trashCards(cs:cards.Card[]) {
        this.makeCardsDecision(DecisionType.TrashCard, cs);
    }
}

export function setupTwoPlayerGame(kingdomCards:cards.Card[], decider1:TestingDecider, decider2:TestingDecider, hand1:cards.Card[]=null, hand2:cards.Card[]=null) : Game {
    var player1 = new Player('Player 1', decider1);
    var player2 = new Player('Player 2', decider2);
    var game = new Game([player1, player2], kingdomCards);
    game.gameListener = new TestingGameListener();

    if (hand1 !== null) {
        player1.hand = cards.clone(hand1);
    }

    if (hand2 !== null) {
        player2.hand = cards.clone(hand2);
    }

    return game;
}
