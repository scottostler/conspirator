import _ = require('underscore');
import util = require('./util');
import base = require('./base');
import Player = require('./player');
import cards = require('./cards')
import effects = require('./effects')
import scoring = require('./scoring')
import cardlist = require('./cardlist');

export var NumKingdomCards = 10;
export var HandSize = 5;

export interface GameEvent {
    process(game:Game) : effects.Resolution;
}

class CardEffectEvent {

    effect:effects.Effect;
    target:Player;

    constructor(effect:effects.Effect, target:Player) {
        this.effect = effect;
        this.target = target;
    }

    process(game:Game) : effects.Resolution {
        return this.effect.process(game, this.target);
    }
}

export interface EventFunction {
    ():effects.Resolution;
}

class EventFunctionInvocation {
    f:EventFunction;

    constructor(f:EventFunction) {
        this.f = f;
    }

    process(game:Game) : effects.Resolution {
        return this.f();
    }
}

var randomizedKingdomCards = function(forcedCards:cards.Card[], numCards:number) : cards.Card[] {
    if (forcedCards.length >= numCards) {
        return forcedCards;
    }

    var randomOptions = _.difference<cards.Card>(cardlist.AllCards, forcedCards);
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

export class Game extends base.BaseGame {

    players:Player[];
    kingdomCards:cards.Card[];
    kingdomPileGroups:cards.Pile[][];
    kingdomPiles:cards.Pile[];
    trash:cards.Card[];

    turnCount:number;
    playArea:cards.Card[];
    eventStack:GameEvent[];
    hasGameEnded:boolean;
    cardBought:boolean;

    activePlayerIndex:number;
    activePlayerActionCount:number;
    activePlayerBuyCount:number;
    activePlayerCoinCount:number;
    playedActionCount:number;

    activePlayer:Player;
    inactivePlayers:Player[];
    turnPhase:base.TurnPhase;

    cardDiscount:number;
    copperValue:number;
    emptyPilesToEndGame:number;
    storedState:any;

    constructor(players:Player[], kingdomCards:cards.Card[]=[]) {
        super();

        this.kingdomCards = randomizedKingdomCards(kingdomCards, NumKingdomCards);

        this.activePlayerIndex = -1;
        this.turnCount = 0;
        this.players = players;

        this.playArea = [];
        this.eventStack = [];
        this.hasGameEnded = false;
        this.cardBought = false; // When true, no more treasures can be played.
        this.playedActionCount = 0;
        this.activePlayerActionCount = 0;
        this.activePlayerBuyCount = 0;
        this.activePlayerCoinCount = 0;
        this.cardDiscount = 0; // apparently if you Throne Room a Bridge it discounts twice, but not Highway, for which we may want a getMatchingCardsInPlayArea
        this.copperValue = 1;
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
            this.drawCards(player, HandSize);
        });
    }

    gameState() : base.TurnState {
        return {
            activePlayer: this.activePlayer.name,
            turnCount: this.turnCount,
            turnPhase: this.turnPhase,
            actionCount: this.activePlayerActionCount,
            buyCount: this.activePlayerBuyCount,
            coinCount: this.activePlayerCoinCount,
            copperValue: this.copperValue
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

        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
        this.activePlayer = this.players[this.activePlayerIndex];
        this.inactivePlayers = this.playersAsideFrom(this.activePlayer);
        this.turnPhase = base.TurnPhase.Action;

        this.cardBought = false;
        this.playedActionCount = 0;
        this.activePlayerActionCount = 1;
        this.activePlayerBuyCount = 1;
        this.activePlayerCoinCount = 0;
        this.cardDiscount = 0;
        this.copperValue = 1;

        // TODO: assert is empty at appropriate times
        this.storedState = {};

        if (this.activePlayerIndex == 0) {
            this.turnCount++;
        }

        this.log(this.activePlayer + ' begins turn ' + this.turnCount);
        this.stateUpdated();

        return false;
    }

    advanceGameState() {
        if (this.hasGameEnded) {
            throw new Error('Game already ended');
        }

        if (this.eventStack.length > 0) {
            var event = this.eventStack.pop();
            var resolution = event.process(this);

            if (_.isUndefined(resolution)) {
                console.error(event, 'did not return a resolution');
            } else if (resolution === effects.Resolution.Advance) {
                this.advanceGameState();
            }

            return;
        }

        if (this.turnPhase == base.TurnPhase.Action) {
            var playableActions = this.currentlyPlayableActions();
            if (playableActions.length == 0) {
                this.turnPhase = base.TurnPhase.Buy;
                this.stateUpdated();
                this.advanceGameState();
            } else {
                this.activePlayer.promptForAction(this, playableActions);
            }
        } else if (this.turnPhase == base.TurnPhase.Buy) {
            var buyablePiles = this.currentlyBuyablePiles();
            if (buyablePiles.length == 0) {
                this.turnPhase = base.TurnPhase.Cleanup;
                this.stateUpdated();
                this.advanceGameState();
            } else {
                this.activePlayer.promptForBuy(this, buyablePiles, !this.cardBought);
            }
        } else if (this.turnPhase == base.TurnPhase.Cleanup) {
            this.activePlayer.discard = this.activePlayer.discard.concat(this.playArea);
            this.playArea = [];

            this.gameListener.playAreaEmptied();

            this.discardHand(this.activePlayer);
            this.drawCards(this.activePlayer, HandSize);
            this.advanceTurn();

            if (this.hasGameEnded) {
                this.endGame();
            } else {
                this.advanceGameState();
            }
        } else {
            throw new Error('Illegal turn phase: ' + this.turnPhase);
        }
    }

    checkEffectResolution(resolution:effects.Resolution) {
        if (resolution == effects.Resolution.Advance) {
            this.advanceGameState();
        }
    }

    skipActions() {
        this.activePlayerActionCount = 0;
        this.stateUpdated();
        this.advanceGameState();
    }

    skipBuys = function() {
        this.activePlayerBuyCount = 0;
        this.stateUpdated();
        this.advanceGameState();
    }


    revealPlayerHand(player:Player) {
        this.log(player, 'reveals hand:', player.hand);
    }

    // Game Events

    playersForTarget(target:effects.Target) : Player[] {
        switch (target) {
            case effects.Target.ActivePlayer:
                return [this.activePlayer];
            case effects.Target.OtherPlayers:
                return this.inactivePlayers;
            case effects.Target.AllPlayers:
                return [this.activePlayer].concat(this.inactivePlayers);
        }
    }

    pushGameEvent(e:EventFunction) {
        this.eventStack.push(new EventFunctionInvocation(e));
    }

    // Takes events in forward chronological order,
    // and adds them in event stack order (reversed).
    pushGameEvents(events:EventFunction[]) {
        var invocations = events.map(e => new EventFunctionInvocation(e));
        this.eventStack = this.eventStack.concat(util.reverse(invocations));
    }

    pushEventsForEffect(effect:effects.Effect) {
        this.pushEventsForEffects([effect]);
    }

    pushEventsForEffects(effects:effects.Effect[]) {
        var events = effects.map(e =>
            this.playersForTarget(e.getTarget()).map(p =>
                new CardEffectEvent(e, p)
            ));

        this.eventStack = this.eventStack.concat(
            util.reverse(_.flatten(events)));
    }

    logPlayerShuffle(player:Player) {
        this.log(player.name, 'shuffles');
    }

    currentlyPlayableActions() : cards.Card[] {
        if (this.activePlayerActionCount == 0) {
            return [];
        } else {
            return cards.getActions(this.activePlayer.getHand());
        }
    }

    allBuyablePiles() : cards.Pile[] {
        return this.kingdomPiles.filter(function(pile) {
            return pile.count > 0;
        });
    }

    pileForCard(card:cards.Card) : cards.Pile {
        var pile = _.find(this.kingdomPiles, function(pile:cards.Pile) {
            return pile.card === card;
        });

        if (!pile) {
            console.error('No pile for card', card);
        }

        return pile;
    }

    effectiveCardCost(card:cards.Card) : number {
        return Math.max(card.cost - this.cardDiscount, 0);
    }

    computeMaximumPurchaseCost() : number {
        return this.activePlayerCoinCount + util.mapSum(this.activePlayer.hand, (card:cards.Card) => {
            if (card === cards.Copper) {
                return this.copperValue;
            } else if (card.isBasicTreasure()) {
                return card.money;
            } else {
                return 0;
            }
        });
    }

    currentlyBuyablePiles() : cards.Pile[] {
        if (this.activePlayerBuyCount == 0) {
            return [];
        } else {
            var maximumCost = this.computeMaximumPurchaseCost();
            return _.filter(this.allBuyablePiles(), (pile:cards.Pile) => {
                return this.effectiveCardCost(pile.card) <= maximumCost;
            });
        }        
    }

    // For use in Feast, Mining Village.
    // TODO: need better way to track!
    activeInPlayCard() {
        return _.last(this.playArea);
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

        this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
        this.playArea.push(card);

        if (card === cards.Copper) {
            this.activePlayerCoinCount += this.copperValue;
        } else {
            this.activePlayerCoinCount += card.money;
        }

        if (card.moneyEffect) {
            this.pushEventsForEffect(card.moneyEffect);
        }

        this.stateUpdated();
        this.gameListener.playerPlayedCard(this.activePlayer, card);
    }

    buyCard(card:cards.Card) {
        this.log(this.activePlayer.name, 'buys', card.name);

        var cost = this.effectiveCardCost(card);
        var pile = this.pileForCard(card);

        if (!pile) {
            throw new Error('No pile for card: ' + card);
        } else if (this.activePlayerBuyCount == 0) {
            throw new Error('Unable to buy with zero buys');
        } else if (pile.count == 0) {
            throw new Error('Unable to buy from empty pile');
        } else if (this.activePlayerCoinCount < cost) {
            throw new Error('Unable to buy card with too little money');
        }

        this.activePlayerBuyCount--;
        this.activePlayerCoinCount -= cost;
        this.activePlayer.discard.push(pile.card);
        this.cardBought = true;
        pile.count--;

        this.stateUpdated();
        this.gameListener.playerGainedCard(this.activePlayer, card, pile.count, base.GainDestination.Discard);

        this.advanceGameState();
    }

    playerGainsCard(player:Player, card:cards.Card, dest:base.GainDestination=base.GainDestination.Discard) {
        var pile = this.pileForCard(card);

        if (pile.count <= 0) {
            throw new Error('Unable to gain from empty pile');
        }

        pile.count--;

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

    playerGainsFromPiles(player:Player, piles:cards.Pile[],
                         dest:base.GainDestination=base.GainDestination.Discard) : effects.Resolution {
        if (piles.length > 1) {
            return player.promptForGain(this, piles);
        } else if (piles.length === 1) {
            this.playerGainsCard(player, piles[0].card, dest);
            return effects.Resolution.Advance;
        } else {
            console.error(player.getName(), 'cannot gain from empty piles');
            return effects.Resolution.Advance;
        }
    }

    playerPassesCard(sourcePlayer:Player, targetPlayer:Player, card:cards.Card) {
        sourcePlayer.removeCardFromHand(card);
        targetPlayer.addCardToHand(card);
        this.log(sourcePlayer, 'passes', card, 'to', targetPlayer);
        this.gameListener.playerPassedCard(sourcePlayer, targetPlayer, card);
    }

    playAction(card:cards.Card) {
        this.log(this.activePlayer.name, 'plays', card.name);

        this.playedActionCount++;
        this.activePlayerActionCount--;
        this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
        this.playArea.push(card);

        this.pushEventsForEffects(card.effects);

        this.gameListener.playerPlayedCard(this.activePlayer, card);
        this.advanceGameState();
    }

    // NOTE: PlayClonedActionEffect advances the game state.
    //       Outside callers shouldn't use this.
    playClonedActionWithoutAdvance(card:cards.Card, playCount:number) {
        this.log(this.activePlayer, 'plays', card, '(' + playCount + ')');
        this.playedActionCount++;
        this.pushEventsForEffects(card.effects);
        this.gameListener.playerPlayedClonedCard(this.activePlayer, card);
    }

    givePlayerAttackImmunity(player:Player) {
        throw new Error('TODO');
    }

    discardHand(player:Player) {
        if (player.hand.length > 0) {
            this.discardCards(player, player.hand);
        }
    }

    discardCards(player:Player, cards:cards.Card[], destination:base.DiscardDestination=base.DiscardDestination.Discard) {
        var ontoDeck = destination === base.DiscardDestination.Deck;
        _.each(cards, card => {
            if (!_.contains(player.hand, card)) {
                console.error('Player unable to discard', player, card);
                return;
            }
            player.hand = util.removeFirst(player.hand, card);
            if (ontoDeck) {
                player.deck.push(card);
            } else {
                player.discard.push(card);
            }
        });

        this.log(player, 'discards', cards.join(', '), ontoDeck ? 'onto deck' : '');
        this.gameListener.playerDiscardsCards(player, cards);
    }

    // Trash cards from a player's hand.
    trashCards(player:Player, cards:cards.Card[]) {
        this.log(player.name, 'trashes', cards.join(', '));

        _.each(cards, card => {
            player.hand = util.removeFirst(player.hand, card);
            this.trash.push(card);
        });

        this.gameListener.playerTrashesCards(player, cards);
    }

    // For use with 'floating' cards, e.g. cards revealed by thief.
    // Normal trashing from hand should use trashCards.
    addCardToTrash(player:Player, card:cards.Card) {
        this.log(player.name, 'trashes', card.name);
        this.trash.push(card);
        this.gameListener.addCardToTrash(card);
    }

    trashCardFromPlay(card:cards.Card) {
        // May not be true if a feast was throne-roomed, for example.
        if (_.contains(this.playArea, card)) {
            this.playArea = util.removeFirst(this.playArea, card);
            this.trash.push(card);
            this.log(this.activePlayer.name, 'trashes', card);
            this.gameListener.trashCardFromPlay(card);
        }
    }

    gainCardFromTrash(player:Player, card:cards.Card) {
        this.log(player.name, 'gains', card);
        player.addCardToDiscard(card);
    }

    // Methods to increment active player's turn counts.

    incrementActionCount(n:number) {
        this.activePlayerActionCount += n;
        this.stateUpdated();
    }

    incrementBuyCount(n:number) {
        this.activePlayerBuyCount += n;
        this.stateUpdated();
    }

    incrementCoinCount(n:number) {
        this.activePlayerCoinCount += n;
        this.stateUpdated();
    }

    incrementCardDiscount(n:number) {
        this.cardDiscount += n;
        this.stateUpdated();
    }

    // Card management methods

    drawCards(player:Player, num:number) {
        var cards = player.takeCardsFromDeck(num);
        player.addCardsToHand(cards);
        this.log(player, 'draws', num === 1 ? 'card' : num + ' cards');
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
            this.log(player, 'draws', cards);
        } else {
            this.log(player, 'draws', util.pluralize('card', cards.length));
        }

        this.gameListener.playerDrewCards(player, cards);
    }

    // Used when player reveals cards, and discards some.
    // Assumes that the card has already been taken from the deck.
    addCardsToDiscard(player:Player, cards:cards.Card[]) {
        this.log(player.name, 'discards', cards);
        player.addCardsToDiscard(cards);
        this.gameListener.playerDiscardsCards(player, cards);
    }

    discardCardsFromDeck(player:Player, num:number) : cards.Card[] {
        var discarded = player.discardCardsFromDeck(num);

        if (discarded.length > 0) {
            this.log(player.name, 'discards', discarded);
            this.gameListener.playerDiscardsCardsFromDeck(player, discarded);
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
            this.log(player, 'discards', discard);
        }

        this.gameListener.playerDrawsAndDiscardsCards(player, draw, discard);
    }

    putCardsOnDeck(player:Player, cards:cards.Card[]) {
        player.putCardsOnDeck(cards);
        this.log(player.name, 'puts', cards, 'onto their deck');
    }

    // Does not advance game state!
    playActionMultipleTimes(card:cards.Card, num:number) {
        this.activePlayer.hand = util.removeFirst(this.activePlayer.hand, card);
        this.playArea.push(card);

        var clonedEffects = _.map<number, effects.Effect>(_.range(1, num + 1), (i) => {
            return new PlayClonedActionEffect(card, i);
        });

        this.pushEventsForEffects(clonedEffects);

        this.log(this.activePlayer, 'plays', card, num + 'x');
        this.gameListener.playerPlayedCard(this.activePlayer, card);
    }

    increaseCopperValueBy(num:number) {
        this.copperValue += num;
        this.stateUpdated();
    }

    filterGainablePiles(minCost:number, maxCost:number, cardType:cards.Type) : cards.Pile[] {
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

        var piles = _.map(this.kingdomPiles, function(p) {
            return p.card.name + ' (' + p.count + ')';
        });
        
        this.log('- Piles:', piles);

        var fullDecks = this.players.map(function(p) {
            return p.getFullDeck();
        });

        this.gameListener.gameEnded(fullDecks);
    }

}

class PlayClonedActionEffect implements effects.Effect {

    card:cards.Card;
    playCount:number; // Starts at 1

    constructor(card:cards.Card, playCount:number) {
        this.card = card;
        this.playCount = playCount;
    }

    getTarget() { return effects.Target.ActivePlayer; }

    process(game:Game, target:Player) {
        game.playClonedActionWithoutAdvance(this.card, this.playCount);
        return effects.Resolution.Advance;
    }
}
