import Player = require('./player');
import cards = require('./cards')
import base = require('./base');
import Game = require('./game');
import ai = require('./ai');

import BasePlayer = base.BasePlayer;
import GainDestination = base.GainDestination;
import GameState = base.GameState;

class GameConsoleLogger implements base.BaseGameListener {

    log(msg:string) {
        console.log(msg);
    }

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

var game = new Game(ai.makeComputerPlayers(2));
game.gameListener = new GameConsoleLogger();
game.start();
