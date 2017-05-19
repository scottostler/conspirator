import { nextInRing } from './utils';
import * as _ from 'underscore';

import * as utils from './utils';
import { CardType, DiscardDestination, DiscardSource, GainDestination,
         GainSource, GameState, RevealSource, TrashSource, TurnPhase } from './base';
import { AllKingdomCards } from './sets/cardlist';
import {
    asNames,
    Card,
    CardGroup,
    CardGroupType,
    CardInPlay,
    CardStack,
    randomizedKingdomCards,
    ReactionType,
    removeFirst,
    removeIdentical,
    SupplyPile
} from './cards';
import { defaultStartingDeck, generateDefaultPiles, Province } from './sets/common';
import Decider from './decider';
import * as decisions from './decisions';
import { Decision, DecisionType } from './decisions';

import { Effect, EffectTemplate, PlayActionEffect, Target } from './effects';
import { EventEmitter, EventListener } from './event';
import { Player, PlayerIdentifier } from './player';
import { calculateScore } from './scoring';
import TurnState from './turnstate';

const NumKingdomCards = 10;
const HandSize = 5;
const ShufflePlayerStartingDecks = true;

export type GameStep = Decision<any> | Effect | null;

class Game {

    readonly players: Player[];
    readonly kingdomPiles: SupplyPile[];

    readonly trash = new CardGroup(null, CardGroupType.Trash);
    readonly setAside = new CardGroup(null, CardGroupType.SetAside);
    readonly inPlay = new CardStack(null, CardGroupType.InPlay);

    readonly effectStack: Effect[] = [];
    hasGameStarted: boolean = false;
    hasGameEnded: boolean = false;

    activePlayerIndex: number = -1;
    turnState: TurnState;
    turnCount: number = 0;
    emptyPilesToEndGame: number;

    pendingDecision: Decision<any> | null = null;

    readonly eventEmitter: EventEmitter = new EventEmitter();

    printLog = false;
    printDebugLog = false;
    
    constructor(playerNames: string[], forcedKingdomCards: Card[] = []) {
        const kingdomCards = randomizedKingdomCards(forcedKingdomCards, AllKingdomCards, NumKingdomCards);
        const startingDeck = defaultStartingDeck();

        this.players = playerNames.map(name => {
            let deck = this.vendStartingCards(startingDeck);
            
            if (ShufflePlayerStartingDecks) {
                deck = _.shuffle<CardInPlay>(deck);
            }

            return new Player(name, deck);
        });

        this.emptyPilesToEndGame = this.players.length >= 5 ? 4 : 3;
        this.kingdomPiles = generateDefaultPiles(kingdomCards, this.players.length);
    }

    assertGameIsActive() {
        if (!this.hasGameStarted || this.hasGameEnded) {
            throw new Error('Game is not active');
        }
    }

    drawInitialHands() {
        for (const player of this.players) {
            this.drawCards(player, HandSize);
        }
    }

    gameState() : GameState {
        return {
            activePlayer: this.activePlayer.name,
            turnCount: this.turnCount,
            turnState: this.turnState
        };
    }

    isGameOver() : boolean {
        const provincePile = this.pileForCard(Province);
        if (provincePile.count === 0) {
            return true;
        }

        let emptyCount = 0;
        for (const pile of this.kingdomPiles) {
            if (pile.count === 0) {
                emptyCount++;
            } 
        }

        if (emptyCount >= this.emptyPilesToEndGame) {
            return true;
        }

        return false;
    }

    get activePlayer(): Player {
        return this.players[this.activePlayerIndex];
    }

    get inactivePlayers(): Player[] {
        return this.playersAsideFrom(this.activePlayer);
    }

    get decidingPlayerIndex(): number {
        if (!this.pendingDecision) {
            throw new Error('No pending decision');
        }

        const player = this.playerForIdentifier(this.pendingDecision.player);
        return this.players.indexOf(player);
    }

    isActivePlayer(player: Player) : boolean {
        return this.activePlayer === player;
    }

    playersAsideFrom(player: Player) {
        const index = this.players.indexOf(player);
        if (index > -1) {
            return this.players.slice(index + 1).concat(
                this.players.slice(0, index));
        } else {
            throw new Error('Unable to find player ' + player.name);
        }
    }

