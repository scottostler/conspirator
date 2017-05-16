import * as _ from "underscore";

import { ReactionType } from './cards';
import { GameState, TurnPhase } from './base';
import { DiscardDestination, GainDestination, GainSource } from './base';
import { Card, CardInPlay, reactionTypeLabel } from './cards';
import { Effect, EffectTemplate, PlayActionEffect } from './effects';
import { Player, PlayerIdentifier } from './player';
import { listToOption } from './utils';
import Game, { GameStep } from './game';

export enum DecisionType {
    PlayAction,              // Action Phase or cloned action
    PlayTreasure,            // Buy Phase
    BuyCard,                 // Buy Phase
    GainCard,                // Buy Phase or otherwise
    DiscardCard,             // From hand, can be to deck or discard
    TrashCard,               // For optional benefit
    RevealCard,              // For Reactions
    ChooseEffect,            // Multiple can be picked. Pawn, Torturer
    OrderCards,              // For placing back onto deck
    SetAsideCard,            // For Library
    DiscardDeck,             // For Chancellor
    NameCard,                // For Wishing Well
    PassCard,                // For Masquerade
}

// Validate type of decision choices
function decisionOptionConstructor(dType: DecisionType) : any {
    switch (dType) {
        case DecisionType.PlayAction:
        case DecisionType.PlayTreasure:
        case DecisionType.DiscardCard:
        case DecisionType.TrashCard:
        case DecisionType.RevealCard:
        case DecisionType.OrderCards:
        case DecisionType.PassCard:
            return CardInPlay;
        case DecisionType.NameCard:
        case DecisionType.GainCard:
        case DecisionType.BuyCard:
            return Card;
        case DecisionType.ChooseEffect:
            return Effect
        case DecisionType.DiscardDeck:
        case DecisionType.SetAsideCard:
            return Boolean;
    }
    
    throw new Error(`Invalid decision type value: ${dType}`);
}

type DecisionFollowup<T> = (game: Game, choice: T[]) => GameStep;

class DecisionValidationError extends Error {}

export abstract class Decision<T> {
    readonly decisionType: DecisionType;
    readonly player: PlayerIdentifier;
    readonly trigger: CardInPlay | null;  // What card caused the decision, if any
    readonly minSelections: number;       // Minimum # of options to pick
    readonly maxSelections: number;       // Maximum # of options to pick
    readonly options: T[];
    readonly followup: DecisionFollowup<T>;
    
    get label() : string { return `${this.constructor.name} (${this.player})` }
    get optionConstructor() : any { return decisionOptionConstructor(this.decisionType) }

    constructor(decisionType: DecisionType, player: PlayerIdentifier, trigger: CardInPlay | null, minSelections: number, maxSelections: number, options: T[], followup: DecisionFollowup<T>) {
        this.decisionType = decisionType;
        this.player = player;
        this.trigger = trigger;
        this.minSelections = minSelections;
        this.maxSelections = maxSelections;
        this.options = options;
        this.followup = followup;

        if (this.maxSelections == 0) {
            throw new Error(`Can't create a decision with no possible options`);
        }
    }

    validateChoice(xs: any[]) {
        if (xs.length < this.minSelections) {
            throw new DecisionValidationError(`Too few choices provided for ${this.label}: ${xs.length} given, at least ${this.minSelections} required`);
        } else if (xs.length > this.maxSelections) {
            throw new DecisionValidationError(`Too many choices provided for ${this.label}: ${xs.length} given, at most ${this.maxSelections} required`);
        }

        const optionConstuctor = decisionOptionConstructor(this.decisionType);
        for (const [idx, x] of xs.entries()) {
            if (x.constructor !== optionConstuctor) {
                throw new DecisionValidationError(`Invalid choice at index ${idx} for ${this.label}: ${x} has type ${x.constructor.name}, expected ${optionConstuctor.name}`);
            }
        }
    }
}

// Concrete Decision Types

export class BinaryDecision extends Decision<boolean> {
    constructor(decisionType: DecisionType, player: PlayerIdentifier, trigger: CardInPlay | null, followup: DecisionFollowup<boolean>) {
        super(decisionType, player, trigger, 0, 1, [true, false], followup);
    }
}

