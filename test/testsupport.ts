import _ = require('underscore');
import chai = require('chai');

import base = require('../src/base');
import baseset = require('../src/sets/baseset');
import cards = require('../src/cards');
import decider = require('../src/decider');
import decisions = require('../src/decisions');
import scoring = require('../src/scoring');
import Game = require('../src/game');
import Player = require('../src/player');
import util = require('../src/util');

import expect = chai.expect;

import BasePlayer = base.BasePlayer;
import Card = cards.Card;
import DecisionType = decisions.DecisionType;
import GainDestination = base.GainDestination;
import GameState = base.GameState;

// A list of action cards that only impact the game while played.
var neutralKingdomCards = [
    baseset.Cellar, baseset.Festival, baseset.Gardens, baseset.Market,
    baseset.Laboratory, baseset.Library, baseset.Mine, baseset.Moneylender,
    baseset.Militia, baseset.Smithy, baseset.Village];

export function neutralCardsWith(c:cards.Card) : cards.Card[] {
    var withoutCards = cards.without(neutralKingdomCards, c);
    return _.sample<cards.Card>(withoutCards, 9).concat([c]);
}

function expectEqualCardNames(a:string[], b:Card[]) {
    expect(a.concat().sort()).to.eql(cards.getNames(b).concat().sort());
}

export function expectEqualCards(a:Card[], b:Card[]) {
    expectEqualCardNames(cards.getNames(a), b);
}

export function expectDeckScore(cs:Card[], score:number) {
    expect(scoring.calculateScore(cs)).to.eql(score);
}

export function expectTopDeckCard(player:Player, c:Card) {
    expect(player.deck).to.have.length.of.at.least(1);
    expect(_.last(player.deck).name).to.equal(c.name);
}

export function expectTopDiscardCard(player:Player, c:Card) {
    expect(player.discard).to.have.length.of.at.least(1);
    expect(_.last(player.discard).name).to.equal(c.name);
}

export function setPlayerDeck(game:Game, player:Player, cs:Card[]) {
    expect(game.hasGameStarted).to.be.false;
    player.deck = cards.clone(cs);
}

export class TestingGameListener implements base.BaseGameListener {
    revealedCardQueue:Card[][];

    constructor() {
        this.revealedCardQueue = [];
    }

    log(msg:string) {}
    stateUpdated(state:GameState) {}
    playAreaEmptied() {}
    playerDrewCards(player:BasePlayer, cards:Card[]) {}
    playerGainedCard(player:BasePlayer, card:Card, newCount:number, dest:GainDestination) {}
    playerGainedCardFromTrash(player:BasePlayer, card:Card) {}
    playerPassedCard(player:BasePlayer, targetPlayer:BasePlayer, card:Card) {}
    playerPlayedCard(player:BasePlayer, card:Card) {}
    playerPlayedClonedCard(player:BasePlayer, card:Card) {}
    playerDiscardedCards(player:BasePlayer, cards:Card[]) {}
    playerDiscardedCardsFromDeck(player:BasePlayer, cards:Card[]) {}
    playerTrashedCards(player:BasePlayer, cards:Card[]) {}
    playerTrashedCardFromDeck(player:BasePlayer, card:Card) {}
    playerDrewAndDiscardedCards(player:BasePlayer, drawn:Card[], discard:Card[]) {}
    playerRevealedCards(player:BasePlayer, cards:Card[]) {
        this.revealedCardQueue.push(cards);
    }
    trashCardFromPlay(card:Card) {}
    addCardToTrash(card:Card) {}
    gameEnded(decks:Card[][]) {}
}

export function expectRevealedCards(game:Game, cs:Card[]) {
    var revealedQueue = (<TestingGameListener>game.gameListener).revealedCardQueue;
    expect(revealedQueue).to.be.not.empty;

    var revealed = revealedQueue.shift();
    expectEqualCards(revealed, cs);
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


    makeCardsDecision(d:DecisionType, cs:Card[]) {
        expect(this.pendingDecision).to.exist;
        expect(DecisionType[this.pendingDecision.decisionType]).to.eql(DecisionType[d]);

        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback(cards.getNames(cs));
    }

    makeCardDecision(d:DecisionType, card:Card) {
        this.makeCardsDecision(d, card !== null ? [card] : []);
    }

    playAction(card:Card) {
        this.makeCardDecision(DecisionType.PlayAction, card);
    }

    playTreasures(cs:Card[]) {
        this.makeCardsDecision(DecisionType.PlayTreasure, cs);
    }

    canGain(cs:Card[]) {
        expect(this.pendingDecision).not.to.be.null;
        expect(this.pendingDecision.decisionType).to.eql(DecisionType.GainCard);
        expectEqualCardNames(this.pendingDecision.options, cs);
    }

    gainCard(card:Card) {
        this.makeCardDecision(DecisionType.GainCard, card);
    }

    discardCards(cs:Card[]) {
        this.makeCardsDecision(DecisionType.DiscardCard, cs);
    }

    discardCard(c:Card) {
        this.makeCardDecision(DecisionType.DiscardCard, c);
    }

    trashCard(c:Card) {
        this.makeCardDecision(DecisionType.TrashCard, c);
    }

    trashCards(cs:Card[]) {
        this.makeCardsDecision(DecisionType.TrashCard, cs);
    }

    setAsideCard(c:Card) {
        this.makeCardDecision(DecisionType.SetAsideCard, c);
    }
}

export function setupTwoPlayerGame(kingdom:Card[], d1:TestingDecider, d2:TestingDecider, h1:Card[]=null, h2:Card[]=null) : Game {
    var player1 = new Player('Player 1', d1);
    var player2 = new Player('Player 2', d2);
    var game = new Game([player1, player2], kingdom);
    game.gameListener = new TestingGameListener();

    if (h1 !== null) {
        player1.hand = cards.clone(h1);
    }

    if (h2 !== null) {
        player2.hand = cards.clone(h2);
    }

    return game;
}

export function setupThreePlayerGame(kingdom:Card[], d1:TestingDecider, d2:TestingDecider, d3:TestingDecider, h1:Card[]=null, h2:Card[]=null, h3:Card[]=null) : Game {
    var player1 = new Player('Player 1', d1);
    var player2 = new Player('Player 2', d2);
    var player3 = new Player('Player 3', d3);
    var game = new Game([player1, player2, player3], kingdom);
    game.gameListener = new TestingGameListener();

    if (h1 !== null) {
        player1.hand = cards.clone(h1);
    }

    if (h2 !== null) {
        player2.hand = cards.clone(h2);
    }

    if (h3 !== null) {
        player3.hand = cards.clone(h3);
    }

    return game;
}