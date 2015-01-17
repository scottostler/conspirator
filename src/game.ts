import _ = require('underscore');
import util = require('./util');

import base = require('./base');
import cardlist = require('./sets/cardlist');
import cards = require('./cards')
import decisions = require('./decisions');
import effects = require('./effects')
import Player = require('./player');
import scoring = require('./scoring')
import TurnState = require('./turnstate');

import Resolution = effects.Resolution;
import Target = effects.Target;

var NumKingdomCards = 10;
var HandSize = 5;

interface EventFunction {
    ():Resolution;
}

var randomizedKingdomCards = function(forcedCards:cards.Card[], numCards:number) : cards.Card[] {
    if (forcedCards.length >= numCards) {
        return forcedCards;
    }

    var randomOptions = _.difference<cards.Card>(cardlist.AllKingdomCards, forcedCards);
    var randomCards = _.sample<cards.Card>(randomOptions, numCards - forcedCards.length);
    return forcedCards.concat(randomCards);
};

function groupKingdomCards(kingdomCards:cards.Card[], kingdomCount:number, vpCount:number, curseCount:number) : cards.Pile[][] {
    var kingdomPileGroups:cards.Pile[][] = [];
    var sortedKingdomCards = _.sortBy(kingdomCards, 'cost');
    var kingdomCardCount = kingdomCards.length;
    var coinCount = 99;

    var kingdomPiles:cards.Pile[] = sortedKingdomCards.map((card:cards.Card) => {
        if (card.isVictory()) {
            return new cards.Pile(card, vpCount);
        } else {
            return new cards.Pile(card, kingdomCount);
        }
    });

    kingdomPileGroups.push(kingdomPiles);
    kingdomPileGroups.push([
        new cards.Pile(cards.Estate, vpCount),
        new cards.Pile(cards.Duchy, vpCount),
        new cards.Pile(cards.Province, vpCount),
        new cards.Pile(cards.Copper, coinCount),
        new cards.Pile(cards.Silver, coinCount),
        new cards.Pile(cards.Gold, coinCount),
    ]);

    kingdomPileGroups.push([new cards.Pile(cards.Curse, curseCount)]);
    return kingdomPileGroups;
}

class Game extends base.BaseGame {

    players:Player[];
    kingdomCards:cards.Card[];
    kingdomPileGroups:cards.Pile[][];
    kingdomPiles:cards.Pile[];
    turnCount:number;

    trash:cards.Card[];
    inPlay:cards.Card[];
    setAside:cards.Card[];

    eventStack:EventFunction[];
    hasGameEnded:boolean;

    activePlayerIndex:number;
    activePlayer:Player;
    inactivePlayers:Player[];

    turnState:TurnState;
    attackImmunity:Player[];

    emptyPilesToEndGame:number;
    storedState:any;

    // TODO: gameListener should be initialized or a required param
    constructor(players:Player[], kingdomCards:cards.Card[]=[]) {
        super();

        this.kingdomCards = randomizedKingdomCards(kingdomCards, NumKingdomCards);

        this.activePlayerIndex = -1;
        this.turnCount = 0;
        this.players = players;

        this.inPlay = [];
        this.setAside = [];
        this.eventStack = [];
        this.hasGameEnded = false;
        this.emptyPilesToEndGame = players.length >= 5 ? 4 : 3;

        this.storedState = {};

        var kingdomCardCount = 10;
        var victoryCardCount = this.players.length == 2 ? 8 : 12;
        var curseCount = (this.players.length - 1) * 10;

        this.kingdomPileGroups = groupKingdomCards(
            this.kingdomCards, kingdomCardCount, victoryCardCount, curseCount);

        this.kingdomPiles = _.flatten(this.kingdomPileGroups);
        this.trash = [];

        _.each(players, player => {
            player.setGame(this);
        });
    }

    log(...args: any[]) {
        var msg = _.toArray(args).join(' ');
        this.gameListener.log(msg);
    }

    drawInitialHands() {
        _.each(this.players, player => {
            // May already be populated in tests or other artificial scenarios
            if (player.hand.length === 0) {
                this.drawCards(player, HandSize);
            }
        });
    }

