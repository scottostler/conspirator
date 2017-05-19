import * as _ from 'underscore';
import { assert, expect } from 'chai';

import * as util from '../src/utils';
import * as baseset from '../src/sets/baseset';
import { GainDestination } from '../src/base';
import { asNames, Card, CardGroup, CardInPlay, CardStack, difference } from '../src/cards';
import Decider from '../src/decider';
import { Decision, DecisionType, SetAsideCardDecision} from '../src/decisions';
import { Effect, EffectTemplate } from '../src/effects';
import { EventListener, GameEvent, CardsRevealedEvent } from '../src/event';
import { CardRecord } from '../src/gamerecord';
import Game from '../src/game';
import { PlayerIdentifier, Player } from '../src/player';
import { calculateScore } from '../src/scoring';

import { Copper, Estate } from '../src/sets/common';

export function duplicateCard(c: Card, n: number) : Card[] {
    return _.times<Card>(n, () => {
        return c;
    });
}

export function expectNonNull<T>(val: T | null) : T {
    if (val === null) {
        throw new Error('Expected non-null value, got null');
    }
    return val;
}

export function expectDefined<T>(val: T | undefined) : T {
    if (val === undefined) {
        throw new Error('Expected defined value, got undefined');
    }
    return val;
}

export const copperHand = duplicateCard(Copper, 5);
export const copperEstateHand = duplicateCard(Copper, 3).concat(duplicateCard(Estate, 2));
export const threeCopperHand = duplicateCard(Copper, 3);

var NumKingdomCards = 10;

// A list of action cards that only impact the game while played.
var neutralKingdomCards = [
    baseset.Cellar, baseset.Festival, baseset.Market, baseset.Laboratory,
    baseset.Library, baseset.Mine, baseset.Moneylender, baseset.Militia,
    baseset.Smithy, baseset.Village, baseset.Woodcutter];


export function neutralCardsWith(cs: Card[]) : Card[] {
    var withoutCards = difference(neutralKingdomCards, cs);
    return _.sample<Card>(withoutCards, NumKingdomCards - cs.length).concat(cs);
}

export function expectEqualCards(a: Card[], b: Card[]) {
    expect(a.map(a => a.name)).to.eql(b.map(b => b.name));
}

export function expectCardContents(a: CardGroup, b: Card[]) {
    if (a instanceof CardStack) {
        expectEqualCards(a.cards, b);
    } else {
        assert.sameMembers(asNames(a.cards), asNames(b));
    }
}

export function expectCardsContain(a: CardGroup, b: Card) {
    for (const c of a.cards) {
        if (c.isSameCard(b)) {
            return;
        }
    }
    assert.fail(undefined, undefined, `${a.label} should contain ${b.name}`);
}

export function expectCardsNotContain(a: CardGroup, b: Card) {
    for (const c of a.cards) {
        if (c.isSameCard(b)) {
            assert.fail(undefined, undefined, `${a.label} should not contain ${b.name}`);
        }
    }
}

export function expectEqualCardRecords(a: CardRecord[], b: Card[]) {
    expect(a.map(a => a.name)).to.eql(b.map(b => b.name));
}

export function expectDeckScore(cs: Card[], score: number) {
    expect(calculateScore(cs)).to.eql(score);
}

export function expectTopDeckCard(player: Player, c: Card) {
    const card = expectNonNull(player.deck.topCard);
    expect(card.name).to.equal(c.name);
}

export function expectDiscardCards(player: Player, cs: Card[]) {
    expectEqualCards(player.discard.cards, cs);
}

export function expectTopDiscardCard(player:Player, c:Card) {
    expect(player.discard.cards).to.have.length.of.at.least(1);
    expect(expectDefined(_.last(player.discard.cards)).name).to.equal(c.name);
}

export function expectTopTrashCard(game: Game, c: Card) {
    expect(game.trash.cards).to.have.length.of.at.least(1);
    expect(expectDefined(_.last(game.trash.cards)).name).to.eql(c.name, 'Top card of trash should be ' + c.name);
}

export function expectActionCount(game: Game, count: number) {
    expect(game.turnState.actionCount).to.eql(count, 'Action count should be ' + count);
}

export function expectBuyCount(game: Game, count: number) {
    expect(game.turnState.buyCount).to.eql(count, 'Buy count should be ' + count);
}

export function expectCoinCount(game: Game, count: number) {
    expect(game.turnState.coinCount).to.eql(count, 'Coin count should be ' + count);
}

export function expectPlayerHandSize(player: Player, size: number) {
    expect(player.hand.count).to.be.eql(size, player.name + ' should have hand size of ' + size);
}