export class PlayActionDecision extends Decision<CardInPlay> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay | null, cards: CardInPlay[], playCount: number = 1, normalActionPlay: boolean = true, mustPlay: boolean = false) {
        const playActionFollowup = (game: Game, choice: CardInPlay[]) : GameStep => {
            if (choice.length > 0) {
                game.playAction(choice[0], playCount, normalActionPlay);
            } else if (normalActionPlay) {
                game.turnState.phase = TurnPhase.BuyPlayTreasure;
            }
            return null;
        };
        super(DecisionType.PlayAction, player, trigger, mustPlay ? 1 : 0, 1, cards, playActionFollowup);
    }
}

export class PlayTreasureDecision extends Decision<CardInPlay> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay | null, cards: CardInPlay[]) {
        const playTreasureFollowup = (game: Game, choice: CardInPlay[]) : GameStep => {
            if (choice.length > 0) {
                for (let c of choice) {
                    game.playTreasure(c);
                }
            } else {
                game.turnState.phase = TurnPhase.BuyPurchaseCard;
            }
            return null;
        };

        super(DecisionType.PlayTreasure, player, trigger, 0, cards.length, cards, playTreasureFollowup);
    }
}

export class BuyCardDecision extends Decision<Card> {
    constructor(player: PlayerIdentifier, cards: Card[]) {
        const buyCardFollowup = (game: Game, choice: Card[]) : GameStep => {
            if (choice.length > 0) {
                game.playerBuysCard(choice[0]) ;
            } else {
                game.turnState.phase = TurnPhase.Cleanup;
            }
            return null;
        };

        super(DecisionType.BuyCard, player, null, 0, 1, cards, buyCardFollowup);
    }
}

export class GainFromPileDecision extends Decision<Card> {
    destination: GainDestination;

    constructor(player: PlayerIdentifier, trigger: CardInPlay, cards: Card[], destination: GainDestination, mustGain: boolean) {
        const gainFromPileFollowup = (game: Game, choice: Card[]) : GameStep => {
            if (choice.length > 0) {
                const playerObject = game.playerForIdentifier(this.player);
                game.playerGainsFromSupply(playerObject, choice[0], this.destination)
            }
            return null;
        };

        super(DecisionType.GainCard, player, trigger, mustGain ? 1 : 0, 1, cards, gainFromPileFollowup);
        this.destination = destination;
    }
}

export class DiscardCardDecision extends Decision<CardInPlay> {
    readonly destination: DiscardDestination;
    readonly revealFirst: boolean;

    constructor(playerId: PlayerIdentifier, trigger: CardInPlay, minSelections: number, maxSelections: number, cards: CardInPlay[], destination: DiscardDestination, followup: DecisionFollowup<CardInPlay> | null = null, revealFirst: boolean = false) {
        const baseFollowup = (game: Game, choice: CardInPlay[]) : GameStep => {
            const player = game.playerForIdentifier(playerId);
            if (revealFirst) {
                game.revealPlayerCards(player, choice);
            }
            game.discardCards(player, choice, this.destination);
            return followup ? followup(game, choice) : null;
        };
        super(DecisionType.DiscardCard, playerId, trigger, minSelections, maxSelections, cards, baseFollowup);
        this.destination = destination;
        this.revealFirst = revealFirst;
    }
}

export class TrashCardDecision extends Decision<CardInPlay> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay, minSelections: number, maxSelections: number, cards: CardInPlay[], followup?: DecisionFollowup<CardInPlay>) {
        const trashCardFollowup = (game: Game, choice: CardInPlay[]) => {
            if (choice.length > 0) {
                const playerObject = game.playerForIdentifier(player);
                game.trashCards(playerObject, choice);
            }
            return followup ? followup(game, choice) : null;
        };
        super(DecisionType.TrashCard, player, trigger, minSelections, maxSelections, cards, trashCardFollowup);
    }
}

export class SetAsideCardDecision extends Decision<boolean> {
    readonly card: CardInPlay;

    constructor(player: PlayerIdentifier, trigger: CardInPlay, card: CardInPlay, followup: DecisionFollowup<CardInPlay> | null = null) {
        const setAsideFollowup = (game: Game, choice: boolean[]) => {
            const shouldSetAside = choice[0];
            const setAsideCards = shouldSetAside ? [this.card] : [];
            if (shouldSetAside) {
                game.setAsideCard(game.playerForIdentifier(player), card);
            }
            return followup ? followup(game, setAsideCards) : null;
        };
        super(DecisionType.SetAsideCard, player, trigger, 0, 1, [true, false], setAsideFollowup);
        this.card = card;
    }
}