    gameState() : base.GameState {
        return {
            activePlayer: this.activePlayer.name,
            turnCount: this.turnCount,
            turnState: this.turnState
        };
    }

    stateUpdated() {
        this.gameListener.stateUpdated(this.gameState());
    }

    isGameOver() {
        var provincePile = this.pileForCard(cards.Province);
        if (provincePile.count === 0) {
            return true;
        }

        var emptyCount = util.mapSum<cards.Pile>(this.kingdomPiles, function(pile) {
            return pile.count === 0 ? 1 : 0;
        });

        if (emptyCount >= this.emptyPilesToEndGame) {
            return true;
        }

        return false;
    }

    isActivePlayer(player:Player) : boolean {
        return this.activePlayer === player;
    }

    playersAsideFrom(player:Player) {
        var index = this.players.indexOf(player);
        if (index > -1) {
            return this.players.slice(index + 1).concat(
                this.players.slice(0, index));
        } else {
            console.error('unable to find player', player);
            return [];
        }
    }

    playerLeftOf(player:Player) : Player {
        var index = this.players.indexOf(player) + 1;
        return this.players[index % this.players.length];
    }

    advanceTurn() {
        if (this.isGameOver()) {
            this.hasGameEnded = true;
            return;
        }

        if (this.setAside.length > 0) {
            throw new Error('Ending turn with uncleared set aside cards: ' + this.setAside.join(', '));
        }

        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
        this.activePlayer = this.players[this.activePlayerIndex];
        this.inactivePlayers = this.playersAsideFrom(this.activePlayer);

        this.turnState = new TurnState();
        this.attackImmunity = [];

        // TODO: assert is empty at appropriate times
        this.storedState = {};

        if (this.activePlayerIndex == 0) {
            this.turnCount++;
        }

        this.log(this.activePlayer + ' begins turn ' + this.turnCount);
        this.stateUpdated();
    }

    handleActionPhase() {
        var playableActions = this.currentlyPlayableActions();
        var actionDecision = decisions.makePlayActionDecision(playableActions);
        // TODO?: adapt to single card
        var resolution = this.activePlayer.promptForCardDecision(actionDecision, cs => {
            if (cs.length > 0) {
                return this.playAction(cs[0]);
            } else {
                this.turnState.phase = base.TurnPhase.BuyPlayTreasure;
                this.stateUpdated();
                return Resolution.Advance;
            }
        });
        this.checkEffectResolution(resolution);
    }

    handleBuyPlayTresaurePhase() {
        var treasures = cards.getTreasures(this.activePlayer.hand);
        var decision = decisions.makePlayTreasureDecision(this.activePlayer, treasures);
        var resolution = this.activePlayer.promptForCardDecision(decision, cs => {
            // TODO: this won't work for effectful Treasures like Horn of Plenty
            if (cs.length > 0) {
                cs.forEach(c => {
                    this.playTreasure(c);
                });
            }

            this.turnState.phase = base.TurnPhase.BuyPurchaseCard;
            this.stateUpdated();
            return Resolution.Advance;
        });
        this.checkEffectResolution(resolution);
    }

    handleBuyGainCardPhase() {
        var buyableCards = cards.cardsFromPiles(this.currentlyBuyablePiles());
        var buyDecision = decisions.makeBuyDecision(this.activePlayer, buyableCards);
        // TODO?: adapt to single card
        var resolution = this.activePlayer.promptForCardDecision(buyDecision, cs => {
            if (cs.length > 0) {
                return this.buyCard(cs[0]);
            } else {
                this.turnState.phase = base.TurnPhase.Cleanup;
                this.stateUpdated();
                return Resolution.Advance;
            }
        });
        this.checkEffectResolution(resolution);
    }

    handleCleanupPhase() {
        this.activePlayer.discard = this.activePlayer.discard.concat(this.inPlay);
        this.inPlay = [];

        this.gameListener.playAreaEmptied();

        this.discardHand(this.activePlayer);
        this.drawCards(this.activePlayer, HandSize);

        this.advanceTurn();

        if (this.hasGameEnded) {
            this.endGame();
        } else {
            this.advanceGameState();
        }
    }

