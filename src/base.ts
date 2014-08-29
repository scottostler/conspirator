/// <reference path="../typings/underscore/underscore.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
import _ = require('underscore');
import cards = require('./cards');
import util = require('./util');

export enum TurnPhase {
    Action,
    Buy,
    Cleanup
}

export enum GainDestination {
    Discard,
    Hand,
    Deck
}

export enum DiscardDestination {
    Discard,
    Deck
}

export class BasePlayer {
    getName() : string { throw new Error('Unimplemented'); }
    getHand() : cards.Card[] { throw new Error('Unimplemented'); }
    deckCount() : number { throw new Error('Unimplemented'); }
    topDiscard() : cards.Card { throw new Error('Unimplemented'); }
}

export interface TurnState {
    activePlayer:string;
    turnCount:number;
    turnPhase:TurnPhase;
    actionCount:number;
    buyCount:number;
    coinCount:number;
    copperValue:number;
}

export interface BaseGameListener {
    log(msg:string):void;
    stateUpdated(state:TurnState):void;
    playAreaEmptied():void;
    playerDrewCards(player:BasePlayer, cards:cards.Card[]):void;
    playerGainedCard(player:BasePlayer, card:cards.Card, newCount:number, dest:GainDestination):void;
    playerPassedCard(player:BasePlayer, targetPlayer:BasePlayer, card:cards.Card):void;
    playerPlayedCard(player:BasePlayer, card:cards.Card):void;
    playerPlayedClonedCard(player:BasePlayer, card:cards.Card):void;
    playerDiscardsCards(player:BasePlayer, cards:cards.Card[]):void;
    playerDiscardsCardsFromDeck(player:BasePlayer, cards:cards.Card[]):void;
    playerTrashesCards(player:BasePlayer, cards:cards.Card[]):void;
    playerDrawsAndDiscardsCards(player:BasePlayer, drawn:cards.Card[], discard:cards.Card[]):void;
    trashCardFromPlay(card:cards.Card):void;
    addCardToTrash(card:cards.Card):void;
    gameEnded(decks:cards.Card[][]):void;
}

export var GameEvents:string[] = [
    'log',
    'stateUpdated',
    'playAreaEmptied',
    'playerDrewCards',
    'playerGainedCard',
    'playerPassedCard',
    'playerPlayedCard',
    'playerPlayedClonedCard',
    'playerDiscardsCards',
    'playerDiscardsCardsFromDeck',
    'playerTrashesCards',
    'playerDrawsAndDiscardsCards',
    'trashCardFromPlay',
    'addCardToTrash',
    'gameEnded'
];

export class BaseGame {
    players:BasePlayer[];
    kingdomPileGroups:cards.Pile[][];
    gameListener:BaseGameListener;
}
