import _ = require("underscore");

import * as base from './base';
import cardlist = require('./sets/cardlist');
import * as cards from './cards';
import * as decider from './decider';
import * as decisions from './decisions';
import * as effects from './effects';
import Game from './game';
import * as util from './util';

import Resolution = effects.Resolution;

function startingDeck() : cards.Card[] {
    return _.flatten(
        [util.duplicate(cards.Copper, 7),
         util.duplicate(cards.Estate, 3)],
        true);
}

class Player extends base.BasePlayer {

    name:string;
    decider:decider.Decider;

    game:Game;
    hand:cards.Card[];
    deck:cards.Card[];
    discard:cards.Card[];

    constructor(name:string, decider:decider.Decider) {
        super();
        this.name = name;
        this.decider = decider;
        this.decider.setPlayer(this);
        this.game = null;
        this.hand = null; // assigned by game

        // Card stacks store their bottom-most card at index 0.
        this.deck = _.shuffle<cards.Card>(startingDeck());
        this.discard = [];
    }

    toString() { return this.name; }

    setGame(game:Game) {
        this.game = game;
    }

    canDraw() : boolean {
        return this.deck.length > 0 || this.discard.length > 0;
    }

    addCardsToHand(cards:cards.Card[]) {
        this.hand = this.hand.concat(cards);
    }

    addCardToHand(card:cards.Card) {
        this.addCardsToHand([card]);
    }

    addCardsToDiscard(cards:cards.Card[]) {
        this.discard = this.discard.concat(cards);
    }

    addCardToDiscard(card:cards.Card) {
        this.addCardsToDiscard([card]);
    }

    addCardToTopOfDeck(card:cards.Card) {
        this.deck.push(card);
    }

    removeCardFromHand(card:cards.Card) {
        cards.removeFirst(this.hand, card);
    }

    takeCardsFromDeck(num:number) : cards.Card[] {
        var cards:cards.Card[] = [];
        while (cards.length < num && this.canDraw()) {

            if (this.deck.length == 0) {
                this.shuffleCompletely();
            }

            cards.push(this.deck.pop());
        }

        return cards;
    }

    takeCardFromDeck() : cards.Card {
        return _.head(this.takeCardsFromDeck(1));
    }

    takeCardsFromDeckUntil(predicate:cards.CardPredicate) : cards.CardSearchResult {
        var takenCards:cards.Card[] = [];
        var card:cards.Card = null;

        while (card = this.takeCardFromDeck()) {
            if (predicate(card)) {
                return {
                    foundCard:card,
                    otherCards:takenCards
                };
            } else {
                takenCards.push(card)
            }
        }

        return {
            foundCard:null,
            otherCards:takenCards
        };
    }

    discardCardsFromDeck(num:number) : cards.Card[] {
        var cards = this.takeCardsFromDeck(num);
        this.discard = this.discard.concat(cards);
        return cards;
    }

    discardCardFromDeck() : cards.Card {
        return _.head(this.discardCardsFromDeck(1));
    }

    topCardsOfDeck(n:number) : cards.Card[] {
        if (this.deck.length < n) {
            this.shuffleKeepingDeckOnTop();
        }

        return _.last(this.deck, n);
    }

    topCardOfDeck() : cards.Card {
        return _.head(this.topCardsOfDeck(1));
    }

    putCardsOnDeck(cards:cards.Card[]) {
        this.deck = cards.concat(this.deck);
    }

    shuffleKeepingDeckOnTop() {
        this.deck = _.shuffle<cards.Card>(this.discard).concat(this.deck);
        this.discard = [];
        this.game.logPlayerShuffle(this);
    }

    shuffleCompletely() {
        this.deck = _.shuffle<cards.Card>(this.deck.concat(this.discard));
        this.discard = [];
        this.game.logPlayerShuffle(this);
    }

    putDeckIntoDiscard() {
        this.discard = this.discard.concat(this.deck);
        this.deck = [];
        this.game.log(this, 'puts deck into discard');
    }