    playerLeftOf(player: Player) : Player {
        return nextInRing(this.players, player);
    }

    // Phases

    beginNewTurn() {
        if (this.isGameOver()) {
            this.hasGameEnded = true;
            this.endGame();
            return;
        }

        if (this.setAside.count > 0) {
            throw new Error(`Ending turn with uncleared set aside cards: ${this.setAside.cards.join(', ')}`);
        }

        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
        this.turnState = new TurnState();

        if (this.activePlayerIndex == 0) {
            this.turnCount++;
        }

        this.log(`=== Turn ${this.turnCount} - ${this.activePlayer.name} ===`);
    }

    handleActionPhase() : GameStep {
        const playableActions = this.currentlyPlayableActions();

        if (playableActions.length == 0) {
            this.turnState.phase = TurnPhase.BuyPlayTreasure;
            return this.advanceGameState();
        }

        return new decisions.PlayActionDecision(this.activePlayer.identifier, null, playableActions);
    }

    handleBuyPlayTresaurePhase() : GameStep {
        const treasures = this.activePlayer.hand.ofType(CardType.Treasure);
        if (treasures.length == 0) {
            this.turnState.phase = TurnPhase.BuyPurchaseCard;
            return this.advanceGameState();
        }
        return new decisions.PlayTreasureDecision(this.activePlayer.identifier, null, treasures);
    }

    handleBuyGainCardPhase() : GameStep {
        const buyableCards = this.currentlyBuyablePiles().map(p => p.card);
        if (this.turnState.buyCount == 0) {
            this.turnState.phase = TurnPhase.Cleanup;
            return this.advanceGameState();
        } 

        return new decisions.BuyCardDecision(this.activePlayer.identifier, buyableCards);
    }

    handleCleanupPhase() : GameStep {
        if (!this.inPlay.empty) {
            this.moveCards(this.inPlay.cards, this.activePlayer.discard);
        }

        this.discardHand(this.activePlayer);
        this.drawCards(this.activePlayer, HandSize);

        this.beginNewTurn();

        if (this.hasGameEnded) {
            return null;
        } else {
            return this.advanceGameState();
        }
    }

    // Revealing

    revealPlayerCards(player: Player, cards: CardInPlay[]) {
        if (cards.length > 0) {
            this.log(`${player.name} reveals ${asNames(cards)}`);
            this.eventEmitter.playerRevealsCards(player, cards, RevealSource.Hand);
        }
    }

    revealPlayerHand(player: Player) {
        this.revealPlayerCards(player, player.hand.cards);
    }

    // Players

    playerForIdentifier(identifier: PlayerIdentifier) : Player {
        for (let player of this.players) {
            if (player.identifier === identifier) {
                return player;
            }
        }
        throw new Error('No player found for identifier ' + identifier);
    }

    playersForTarget(target: Target, choosingPlayer?: Player) : Player[] {
        switch (target) {
            case Target.ActivePlayer:
                return [this.activePlayer];
            case Target.OtherPlayers:
                return this.inactivePlayers;
            case Target.AllPlayers:
                return [this.activePlayer].concat(this.inactivePlayers);
            case Target.ChoosingPlayer:
                if (choosingPlayer) {
                    return [choosingPlayer];
                } else {
                    throw new Error('ChoosingPlayer not provided');
                }
        }
    }

    // Game state advancement

    private processGameStep(gameStep: GameStep) {
        if (gameStep instanceof Effect) {
            this.queueEffect(gameStep);
        } else if (gameStep instanceof Decision) {
            this.queueDecision(gameStep);
        } else {
            // Nothing
        }
    }

    private processQueuedEffect() : GameStep {
        let effect = this.dequeueEffect();
        if (!effect) {
            throw new Error(`processQueuedEffect called with empty effect queue`);
        }

        this.debug(`Resolving effect: ${effect.label}`);
        return effect.resolve(this);
    }