export class TestGameListener implements EventListener {
    revealedCardQueue: CardRecord[][];

    constructor() {
        this.revealedCardQueue = [];
    }

    handleEvent(event: GameEvent) {
        if (event instanceof CardsRevealedEvent) {
            this.revealedCardQueue.push(event.cards);
        }
    }
}

export function expectRevealedCards(game: Game, cs: Card[]) {
    const testListener = <TestGameListener>game.eventEmitter.eventListeners.find(l => l instanceof TestGameListener);
    if (!testListener) {
        throw new Error('Missing TestingGameListener');
    }

    expect(testListener.revealedCardQueue).to.be.not.empty;
    const revealed = expectDefined(testListener.revealedCardQueue.shift());
    assert.sameMembers(cs.map(c => c.name), revealed.map(c => c.name));
}

export class TestDecider {

    constructor(readonly game: Game, readonly player : PlayerIdentifier) {}
    
    get label() { return `TestDecider ${this.player}`; }

    get pendingDecision() : Decision<any> | null {
        if (this.game.pendingDecision && this.game.pendingDecision.player == this.player) {
            return this.game.pendingDecision;
        } else {
            return null;
        }
    }

    hasSelectionCounts(minSelections: number, maxSelections: number) {
        if (!this.pendingDecision) { throw new Error(`No pending decision`); }

        expect(this.pendingDecision.minSelections).to.eql(minSelections);
        expect(this.pendingDecision.maxSelections).to.eql(maxSelections);
    }

    expectPendingDecisionType(d: DecisionType) {
        const dType = DecisionType[d];
        if (!this.pendingDecision) {
            const gameD = this.game.pendingDecision;
            if (gameD) {
                throw new Error(`No pending ${dType} decision for ${this.label}, but game has pending decision ${gameD.label}`);
            } else {
                throw new Error(`No pending ${dType} decision for ${this.label}`);
            }
        } else if (this.pendingDecision.player !== this.player) {
            throw new Error(`Pending decision ${this.pendingDecision.label} exists, but decider for ${this.player} was called`);
        }

        expect(DecisionType[this.pendingDecision.decisionType]).to.eql(
            DecisionType[d], 'Wrong decision type');
    }

    private makeBooleanDecision(d: DecisionType, result: boolean) {
        this.expectPendingDecisionType(d);
        this.game.resolveDecision([result]);
        this.game.advanceToNextDecision();
    }

    discardDeck(result: boolean) {
        this.makeBooleanDecision(DecisionType.DiscardDeck, result);
    }

    setAsideCard(result: boolean, card: Card) {
        this.expectPendingDecisionType(DecisionType.SetAsideCard);
        
        const decision = (<SetAsideCardDecision>this.pendingDecision);
        assert.equal(decision.card.name, card.name, `Unxpected card for SetAsideCardDecision`);

        this.makeBooleanDecision(DecisionType.SetAsideCard, result);
    }

    private makeEffectsDecision(es: EffectTemplate[]) {
        this.expectPendingDecisionType(DecisionType.ChooseEffect);
        this.game.resolveDecision(es);
        this.game.advanceToNextDecision();
    }

    // Matches Cards to CardInPlays by name
    private matchInPlayCards(input: Card[], target: CardInPlay[]) : CardInPlay[] {
        const targetCopy = target.slice();
        const result = new Array<CardInPlay>();

        for (const [inputIdx, card] of input.entries()) {
            let matchIdx: number;
            if (card instanceof CardInPlay) {
                matchIdx = targetCopy.findIndex((v, _) => v.isExactCard(card));
            } else if (card instanceof Card) {
                matchIdx = targetCopy.findIndex((v, _) => v.isSameCard(card));
            } else {
                throw new Error(`Unexpected argument: ${card}`);
            }

            if (matchIdx == -1) {
                const decision = this.pendingDecision;
                if (decision) {
                    throw new Error(`Can't match ${asNames(input, true)} to ${asNames(target, true)} for ${decision.label}: no match for ${card.debugDescription} at index ${inputIdx}`);
                } else {
                    throw new Error(`Can't match ${asNames(input, true)} to ${asNames(target, true)}: no match for ${card.debugDescription} at index ${inputIdx}`);
                }
            }

            const val = targetCopy[matchIdx];
            result.push(val);
            targetCopy.splice(matchIdx, 1);
        }

        return result;
    }

    makeCardsDecision(d: DecisionType, cs: Card[]) {
        this.expectPendingDecisionType(d);
        const decision = this.pendingDecision!;

        let matchedCards: Card[];
        if (decision.optionConstructor === CardInPlay) {
            matchedCards = this.matchInPlayCards(cs, decision.options);
        } else {
            matchedCards = cs;
        }

        this.game.resolveDecision(matchedCards);
        this.game.advanceToNextDecision();
    }