    advanceGameState() {
        if (this.hasGameEnded) {
            throw new Error('Game already ended');
        }

        if (this.eventStack.length > 0) {
            var event = this.eventStack.pop();
            var resolution = event();
            this.checkEffectResolution(resolution);
            return;
        }

        switch (this.turnState.phase) {
            case base.TurnPhase.Action:
                this.handleActionPhase();
                return;
            case base.TurnPhase.BuyPlayTreasure:
                this.handleBuyPlayTresaurePhase();
                return;
            case base.TurnPhase.BuyPurchaseCard:
                this.handleBuyGainCardPhase();
                return;
            case base.TurnPhase.Cleanup:
                this.handleCleanupPhase();
                return;
        }
    }

    checkEffectResolution(resolution:Resolution) {
        if (resolution == Resolution.Advance) {
            this.advanceGameState();
        } else if (resolution !== Resolution.Wait) {
            throw new Error('Unexpected resolution: ' + resolution);
        }
    }

    revealPlayerHand(player:Player) {
        this.log(player, 'reveals hand:', player.hand);
    }

    playerRevealsReaction(player:Player, card:cards.Card) {
        this.log(player.name, 'reveals', card.name);
        this.pushEventForOtherEffect(card, card.reaction, player);
    }

    // Game Events

    playersForTarget(target:Target) : Player[] {
        switch (target) {
            case Target.ActivePlayer:
                return [this.activePlayer];
            case Target.OtherPlayers:
                return this.inactivePlayers;
            case Target.AllPlayers:
                return [this.activePlayer].concat(this.inactivePlayers);
            case Target.ChoosingPlayer:
                throw new Error('ChoosingPlayer not defined for this method');
        }
    }

    pushEvent(e:EventFunction) {
        this.eventStack.push(e);
    }

    // Takes events in forward chronological order,
    // and adds them in event stack order (reversed).
    pushEvents(events:EventFunction[]) {
        this.eventStack = this.eventStack.concat(util.reverse(events));
    }

    pushEventsForActionEffects(card:cards.Card) {
        var events:EventFunction[] = [];

        card.effects.forEach(e => {
            this.playersForTarget(e.getTarget()).forEach(p => {
                events.push(() => {
                    if (_.contains(this.attackImmunity, p)) {
                        return Resolution.Advance;
                    } else {
                        return e.process(this, p, card);
                    }
                });
            });
        });

        this.pushEvents(events);

        if (card.isAttack()) {
            var otherPlayers = this.playersForTarget(Target.OtherPlayers);

            this.attackImmunity = [];
            this.pushEvents(otherPlayers.map(p => {
                return () => {
                    // TODO: handle multiple reveals
                    var reactions = cards.getReactions(p.hand);
                    var decision = decisions.makeRevealCardDecision(reactions, card);
                    return p.promptForCardDecision(decision, cs => {
                        if (cs.length > 0) {

                        } else {
                            return Resolution.Advance;
                        }
                    });
                }
            }));
        }
    }

    pushEventForOtherEffect(card:cards.Card, effect:effects.Effect, player:Player) {
        this.pushEvent(() => {
            return effect.process(this, player, card);
        });
    }

    logPlayerShuffle(player:Player) {
        this.log(player.name, 'shuffles');
    }

    currentlyPlayableActions() : cards.Card[] {
        if (this.turnState.actionCount == 0) {
            return [];
        } else {
            return cards.getActions(this.activePlayer.getHand());
        }
    }

    allBuyablePiles() : cards.Pile[] {
        return this.kingdomPiles.filter(pile => {
            return pile.count > 0;
        });
    }

    pileForCard(card:cards.Card) : cards.Pile {
        var pile = _.find(this.kingdomPiles, (pile:cards.Pile) => {
            return pile.card.isSameCard(card);
        });

        if (!pile) {
            console.error('No pile for card', card);
        }

        return pile;
    }

    effectiveCardCost(card:cards.Card) : number {
        return Math.max(card.cost - this.turnState.cardDiscount, 0);
    }

    computeMaximumPurchaseCost() : number {
        return this.turnState.coinCount + util.mapSum(this.activePlayer.hand, (card:cards.Card) => {
            if (card.isSameCard(cards.Copper)) {
                return this.turnState.copperValue;
            } else if (card.isBasicTreasure()) {
                return card.money;
            } else {
                return 0;
            }
        });
    }

