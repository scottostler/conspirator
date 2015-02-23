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

export var copperHand = util.duplicate(cards.Copper, 5);
export var copperEstateHand = util.duplicate(cards.Copper, 3).concat(util.duplicate(cards.Estate, 2));
export var threeCopperHand = util.duplicate(cards.Copper, 3);

var NumKingdomCards = 10;

// A list of action cards that only impact the game while played.
var neutralKingdomCards = [
    baseset.Cellar, baseset.Festival, baseset.Market, baseset.Laboratory,
    baseset.Library, baseset.Mine, baseset.Moneylender, baseset.Militia,
    baseset.Smithy, baseset.Village, baseset.Woodcutter];


export function neutralCardsWith(...cs:cards.Card[]) : cards.Card[] {
    var withoutCards = cards.difference(neutralKingdomCards, cs);
    return _.sample<cards.Card>(withoutCards, NumKingdomCards - cs.length).concat(cs);
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

export function expectActionCount(game:Game, count:number) {
    expect(game.turnState.actionCount).to.eql(count, 'Action count should be ' + count);
}

export function expectBuyCount(game:Game, count:number) {
    expect(game.turnState.buyCount).to.eql(count, 'Buy count should be ' + count);
}

export function expectCoinCount(game:Game, count:number) {
    expect(game.turnState.coinCount).to.eql(count, 'Coin count should be ' + count);
}

export function expectPlayerHandSize(player:Player, size:number) {
    expect(player.hand).to.have.length(size, player.name + ' should have hand size of ' + size);
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

    player:base.BasePlayer;
    pendingCallback:util.StringArrayCallback;
    pendingDecision:decisions.Decision;

    constructor() {
        this.player = null;
        this.pendingCallback = null;
        this.pendingDecision = null;
    }

    setPlayer(player:base.BasePlayer) {
        this.player = player;
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        expect(this.pendingDecision).to.not.exist;
        this.pendingCallback = onDecide;
        this.pendingDecision = decision;
    }

    hasSelectionCounts(minSelections:number, maxSelections:number) {
        expect(this.pendingDecision.minSelections).to.eql(minSelections);
        expect(this.pendingDecision.maxSelections).to.eql(maxSelections);
    }

    expectPendingDecisionType(d:DecisionType) {
        var dType = DecisionType[d];
        expect(this.pendingDecision).to.not.eql(
            null, 'No pending decision of type ' + dType + ' for ' + this.player.getName());
        expect(DecisionType[this.pendingDecision.decisionType]).to.eql(
            DecisionType[d], 'Wrong decision type');
    }

    makeDiscardDeckDecision(result:boolean) {
        this.expectPendingDecisionType(DecisionType.DiscardDeck);
        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback([result ? decisions.Yes : decisions.No]);
    }

    makeEffectsDecision(labels:string[]) {
        this.expectPendingDecisionType(DecisionType.ChooseEffect);
        var callback = this.pendingCallback;
        this.pendingCallback = null;
        this.pendingDecision = null;
        callback(labels);
    }

    makeCardsDecision(d:DecisionType, cs:Card[]) {
        this.expectPendingDecisionType(d);
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

    revealCard(c:Card) {
        this.makeCardDecision(DecisionType.RevealCard, c);
    }

    setAsideCard(c:Card) {
        this.makeCardDecision(DecisionType.SetAsideCard, c);
    }

    chooseEffect(label:string) {
        this.makeEffectsDecision(label !== null ? [label] : []);
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
