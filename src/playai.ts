import Player = require('./player');
import cards = require('./cards')
import base = require('./base');
import game = require('./game');
import ai = require('./ai');


class GameConsoleLogger implements base.BaseGameListener {

    log(msg:string) {
        console.log(msg);
    }

    stateUpdated(state:base.TurnState) {}
    playAreaEmptied() {}
    playerDrewCards(player:base.BasePlayer, cards:cards.Card[]) {}
    playerGainedCard(player:base.BasePlayer, card:cards.Card, newCount:number, dest:base.GainDestination) {}
    playerPassedCard(player:base.BasePlayer, targetPlayer:base.BasePlayer, card:cards.Card) {}
    playerPlayedCard(player:base.BasePlayer, card:cards.Card) {}
    playerPlayedClonedCard(player:base.BasePlayer, card:cards.Card) {}
    playerDiscardsCards(player:base.BasePlayer, cards:cards.Card[]) {}
    playerDiscardsCardsFromDeck(player:base.BasePlayer, cards:cards.Card[]) {}
    playerTrashesCards(player:base.BasePlayer, cards:cards.Card[]) {}
    playerDrawsAndDiscardsCards(player:base.BasePlayer, drawn:cards.Card[], discard:cards.Card[]) {}
    trashCardFromPlay(card:cards.Card) {}
    addCardToTrash(card:cards.Card) {}
    gameEnded(decks:cards.Card[][]) {}

}

var players = ai.makeComputerPlayers(2);
var g = new game.Game(players);
g.gameListener = new GameConsoleLogger();

g.start();