    advanceGameState() : GameStep {
        this.assertGameIsActive();

        if (this.pendingDecision) {
            throw new Error(`advanceGameState(): pending decision already exists: ${this.pendingDecision.label}`);
        }

        if (this.hasQueuedEffect) {
            return this.processQueuedEffect();
        }

        switch (this.turnState.phase) {
            case TurnPhase.Action:
                return this.handleActionPhase();
            case TurnPhase.BuyPlayTreasure:
                return this.handleBuyPlayTresaurePhase();
            case TurnPhase.BuyPurchaseCard:
                return this.handleBuyGainCardPhase();
            case TurnPhase.Cleanup:
                return this.handleCleanupPhase();
        }
    }

    advanceToNextDecision() {
        this.assertGameIsActive();

        if (this.pendingDecision) {
            return;
        }

        while (!this.hasGameEnded) {
            const gameStep = this.advanceGameState();
            this.processGameStep(gameStep);
            if (this.pendingDecision) {
                return;
            }
        }
    }

    // Effect handling

    queueEffect(e: Effect) {
        this.effectStack.push(e);
    }

    dequeueEffect() : Effect | null {
        return this.effectStack.pop() || null;
    }

    get hasQueuedEffect() : boolean {
        return this.effectStack.length > 0;
    }

    queueEffectsForTemplate(template: EffectTemplate, trigger: CardInPlay, ignoredPlayers: PlayerIdentifier[] = []) {
        // Effects should be queued starting with the last to resolve, i.e. reverse order
        const players = this.playersForTarget(template.target);
        for (let p of players.reversed()) {
            if (!ignoredPlayers.includes(p.identifier)) {
                this.queueEffect(template.bindTargets(p.identifier, trigger));
            }
        }
    }

    queueEffectsForTemplates(templates: EffectTemplate[], trigger: CardInPlay, ignoredPlayers: PlayerIdentifier[]) {
        for (const template of templates.reversed()) {
            this.queueEffectsForTemplate(template, trigger, ignoredPlayers);
        }
    }

    // Used by cards like Steward and Torturer
    playerChoosesEffects(player: Player, effects: EffectTemplate[], trigger: CardInPlay) {
        const labels = effects.map(e => e.label).join(', ');
        this.debug(`${player.name} chooses ${labels}`);

        // Effects should be queued starting with the last to resolve, i.e. reverse order

        for (let e of effects.reversed()) {
            const players = this.playersForTarget(e.target, player).reversed();
            for (let p of players) {
                this.queueEffect(e.bindTargets(p.identifier, trigger));
            }
        }
    }

    // Decision handling

    queueDecision(decision: Decision<any>) {
        if (this.pendingDecision !== null) {
            throw new Error(`Can't queue decision ${decision.label}, already existing decision ${this.pendingDecision.label}`);
        }
        this.pendingDecision = decision;
    }

    resolveDecision(choice: any[]) {
        if (!this.pendingDecision) {
            throw new Error('Cannot resolve decision: pendingDecision is null');
        }

        const decision = this.pendingDecision;
        decision.validateChoice(choice);

        this.pendingDecision = null;

        const gameStep = decision.followup(this, choice);
        this.processGameStep(gameStep);
    }


    // Game-state changes

    playAction(card: CardInPlay, playCount: number = 1, normalActionPlay: boolean = true) {
        if (normalActionPlay && this.turnState.actionCount <= 0) {
            throw new Error('Unable to play ' + card.name + ' with action count ' + this.turnState.actionCount);
        }

        if (normalActionPlay) {
            this.turnState.actionCount--;
        }

        this.turnState.playedActionCount++;
        this.moveCard(card, this.inPlay);

        for (let i = 0; i < playCount; i++) {
            this.queueEffect(PlayActionEffect.initialPlay(card, this));
        }

        this.log(`${this.activePlayer.name} plays ${card.name}`);
        this.eventEmitter.playerPlayedCard(this.activePlayer, card, true);
    }

    playTreasure(card: CardInPlay) {
        this.moveCard(card, this.inPlay);
        this.turnState.coinCount += card.money;

        if (card.moneyEffect) {
            this.queueEffect(card.moneyEffect.bindTargets(this.activePlayer.identifier, card));
        }

        this.log(`${this.activePlayer.name} plays ${card.name}`);
        this.eventEmitter.playerPlayedCard(this.activePlayer, card, true);
    }