    currentlyBuyablePiles() : cards.Pile[] {
        if (this.turnState.buyCount == 0) {
            return [];
        } else {
            var maximumCost = this.computeMaximumPurchaseCost();
            return _.filter(this.allBuyablePiles(), (pile:cards.Pile) => {
                return this.effectiveCardCost(pile.card) <= maximumCost;
            });
        }        
    }

    // Misc. state storage

    getStoredState(key:string, alt:any=null) : any {
        var r = this.storedState[key];
        if (r !== undefined) {
            return r;
        } else if (alt !== null) {
            return alt;
        } else {
            throw new Error('Undefined value for stored state key: ' + key);
        }
    }

    setStoredState(key:string, value:any) {
        this.storedState[key] = value;
    }

    clearStoredState(key:string) {
        delete this.storedState[key];
    }

    // Game-state changes

    playTreasure(card:cards.Card) {
        this.log(this.activePlayer, 'plays', card);

        this.activePlayer.hand = cards.removeFirst(this.activePlayer.hand, card);
        this.inPlay.push(card);

        if (card.isSameCard(cards.Copper)) {
            this.turnState.coinCount += this.turnState.copperValue;
        } else {
            this.turnState.coinCount += card.money;
        }

        if (card.moneyEffect) {
            this.pushEventForOtherEffect(card, card.moneyEffect, this.activePlayer);
        }

        this.stateUpdated();
        this.gameListener.playerPlayedCard(this.activePlayer, card);
    }

    vendCardFromPile(pile:cards.Pile) : cards.Card {
        if (pile.count <= 0) {
            throw new Error('Unable to buy from empty pile');
        }

        pile.count--;
        return _.clone(pile.card);
    }

    buyCard(card:cards.Card) : Resolution {
        this.log(this.activePlayer.name, 'buys', card.name);

        var cost = this.effectiveCardCost(card);
        var pile = this.pileForCard(card);

        if (!pile) {
            throw new Error('No pile for card: ' + card);
        } else if (this.turnState.buyCount == 0) {
            throw new Error('Unable to buy with zero buys');
        } else if (pile.count == 0) {
            throw new Error('Unable to buy from empty pile');
        } else if (this.turnState.coinCount < cost) {
            throw new Error('Unable to buy card with too little money');
        }

        this.turnState.buyCount--;
        this.turnState.coinCount -= cost;
        this.activePlayer.discard.push(pile.card);
        this.turnState.cardBought = true;

        card = this.vendCardFromPile(pile);

        this.stateUpdated();
        this.gameListener.playerGainedCard(this.activePlayer, card, pile.count, base.GainDestination.Discard);

        return Resolution.Advance;
    }

    playerGainsCard(player:Player, card:cards.Card, dest:base.GainDestination=base.GainDestination.Discard) {
        var pile = this.pileForCard(card);
        card = this.vendCardFromPile(pile);

        switch (dest) {
            case base.GainDestination.Discard:
                this.log(player, 'gains', card);
                player.discard.push(card);
                break;
            case base.GainDestination.Hand:
                this.log(player, 'gains', card, 'into hand');
                player.hand.push(card);
                break;
            case base.GainDestination.Deck:
                this.log(player, 'gains', card, 'onto deck');
                player.deck.push(card);
                break;
        }

        this.gameListener.playerGainedCard(player, card, pile.count, dest);
    }

    playerGainsFromPiles(player:Player, piles:cards.Pile[], trigger:cards.Card, dest:base.GainDestination) : Resolution {
        var decision = decisions.makeGainDecision(player, cards.cardsFromPiles(piles), trigger, dest);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                this.playerGainsCard(player, cs[0], dest);
            }