    getFullDeck() : cards.Card[] {
        return this.hand.concat(this.deck, this.discard);
    }

    // Abstract methods

    getName() : string {
        return this.name;
    }

    getHand() : cards.Card[] {
        return this.hand;
    }

    deckCount() : number {
        return this.deck.length;
    }

    topDiscard() : cards.Card {
        return this.discard.length > 0 ? _.last(this.discard) : null;
    }

    // Prompts

    assertValidResults(xs:string[], decision:decisions.Decision) {
        if (xs.length > decision.maxSelections) {
            throw new Error('Too many choices made: ' + xs.length + ', max is ' + decision.maxSelections);
        } else if (xs.length < decision.minSelections) {
            throw new Error('Too few choices made: ' + xs.length + ', min is ' + decision.minSelections);
        }

        xs.forEach(x => {
            if (!_.contains(decision.options, x)) {
                throw new Error('Invalid result: ' + x + ', options: ' + decision.options.join(', '));
            }
        });
    }

    promptForDecision(decision:decisions.Decision, onDecide:effects.StringsCallback) : Resolution {
        if (!decisions.doesOrderMatter(decision) && decision.options.length <= decision.minSelections) {
            onDecide(decision.options);
            return effects.Resolution.Advance;
        } else if (decision.maxSelections === 0) {
            onDecide([]);
            return effects.Resolution.Advance;
        }

        this.decider.promptForDecision(decision, xs => {
            this.assertValidResults(xs, decision);
            this.game.checkEffectResolution(onDecide(xs));
        });
        return effects.Resolution.Wait;
    }

    promptForCardDecision(decision:decisions.Decision, onDecide:effects.CardsCallback) : Resolution {
        return this.promptForDecision(decision, xs => {
            return onDecide(cardlist.getCardsByNames(xs));
        });
    }

    promptForEffectDecision(decision:decisions.Decision, es:effects.LabelledEffect[], onDecide:effects.LabelledEffectsCallback) : Resolution {
        return this.promptForDecision(decision, xs => {
            var chosen = _.map<string, effects.LabelledEffect>(xs, x => {
                var idx = decision.options.indexOf(x);
                return es[idx];
            });
            return onDecide(chosen);
        });
    }

    promptForBooleanDecision(decision:decisions.Decision, onDecide:effects.BooleanCallback) : Resolution {
        return this.promptForDecision(decision, xs => {
            return onDecide(xs[0] === decisions.Yes);
        });
    }

    // Convenience methods for specific decision types

    gainsFromPiles(piles:cards.Pile[], trigger:cards.Card, dest:base.GainDestination, onGain?:effects.CardCallback) : Resolution {
        var decision = decisions.makeGainDecision(this, cards.cardsFromPiles(piles), trigger, dest);
        return this.promptForGainDecision(decision, cs => {
            if (onGain) {
                return onGain(cs.length > 0 ? cs[1] : null);
            } else {
                return Resolution.Advance;
            }
        });
    }

    promptForGainDecision(d:decisions.GainCardDecision, onDecide?:effects.CardsCallback) : Resolution {
        return this.promptForCardDecision(d, cs => {
            if (d.isBuy) {
                if (cs.length > 0) {
                    return this.game.playerBuysCard(cs[0]);
                } else {
                    return this.game.playerSkipsBuy();
                }
            }

            cs.forEach(c => {
                this.game.playerGainsCard(d.targetPlayer, c, d.destination, d.source);
            });

            if (onDecide) {
                return onDecide(cs);
            } else {
                return Resolution.Advance;
            }
        });
    }

    promptForDiscardDecision(d:decisions.DiscardCardDecision, onDecide?:effects.CardsCallback) : Resolution {
        return this.promptForCardDecision(d, cs => {
            if (cs.length > 0) {
                this.game.discardCards(this, cs, d.destination);
            }

            if (onDecide) {
                return onDecide(cs);
            } else {
                return Resolution.Advance;
            }
        });
    }
}

export default Player;