    makeCardDecision(d: DecisionType, card: Card | null) {
        if (card === null) {
            this.makeCardsDecision(d, []);
        } else if (card instanceof Card) {
            this.makeCardsDecision(d, [card]);            
        } else {
            throw new Error(`Invalid card argument: ${card}`);
        }
    }

    playAction(card: Card) {
        this.makeCardDecision(DecisionType.PlayAction, card);
    }

    playTreasures(cs: Card[]) {
        this.makeCardsDecision(DecisionType.PlayTreasure, cs);
    }

    canGain(cs: Card[]) {
        expect(this.pendingDecision).not.to.be.null;
        const decision = this.pendingDecision!;
        assert.equal(DecisionType[decision.decisionType], DecisionType[DecisionType.GainCard]);
        assert.sameMembers(asNames(decision.options), asNames(cs));
    }

    gainCard(card: Card | null) {
        this.makeCardDecision(DecisionType.GainCard, card);
    }

    buyCard(card: Card | null) {
        this.makeCardDecision(DecisionType.BuyCard, card);
    }

    discardCards(cs: Card[]) {
        this.makeCardsDecision(DecisionType.DiscardCard, cs);
    }

    discardCard(c: Card | null) {
        this.makeCardDecision(DecisionType.DiscardCard, c);
    }

    trashCard(c: Card | null) {
        this.makeCardDecision(DecisionType.TrashCard, c);
    }

    trashCards(cs: Card[]) {
        this.makeCardsDecision(DecisionType.TrashCard, cs);
    }

    revealCard(c: Card | null) {
        this.makeCardDecision(DecisionType.RevealCard, c);
    }

    nameCard(c: Card) {
        this.makeCardDecision(DecisionType.NameCard, c);
    }

    chooseEffect(e: EffectTemplate) {
        this.makeEffectsDecision(e !== null ? [e] : []);
    }

    chooseEffects(es: EffectTemplate[]) {
        this.makeEffectsDecision(es);
    }

    orderCards(cs: Card[]) {
        this.makeCardsDecision(DecisionType.OrderCards, cs);
    }

    passCard(c: Card) {
        this.makeCardDecision(DecisionType.PassCard, c);
    }
}

class TestGame extends Game {

    skipInitialDraws: PlayerIdentifier[] = [];

    drawInitialHands() {
        for (const player of this.players) {
            // May already be populated in tests or other artificial scenarios
            if (!this.skipInitialDraws.includes(player.identifier)) {
                this.drawCards(player, 5);
            }
        }
    }

    setPlayerHand(player: Player, cards: Card[]) {
        this.skipInitialDraws.push(player.identifier);
        const vended = this.vendStartingCards(cards);
        player.hand.dropAllCards();
        player.hand.setCards(vended);
    }

    setPlayerDeck(player: Player, cards: Card[]) {
        const vended = this.vendStartingCards(cards);
        player.deck.dropAllCards();
        player.deck.setCards(vended);
    }
}

export function setupTwoPlayerGame(h1: Card[] | null = null, h2: Card[] | null = null, kingdom: Card[] = []) : [TestGame, TestDecider, TestDecider] {
    const game = new TestGame(['Player 1', 'Player 2'], neutralCardsWith(kingdom));
    game.eventEmitter.addEventListener(new TestGameListener());
    
    if (h1 !== null) {
        game.setPlayerHand(game.players[0], h1);
    }

    if (h2 !== null) {
        game.setPlayerHand(game.players[1], h2);
    }

    return [game, new TestDecider(game, 'Player 1'), new TestDecider(game, 'Player 2')];
}

export function setupThreePlayerGame(h1: Card[] | null = null, h2: Card[] | null = null, h3: Card[] | null = null, kingdom: Card[] = []) : [TestGame, TestDecider, TestDecider, TestDecider] {
    const game = new TestGame(['Player 1', 'Player 2', 'Player 3'], neutralCardsWith(kingdom));
    game.eventEmitter.addEventListener(new TestGameListener());
    
    if (h1 !== null) {
        game.setPlayerHand(game.players[0], h1);
    }

    if (h2 !== null) {
        game.setPlayerHand(game.players[1], h2);
    }

    if (h3 !== null) {
        game.setPlayerHand(game.players[2], h3);
    }

    return [game, new TestDecider(game, 'Player 1'), new TestDecider(game, 'Player 2'), new TestDecider(game, 'Player 3')];
}