export class RevealReactionDecision extends Decision<CardInPlay> {
    readonly reactionType: ReactionType;
    readonly triggerEffect: PlayActionEffect;

    constructor(player: PlayerIdentifier, trigger: CardInPlay, cards: CardInPlay[], reactionType: ReactionType, triggerEffect: PlayActionEffect) {
        const revealAttackReactionFollowup = (game: Game, choice: CardInPlay[]) : GameStep => {
            if (choice.length > 0) {
                let [rxnType, effectTemplates] = choice[0].reaction;
                if (rxnType != this.reactionType) {
                    throw new Error(`Invalid ReactionType: ${rxnType} on ${choice[0].name}`);
                }

                game.queueEffect(new RevealReactionDecisionEffect(game, player, ReactionType.OnAttack, trigger, triggerEffect));

                const playerObject = game.playerForIdentifier(player);
                for (let effectTemplate of effectTemplates.reverse()) {
                    const boundEffect = effectTemplate.bindTargets(playerObject, choice[0], triggerEffect);
                    game.queueEffect(boundEffect);
                }
            }
            return null;
        };

        super(DecisionType.RevealCard, player, trigger, 0, 1, cards, revealAttackReactionFollowup);
        this.reactionType = reactionType;
        this.triggerEffect = triggerEffect;
    }
}

class RevealReactionDecisionEffect extends Effect {
    
    get label() : string {
        const player = this.game.playerForIdentifier(this.player);
        const typeLabel = reactionTypeLabel(this.reactionType); 
        return `Reveal ${typeLabel} Reactions (${player.name})`;
    }

    constructor(readonly game: Game, readonly player: PlayerIdentifier, readonly reactionType: ReactionType, readonly trigger: CardInPlay, readonly triggerEffect: PlayActionEffect) {
        super();
    }

    resolve(game: Game) : GameStep {
        const player = game.playerForIdentifier(this.player);
        const revealableCards = player.hand.ofReactionType(this.reactionType);
        if (revealableCards.length > 0) {
            return new RevealReactionDecision(this.player, this.trigger, revealableCards, this.reactionType, this.triggerEffect);
        } else {
            return null;
        }
    }
}

export class ChooseEffectDecision extends Decision<EffectTemplate> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay, effects: EffectTemplate[]) {
        super(DecisionType.ChooseEffect, player, trigger, 1, 1, effects, (game: Game, choice: EffectTemplate[]) => {
            const playerObject = game.playerForIdentifier(player);
            game.playerChoosesEffects(playerObject, effects, trigger);
            return null;
        });
    }
}

export class DiscardDeckDecision extends Decision<boolean> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay) {
        const discardFollowup = (game: Game, choice: boolean[]) : GameStep => {
            if (choice[0]) {
                const playerObject = game.playerForIdentifier(player);
                game.discardDeck(playerObject);
            }
            return null;
        };
        super(DecisionType.DiscardDeck, player, trigger, 1, 1, [true, false], discardFollowup);
    }
}

export class NameCardDecision extends Decision<Card> {
    constructor(player: PlayerIdentifier, trigger: CardInPlay, cards: Card[], followup: DecisionFollowup<Card>) {
        super(DecisionType.NameCard, player, trigger, 1, 1, cards, followup);
    }
}

export class PassCardDecision extends Decision<CardInPlay> {
    toPlayer: PlayerIdentifier;

    constructor(player: PlayerIdentifier, toPlayer: PlayerIdentifier, trigger: CardInPlay, cards: CardInPlay[]) {
        const followup = (game: Game, choice: CardInPlay[]) : GameStep => {
            if (choice.length > 0) {
                const fromPlayer = game.playerForIdentifier(this.player);
                const toPlayer = game.playerForIdentifier(this.toPlayer);
                game.playerPassesCard(fromPlayer, toPlayer, choice[0]);
            }
            return null;
        };
        super(DecisionType.PassCard, player, trigger, 1, 1, cards, followup);
        this.toPlayer = toPlayer;
    }
}
