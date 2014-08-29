/// <reference path="../typings/underscore/underscore.d.ts" />
import _ = require("underscore");
import util = require('./util');
import cards = require('./cards');
import base = require('./base');
import decider = require('./decider');
import decisions = require('./decisions');
import effects = require('./effects');
import game = require('./game');

function startingDeck() : cards.Card[] {
    return _.flatten(
        [util.repeat(cards.Copper, 7), util.repeat(cards.Estate, 3)],
        true);
}

function optionToKey(o:any) {
    if (o instanceof cards.Card) {
        return o.name;
    } else if (o._optionString) {
        return o._optionString;
    } else if (_.isString(o)) {
        return o;
    } else {
        console.error('Unable to convert option to key', o);
        return null;
    }
};

class Player extends base.BasePlayer {

    name:string;
    decider:decider.Decider;

    game:game.Game;
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

    setGame(game:game.Game) {
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
        this.hand = util.removeFirst(this.hand, card);
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
        while (true) {
            var card = this.takeCardFromDeck();
            if (!card || predicate(card)) {
                return {
                    foundCard:card,
                    otherCards:takenCards
                };
            } else {
                takenCards.push(card)
            }
        }
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

    promptForAction(game:game.Game, actions:cards.Card[]) : effects.Resolution {
        var onAction = (action:cards.Card) => {
            if (action) {
                game.playAction(action);
            } else {
                game.skipActions();
            }
        }

        this.decider.promptForHandSelection(0, 1, actions, util.adaptListToOption(onAction), 'Play action');
        return effects.Resolution.Wait;
    }

    promptForBuy(game:game.Game, buyablePiles:cards.Pile[], allowTreasures:boolean) : effects.Resolution {
        var onBuy:cards.PurchaseCallback = (cardToBuy, treasures) => {
            _.each(treasures, _.bind(game.playTreasure, game));

            if (cardToBuy) {
                game.buyCard(cardToBuy);
            } else if (treasures.length === 0) {
                game.skipBuys();
            } else {
                game.advanceGameState();
            }
        };

        this.decider.promptForPileSelection(buyablePiles, allowTreasures, true, onBuy);
        return effects.Resolution.Wait;
    }

    promptForGain(game:game.Game, piles:cards.Pile[], onGain?:effects.CardCallback) : effects.Resolution {
        if (piles.length === 0) { throw new Error('Cannot gain from empty piles'); }

        this.decider.promptForPileSelection(piles, false, false, (gainedCard:cards.Card, treasures:cards.Card[]) => {
            game.playerGainsCard(this, gainedCard);

            if (onGain) {
                game.checkEffectResolution(onGain(gainedCard))
            } else {
                game.advanceGameState();
            }
        });
        return effects.Resolution.Wait;
    }

    promptForCardNaming(game:game.Game, onSelect:cards.PurchaseCallback) : effects.Resolution {
        this.decider.promptForPileSelection(game.kingdomPiles, false, false, onSelect);
        return effects.Resolution.Wait;
    }

    promptForPileSelection(game:game.Game, piles:cards.Pile[], onSelect:cards.PurchaseCallback) : effects.Resolution {
        this.decider.promptForPileSelection(piles, false, false, onSelect);
        return effects.Resolution.Wait;
    }

    promptForDiscard(game:game.Game, min:number, max:number, cards:cards.Card[],
                     destination:base.DiscardDestination=base.DiscardDestination.Discard,
                     onDiscard?:effects.CardsCallback) : effects.Resolution {
        this.decider.promptForHandSelection(min, max, cards, (cards) => {
            if (cards.length > 0) {
                game.discardCards(this, cards, destination);
            }
            if (onDiscard) {
                game.checkEffectResolution(onDiscard(cards));
            } else {
                game.advanceGameState();
            }
        });

        return effects.Resolution.Wait;
    }

    promptForTrashing(game:game.Game, min:number, max:number, cards:cards.Card[], onTrash?:effects.CardsCallback) : effects.Resolution {
        this.decider.promptForHandSelection(min, max, cards, (cards) => {
            if (cards.length > 0) {
                game.trashCards(this, cards);
            }

            if (onTrash) {
                game.checkEffectResolution(onTrash(cards));
            } else {
                game.advanceGameState();
            }
        });

        return effects.Resolution.Wait;
    }

    promptForHandSelection(game:game.Game, min:number, max:number, cards:cards.Card[], onSelect:effects.CardsCallback) : effects.Resolution {
        this.decider.promptForHandSelection(min, max, cards, (cards) => {
            game.checkEffectResolution(onSelect(cards));
        });
        return effects.Resolution.Wait;
    }

    promptForReaction(game:game.Game, reactions:cards.Card[], onSelect:effects.CardCallback) : effects.Resolution {
        this.decider.promptForHandSelection(0, 1, reactions, (cards) => {
            onSelect(cards.length > 0 ? cards[0] : null);
        });
        return effects.Resolution.Wait;
    }

    promptForCardOrdering(game:game.Game, cards:cards.Card[], onSelect:effects.CardsCallback) : effects.Resolution {
        if (this.hand.length == 0) {
            throw new Error('Empty hand for promptForCardOrdering');
        }
        this.decider.promptForCardOrdering(cards, onSelect);
        return effects.Resolution.Wait;
    }

    promptForDecision(game:game.Game, decision:decisions.Decision, onDecide:effects.DecisionCallback) : effects.Resolution {
        this.decider.promptForDecision(decision, d => {
            game.checkEffectResolution(onDecide(d));
        });
        return effects.Resolution.Wait;
    }

    promptForEffectChoice(game:game.Game, es:effects.LabelledEffect[], numChoices:number) : effects.Resolution {
        var decision = decisions.chooseEffect(es);
        return this.promptForDecision(game, decision, (e:effects.LabelledEffect) => {
            game.log(this.name, 'chooses', e.getLabel());
            game.pushEventsForEffect(e);
            if (numChoices <= 1) {
                return effects.Resolution.Advance;
            } else {
                return this.promptForEffectChoice(game, _.without(es, e), numChoices - 1);
            }
        });
    }

}

export = Player;