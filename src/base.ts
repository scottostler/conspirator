import cards = require('./cards');
import TurnState = require('./turnstate');

export enum TurnPhase {
    Action,
    BuyPlayTreasure,
    BuyPurchaseCard,
    Cleanup
}

export enum GainSource {
    Pile,
    Trash
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

export interface GameState {
    activePlayer:string;
    turnCount:number;
    turnState:TurnState;
}

export interface BaseGameListener {
    log(msg:string):void;
    stateUpdated(state:GameState):void;
    playAreaEmptied():void;
    playerDrewCards(player:BasePlayer, cards:cards.Card[]):void;
    playerGainedCard(player:BasePlayer, card:cards.Card, source:GainSource, dest:GainDestination):void;
    playerPassedCard(player:BasePlayer, targetPlayer:BasePlayer, card:cards.Card):void;
    playerPlayedCard(player:BasePlayer, card:cards.Card):void;
    playerPlayedClonedCard(player:BasePlayer, card:cards.Card):void;
    playerDiscardedCards(player:BasePlayer, cards:cards.Card[]):void;
    playerDiscardedCardsFromDeck(player:BasePlayer, cards:cards.Card[]):void;
    playerTrashedCards(player:BasePlayer, cards:cards.Card[]):void;
    playerTrashedCardFromDeck(player:BasePlayer, card:cards.Card):void;
    playerDrewAndDiscardedCards(player:BasePlayer, drawn:cards.Card[], discard:cards.Card[]):void;
    playerRevealedCards(player:BasePlayer, cards:cards.Card[]):void;
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
    'playerGainedCardFromTrash',
    'playerPassedCard',
    'playerPlayedCard',
    'playerPlayedClonedCard',
    'playerDiscardedCards',
    'playerDiscardedCardsFromDeck',
    'playerTrashedCards',
    'playerTrashedCardFromDeck',
    'playerDrewAndDiscardedCards',
    'trashCardFromPlay',
    'addCardToTrash',
    'gameEnded',
];

export class BaseGame {
    players:BasePlayer[];
    trash:cards.Card[];
    kingdomPileGroups:cards.Pile[][];
    gameListener:BaseGameListener;
}
