import _ = require("underscore");
import base = require('./base');
import cardlist = require('./sets/cardlist');
import cards = require('./cards');
import decider = require('./decider');
import decisions = require('./decisions');
import effects = require('./effects');
import Game = require('./game');
import util = require('./util');

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

        this.hand = [];

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

    removeCardFromHand(card:cards.Card) {
        this.hand = cards.removeFirst(this.hand, card);
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

    discardCardsFromDeck(num:number) : cards.Card[] {
        var cards = this.takeCardsFromDeck(num);
        this.discard = this.discard.concat(cards);
        return cards;
    }

    discardCardFromDeck() : cards.Card {
        return _.head(this.discardCardsFromDeck(1));
    }

    revealCardsFromDeck(n:number) : cards.Card[] {
        if (this.deck.length < n) {
            this.shuffleKeepingDeckOnTop();
        }

        return _.last(this.deck, n);
    }

    revealCardFromDeck() : cards.Card {
        return _.head(this.revealCardsFromDeck(1));
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
        this.deck = [];
        this.discard = this.discard.concat(this.deck);
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
            throw new Error('Too many results picked: ' + xs.length + ', max is ' + decision.maxSelections);
        }            

        xs.forEach(x => {
            if (!_.contains(decision.options, x)) {
                throw new Error('Invalid result: ' + x);
            }
        });
    }

    promptForDecision(decision:decisions.Decision, onDecide:effects.StringsCallback) : effects.Resolution {
        if (decision.options.length <= decision.minSelections) {
            onDecide(decision.options);
            return effects.Resolution.Advance;
        }

        this.decider.promptForDecision(decision, xs => {
            this.assertValidResults(xs, decision);
            this.game.checkEffectResolution(onDecide(xs));
        });
        return effects.Resolution.Wait;
    }

    promptForCardDecision(decision:decisions.Decision, onDecide:effects.CardsCallback) : effects.Resolution {
        return this.promptForDecision(decision, xs => {
            return onDecide(cardlist.getCardsByNames(xs));
        });
    }

    promptForEffectDecision(decision:decisions.Decision, es:effects.LabelledEffect[], onDecide:effects.LabelledEffectsCallback) : effects.Resolution {
        return this.promptForDecision(decision, xs => {
            var chosen = _.map<string, effects.LabelledEffect>(xs, x => {
                var idx = decision.options.indexOf(x);
                return es[idx];
            });
            return onDecide(chosen);
        });
    }

    promptForBooleanDecision(decision:decisions.Decision, onDecide:effects.BooleanCallback) : effects.Resolution {
        return this.promptForDecision(decision, xs => {
            return onDecide(xs[0] === decisions.Yes);
        });
    }
}

export = Player;