    playerBuysCard(card: Card) : GameStep {
        const cost = this.effectiveCardCost(card);
        const pile = this.pileForCard(card);

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
        this.turnState.cardBought = true;
        
        this.log(`${this.activePlayer.name} buys ${card.name}`);
        this.eventEmitter.playerBuysCard(this.activePlayer, card);
        
        return this.playerGainsFromSupply(this.activePlayer, card);
    }

    playerGainsFromSupply(player: Player, card: Card,  destination: GainDestination=GainDestination.Discard) : GameStep {
        const pile = this.pileForCard(card);
        const gainedCard = this.vendCardFromPile(pile);
        const cardGroup = player.cardGroupForGainDestination(destination);
        this.moveCard(gainedCard, cardGroup);

        this.log(`${player.name} gains ${card.name}`);
        this.eventEmitter.playerGainedCards(player, [gainedCard], GainSource.Pile, destination);

        return null; // TODO: on-gain reactions like Watchtower will trigger a decision
    }

    // Card moving

    moveCard(card: CardInPlay, destination: CardGroup) {
        if (!(card instanceof CardInPlay)) {
            throw new Error(`moveCard: invalid argument ${card} called for destination ${destination.toString()}`);
        }

        if (card.location) {
            card.location.removeCard(card);
        }
        destination.insertCard(card);
    }

    moveCardToBottom(card: CardInPlay, destination: CardStack) {
        if (card.location) {
            card.location.removeCard(card);
        }
        destination.insertCard(card);
    }

    moveCards(cards: CardInPlay[], destination: CardGroup) {
        for (let c of cards) {
            this.moveCard(c, destination);
        }
    }

    moveCardsToBottom(cards: CardInPlay[], destination: CardStack) {
        for (let c of cards.reversed()) {
            this.moveCardToBottom(c, destination);
        }
    }

    playerPassesCard(sourcePlayer: Player, targetPlayer: Player, card: CardInPlay) {
        this.moveCard(card, targetPlayer.hand);

        this.log(`${sourcePlayer.name} passes a card to ${targetPlayer.name}`);
        this.eventEmitter.playerPassedCard(sourcePlayer, targetPlayer, card);
    }

    discardHand(player: Player) {
        if (!player.hand.empty) {
            this.discardCards(player, player.hand.cards);
        }
    }

    discardCards(player: Player, cards: CardInPlay[], destination: DiscardDestination = DiscardDestination.Discard) {
        const destinationGroup = player.cardGroupForDiscardDestination(destination);
        this.moveCards(cards, destinationGroup);
        
        this.log(`${player.name} discards ${cards.map(c => c.name).join(', ')}`);
        this.eventEmitter.playerDiscardedCards(player, cards, DiscardSource.Hand, destination);
    }

    trashCards(player: Player, cards: CardInPlay[]) {
        this.moveCards(cards, this.trash);
        
        this.log(`${player.name} trashes ${cards.map(c => c.name).join(', ')}`);
        this.eventEmitter.playerTrashedCards(player, cards, TrashSource.Hand);
    }

    //// Methods to increment active player's turn counts.

    incrementActionCount(n:number) {
        this.assertGameIsActive();
        this.turnState.actionCount += n;
    }

    incrementBuyCount(n:number) {
        this.assertGameIsActive();
        this.turnState.buyCount += n;
    }

    incrementCoinCount(n:number) {
        this.assertGameIsActive();
        this.turnState.coinCount += n;
    }

    incrementCardDiscount(n:number) {
        this.assertGameIsActive();
        this.turnState.cardDiscount += n;
    }

    //// Card management methods

    drawCards(player: Player, num: number) {
        if (player.deck.count < num) {
            player
        }

        const cards = player.topCardsOfDeck(this, num);
        this.moveCards(cards, player.hand);

        this.log(`${player.name} draws ${num} ${utils.pluralize('card', num)}`);
        this.eventEmitter.playerDrewCards(player, cards);
    }