            return Resolution.Advance;
        });
    }

    playerGainsFromTrash(player:Player, card:cards.Card) {
        this.trash = cards.removeFirst(this.trash, card);
        player.addCardToDiscard(card);
        this.gameListener.playerGainedCardFromTrash(player, card);
    }

    playerPassesCard(sourcePlayer:Player, targetPlayer:Player, card:cards.Card) {
        sourcePlayer.removeCardFromHand(card);
        targetPlayer.addCardToHand(card);
        this.log(sourcePlayer, 'passes', card, 'to', targetPlayer);
        this.gameListener.playerPassedCard(sourcePlayer, targetPlayer, card);
    }

    playAction(card:cards.Card) : Resolution {
        this.log(this.activePlayer.name, 'plays', card.name);

        this.turnState.playedActionCount++;
        this.turnState.actionCount--;

        this.activePlayer.hand = cards.removeFirst(this.activePlayer.hand, card);
        this.inPlay.push(card);

        this.pushEventsForActionEffects(card);
        this.gameListener.playerPlayedCard(this.activePlayer, card);
        this.stateUpdated();
        return Resolution.Advance;
    }

    playClonedAction(card:cards.Card, playCount:number) {
        this.log(this.activePlayer, 'plays', card.name, '(' + playCount + ')');
        this.turnState.playedActionCount++;
        this.pushEventsForActionEffects(card);
        this.gameListener.playerPlayedClonedCard(this.activePlayer, card);
        return Resolution.Advance;
    }

    givePlayerAttackImmunity(player:Player) {
        if (!_.contains(this.attackImmunity, player)) {
            this.attackImmunity.push(player);
        }
    }

    discardHand(player:Player) {
        if (player.hand.length > 0) {
            this.discardCards(player, player.hand);
        }
    }

    discardCards(player:Player, cs:cards.Card[], destination:base.DiscardDestination=base.DiscardDestination.Discard) {
        var ontoDeck = destination === base.DiscardDestination.Deck;
        _.each(cs, card => {
            if (!cards.contains(player.hand, card)) {
                console.error('Player unable to discard', player, card);
                return;
            }
            player.hand = cards.removeFirst(player.hand, card);
            if (ontoDeck) {
                player.deck.push(card);
            } else {
                player.discard.push(card);
            }
        });

        this.log(player, 'discards', cs.join(', '), ontoDeck ? 'onto deck' : '');
        this.gameListener.playerDiscardedCards(player, cs);
    }

    // Trash cards from a player's hand.
    trashCards(player:Player, cs:cards.Card[]) {
        this.log(player.name, 'trashes', cs.join(', '));

        _.each(cs, card => {
            player.hand = cards.removeFirst(player.hand, card);
            this.trash.push(card);
        });

        this.gameListener.playerTrashedCards(player, cs);
    }

    baseTrashCard(player:Player, card:cards.Card) {
        this.log(player.name, 'trashes', card.name);
        this.trash.push(card);
    }

    // For use with 'floating' cards, e.g. cards revealed by thief.
    // Normal trashing from hand should use trashCards.
    addCardToTrash(player:Player, card:cards.Card) {
        this.baseTrashCard(player, card);
        this.gameListener.addCardToTrash(card);
    }

    isCardInPlay(card:cards.Card) : boolean {
        return cards.contains(this.inPlay, card);
    }

    trashCardFromPlay(player:Player, card:cards.Card) : boolean {
        if (cards.contains(this.inPlay, card)) {
            this.inPlay = cards.removeFirst(this.inPlay, card);
            this.baseTrashCard(player, card);
            this.gameListener.trashCardFromPlay(card);
            return true;
        } else {
            return false;
        }
    }

    playerTrashedCardFromDeck(player:Player) : cards.Card {
        var card = player.takeCardFromDeck();
        if (!card) {
            return null;
        }

        this.baseTrashCard(player, card);
        this.gameListener.playerTrashedCardFromDeck(player, card);
        return card;
    }

    // Methods to increment active player's turn counts.

    incrementActionCount(n:number) {
        this.turnState.actionCount += n;
        this.stateUpdated();
    }

    incrementBuyCount(n:number) {
        this.turnState.buyCount += n;
        this.stateUpdated();
    }

    incrementCoinCount(n:number) {
        this.turnState.coinCount += n;
        this.stateUpdated();
    }

    incrementCardDiscount(n:number) {
        this.turnState.cardDiscount += n;
        this.stateUpdated();
    }

    // Card management methods

    drawCards(player:Player, num:number) {
        var cards = player.takeCardsFromDeck(num);
        player.addCardsToHand(cards);
        this.log(player, 'draws', num, util.pluralize('card', num));
        this.gameListener.playerDrewCards(player, cards);
    }

    drawTakenCard(player:Player, card:cards.Card, revealCards=false) {
        this.drawTakenCards(player, [card], revealCards);
    }

    // Used when card is taken from deck, and optionally drawn.
    // Assumes that the card has already been removed from the deck!
    // The cards may or may not be revealed to all players.
    drawTakenCards(player:Player, cards:cards.Card[], revealCards:boolean) {
        player.addCardsToHand(cards);
        if (revealCards) {
            this.log(player, 'draws', cards.join(', '));
        } else {
            this.log(player, 'draws', util.pluralize('card', cards.length));
        }

        this.gameListener.playerDrewCards(player, cards);
    }

    // Used when player reveals cards, and discards some.
    // Assumes that the card has already been taken from the deck.
    addCardsToDiscard(player:Player, cards:cards.Card[]) {
        if (cards.length === 0) {
            return;
        }

        this.log(player.name, 'discards', cards.join(', '));
        player.addCardsToDiscard(cards);
        this.gameListener.playerDiscardedCards(player, cards);
    }

    setAsideCard(player:Player, card:cards.Card) {
        this.setAside.push(card);
    }

    // TODO: assert cleared by turn end
    discardSetAsideCards(player:Player) {
        player.discard = player.discard.concat(this.setAside);
        this.setAside = [];
        // TODO?: gameListener event
    }

    discardCardsFromDeck(player:Player, num:number) : cards.Card[] {
        var discarded = player.discardCardsFromDeck(num);

        if (discarded.length > 0) {
            this.log(player.name, 'discards', discarded.join(', '));
            this.gameListener.playerDiscardedCardsFromDeck(player, discarded);
        }

        return discarded;
    }

    revealCardFromDeck(player:Player) : cards.Card {
        var card = player.revealCardFromDeck();
        if (card) {
            this.log(player, 'reveals', card);
        } else {
            this.log(player, 'has no cards in deck');
        }
        return card;
    }

    // This method assumes the cards have already been 'taken' from the deck.
    drawAndDiscardFromDeck(player:Player, draw:cards.Card[], discard:cards.Card[]) {
        player.hand = player.hand.concat(draw);
        player.discard = player.discard.concat(discard);

        if (draw.length > 0 && discard.length > 0) {
            this.log(player, 'draws', draw, 'and discards', discard);
        } else if (draw.length > 0) {
            this.log(player, 'draws', draw);
        } else if (discard.length > 0) {
            this.log(player, 'discards', discard.join(', '));
        }

        this.gameListener.playerDrewAndDiscardedCards(player, draw, discard);
    }

    putCardsOnDeck(player:Player, cards:cards.Card[]) {
        player.putCardsOnDeck(cards);
        this.log(player.name, 'puts', cards, 'onto their deck');
    }

    playActionMultipleTimes(card:cards.Card, num:number) : Resolution {
        this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
        this.inPlay.push(card);

        var playEvents = _.times(num, (i) => {
            return () => {
                return this.playClonedAction(card, i);
            };
        });

        this.pushEvents(playEvents);
        this.gameListener.playerPlayedCard(this.activePlayer, card);
        return Resolution.Advance;
    }

    increaseCopperValueBy(num:number) {
        this.turnState.copperValue += num;
        this.stateUpdated();
    }

    filterGainablePiles(minCost:number, maxCost:number, cardType:cards.Type=cards.Type.All) : cards.Pile[] {
        return _.filter<cards.Pile>(this.kingdomPiles, (pile:cards.Pile) => {
            if (pile.count == 0) {
                return false;
            } else if (!pile.card.matchesType(cardType)) {
                return false;
            } else {
                var pileCost = this.effectiveCardCost(pile.card);
                return pileCost >= minCost && pileCost <= maxCost;
            }
        });
    }

    // Blast off!

    start() {
        this.log('The game is afoot!');
        this.drawInitialHands();
        this.advanceTurn();
        this.advanceGameState();
    }

    endGame() {
        this.log('Game ends:');

        _.each(this.players, (player) => {
            var score = scoring.calculateScore(player.getFullDeck());
            this.log('-', player, 'has', score, 'VP');
        });

        var fullDecks = this.players.map(function(p) {
            return p.getFullDeck();
        });

        this.gameListener.gameEnded(fullDecks);
    }
}

export = Game;
