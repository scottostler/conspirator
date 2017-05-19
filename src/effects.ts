import * as _ from 'underscore';

import { CardType, DiscardDestination, GainDestination, GameState } from './base';
import { Card, CardInPlay, CardPredicate, ReactionType } from  './cards';
import { Decision } from './decisions';
import * as decisions from './decisions';
import Game, { GameStep } from './game';
import { Player, PlayerIdentifier } from './player';
import { labelRange, pluralize } from './utils';

export abstract class VPEffect {
    abstract calculatePoints(deck: Card[]) : number;
}

// TODO?: replace ChoosingPlayer with dynamic 'active player' rule
export enum Target {
    ActivePlayer,  // Either the player taking their turn, or revealing the reaction
    OtherPlayers,
    AllPlayers,
    ChoosingPlayer // For use with EffectChoiceEffect
}

export function labelForTarget(target: Target) : string {
    switch (target) {
        case Target.ActivePlayer: return 'Active Player';
        case Target.OtherPlayers: return 'Opponents';
        case Target.AllPlayers: return 'All Players';
        // See ? about Choosing Player
        case Target.ChoosingPlayer: return 'Choosing Player';
    }
}

// An effect is a function wrapper that can modify the game state,
// trigger player decisions, and queue additional effects to be resolved.
export abstract class Effect {
    abstract get label() : string;
    abstract resolve(game: Game) : GameStep;
}

// Kingdom card behavior are defined with EffectTemplates.
// To resolve an EffectTemplate, a target player and trigger card
// must be provided.
export abstract class EffectTemplate {
    abstract get target() : Target;
    abstract get label() : string;

    bindTargets(player: PlayerIdentifier, trigger: CardInPlay) : Effect {
        return new TargetedEffectTemplate(this, player, trigger);
    }

    abstract resolve(game: Game, target: Player, trigger: CardInPlay) : GameStep;
}

export class TargetedEffectTemplate extends Effect {

    get label() : string {
        return `${this.template.label} (${this.player})`
    }

    constructor(readonly template: EffectTemplate, readonly player: PlayerIdentifier, readonly trigger: CardInPlay) {
        super();
    }

    resolve(game: Game) : GameStep {
        const player = game.playerForIdentifier(this.player);
        return this.template.resolve(game, player, this.trigger);
    }
}

export abstract class AttackReactionEffectTemplate {
    abstract get label() : string;
    abstract resolve(game: Game, target: Player, trigger: CardInPlay, actionEffect: PlayActionEffect) : GameStep;

    bindTargets(target: Player, trigger: CardInPlay, actionEffect: PlayActionEffect) : Effect {
        return new TargetedReactionEffectTemplate(this, target, trigger, actionEffect);
    }
}

export class TargetedReactionEffectTemplate extends Effect {
    get label() : string {
        return `${this.template.label} (${this.target.name})`;
    }

    constructor(public template: AttackReactionEffectTemplate, public target: Player, public trigger: CardInPlay, public actionEffect: PlayActionEffect) {
        super();
    }

    resolve(game: Game) : GameStep {
        return this.template.resolve(game, this.target, this.trigger, this.actionEffect);
    }
}

export class PlayActionEffect extends Effect {
    
    // Card being played
    card: CardInPlay;

    // Players able to reveal reaction cards.
    pendingPlayers: PlayerIdentifier[];

    // Players immune to card's effects.
    immunePlayers: PlayerIdentifier[];

    constructor(card: CardInPlay, pendingPlayers: PlayerIdentifier[], immunePlayers: PlayerIdentifier[]) {
        super();
        this.card = card;
        this.pendingPlayers = pendingPlayers;
        this.immunePlayers = immunePlayers;
    }

    static initialPlay(card: CardInPlay, game: Game) : PlayActionEffect {
        let pendingPlayers = card.isAttack ? game.inactivePlayers.map(p => p.identifier) : [];
        return new PlayActionEffect(card, pendingPlayers, []);
    }

    get label() : string { return `Play ${this.card.name}`; }

    resolve(game: Game) : GameStep {
        if (this.pendingPlayers.length == 0) {
            for (let effectTemplate of this.card.effects.reversed()) {
                game.queueEffectsForTemplate(effectTemplate, this.card, this.immunePlayers);
            }
            return null;
        } else {
            const playerToReveal = this.pendingPlayers[0];
            const remainingPlayers = this.pendingPlayers.slice(1);
            const nextPlayActionEffect = new PlayActionEffect(this.card, remainingPlayers, this.immunePlayers.slice());
            game.queueEffect(nextPlayActionEffect);

            const playerObject = game.playerForIdentifier(playerToReveal);
            const reactions = playerObject.hand.ofReactionType(ReactionType.OnAttack);

            if (reactions.length > 0) {
                return  new decisions.RevealReactionDecision(playerToReveal, this.card, reactions, ReactionType.OnAttack, nextPlayActionEffect);
            } else {
                return null;
            }
        }
    }

    // Track when a Moat is revealed in response to an attack card being played
    giveAttackImmunity(player: PlayerIdentifier) {
        if (!this.immunePlayers.includes(player)) {
            this.immunePlayers.push(player);
        }
    }
}