    setAsideCard(player: Player, card: CardInPlay) {
        this.log(`${player.name} sets aside ${card.name}`);
        this.moveCard(card, this.setAside);
    }

    discardDeck(player: Player) {
        this.discardFromDeck(player, player.deck.count);
    }

    discardFromDeck(player: Player, num: number) : CardInPlay[] {
        const cards = player.topCardsOfDeck(this, num);

        if (cards.length > 0) {
            this.moveCards(cards, player.discard);
        }

        return cards;
    }
    
    revealCardFromDeck(player: Player) : CardInPlay | null {
        const card = player.topCardOfDeck(this);
        if (card) {
            this.revealPlayerCards(player, [card]);
        }
        return card;
    }

    filterGainablePiles(minCost: number, maxCost: number, cardType = CardType.All) : SupplyPile[] {
        return this.kingdomPiles.filter(pile => {
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

    // Convenience functions

    currentlyPlayableActions() : CardInPlay[] {
        if (this.turnState.actionCount == 0) {
            return [];
        } else {
            return this.activePlayer.hand.ofType(CardType.Action);
        }
    }

    get buyablePiles() : SupplyPile[] {
        return this.kingdomPiles.filter(pile => {
            return pile.count > 0;
        });
    }

    /// Returns all cards in game for card naming.
    allCardsInGame() : Card[] {
        let cards: Card[] = [];
        for (const pile of this.kingdomPiles) {
            cards.push(pile.card);
        }
        return cards;
    }

    pileForCard(card: Card) : SupplyPile {
        for (const pile of this.kingdomPiles) {
            if (pile.card.name === card.name) {
                return pile;
            }
        }

        throw new Error('No pile for card ' + card.name);
    }

    effectiveCardCost(card: Card) : number {
        return Math.max(card.cost - this.turnState.cardDiscount, 0);
    }

    currentlyBuyablePiles() : SupplyPile[] {
        if (this.turnState.buyCount == 0) {
            return [];
        } else {
            return this.buyablePiles.filter(pile => {
                return this.effectiveCardCost(pile.card) <= this.turnState.coinCount;
            });
        }
    }

    // Card vending

    generateCardIdentifier(card: Card) : string {
        return utils.Guid.newGuid();
    } 

    vendStartingCards(cards: Card[]) : CardInPlay[] {
        return cards.map(c => new CardInPlay(c, this.generateCardIdentifier(c)));
    }

    vendCardFromPile(pile: SupplyPile) : CardInPlay {
        if (pile.count <= 0) {
            throw new Error('Unable to gain from empty pile');
        }

        pile.count--;
        return new CardInPlay(pile.card, this.generateCardIdentifier(pile.card));
    }

    // Blast off!

    async completeWithDeciders(deciders: Decider[]) {
        try {
            if (deciders.length !== this.players.length) {
                throw new Error(`Must provide ${this.players.length} deciders`);
            }

            this.start();

            while (this.pendingDecision !== null) {
                const decider = deciders[this.decidingPlayerIndex];
                const promise = decider.decide(this.pendingDecision);
                
                const answer = await promise;
                this.resolveDecision(answer);
                this.advanceToNextDecision();
            }
        } catch (err) {
            console.error("An exception occured while executing game logic. This likely indicates a bug!");
            console.error(err);
        }
    }

    start() {
        if (this.hasGameStarted) {
            throw new Error("Cannot start game twice");
        }

        this.hasGameStarted = true;
        this.drawInitialHands();
        this.beginNewTurn();
        this.advanceToNextDecision();
    }

    endGame() {
        this.log('=== Game Over ===');

        for (const player of this.players) {
            const score = calculateScore(player.getFullDeck());
            this.log(`${player} has ${score} VP`);
        }

        const fullDecks = this.players.map(p => p.getFullDeck());
        this.eventEmitter.gameEnds();
    }

    // Misc

    // Output text message by converting arguments to strings.
    log(...args: any[]) {
        if (this.printLog) {
            const msg = Array(args).join(' ');
            console.log(msg);
        }
    }

    debug(...args: any[]) {
        if (this.printDebugLog) {
            const msg = Array(args).join(' ');
            console.log(msg);
        }
    }
}

export default Game;
