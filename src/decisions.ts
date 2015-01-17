import base = require('./base');
import cards = require('./cards');
import effects = require('./effects');
import Player = require('./player');

import Card = cards.Card;
import DiscardDestination = base.DiscardDestination;
import GainDestination = base.GainDestination;

export var Yes = 'Yes';
export var No = 'No';

export enum DecisionType {
    PlayAction,              // Action Phase or cloned action
    PlayTreasure,            // Buy Phase
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

export interface Decision {
    decisionType:DecisionType;
    trigger:string;             // What caused the decision. Card name, 'Action Phase' or 'Buy Phase'
    minSelections:number;       // Minimum # of options to pick
    maxSelections:number;       // Maximum # of options to pick
    options:string[];
}

export interface PlayActionDecision extends Decision {
    playCount:number;
}

export interface PlayTreasureDecision extends Decision {}

export enum GainCardSource {
    Pile,   // Normal card gaining
    CardSet // e.g. Thief
}

export interface GainCardDecision extends Decision {
    gainSource:GainCardSource;
    destination:base.GainDestination;
    targetPlayer:string;
}

export interface DiscardCardDecision extends Decision {
    destination:DiscardDestination;
    targetPlayer:string;
}

export enum TrashCardSource {
    Hand,
    InPlay, // e.g. Mining Village
    CardSet // e.g. Thief
}

export interface TrashCardDecision extends Decision {
    trashFrom:TrashCardSource;
    targetPlayer:string;
}

// For OrderCardsDecision, the order of selected choices is significant.
export interface OrderCardsDecision extends Decision {}

export interface SetAsideCardDecision extends Decision {}

export interface RevealCardDecision extends Decision {}
export interface ChooseEffectDecision extends Decision {}
export interface DiscardDeckDecision extends Decision {}
export interface NameCardDecision extends Decision {}

export interface PassCardDecision extends Decision {
    toPlayer:string;
}

//---------- Helper Functions

export function makePlayActionDecision(cs:Card[]) : PlayActionDecision {
    return {
        decisionType:DecisionType.PlayAction,
        trigger:'Action Phase',
        minSelections:0,
        maxSelections:1,
        options:cards.getNames(cs),
        playCount:1
    };
}

export function makePlayMultipliedActionDecision(cs:Card[], trigger:Card, playCount:number) : PlayActionDecision {
    return {
        decisionType:DecisionType.PlayAction,
        trigger:trigger.name,
        minSelections:1, // for Throne Room
        maxSelections:1,
        options:cards.getNames(cs),
        playCount:playCount
    };
}

export function makePlayTreasureDecision(player:Player, cs:Card[]) : PlayTreasureDecision {
    return {
        decisionType:DecisionType.PlayTreasure,
        trigger:'Buy Phase',
        minSelections:0,
        maxSelections:cs.length,
        options:cards.getNames(cs),
    };
}

export function makeBuyDecision(player:Player, cs:Card[]) : GainCardDecision {
    return {
        decisionType:DecisionType.GainCard,
        trigger:'Buy Phase',
        minSelections:0,
        maxSelections:1,
        options:cards.getNames(cs),
        gainSource:GainCardSource.Pile,
        destination:base.GainDestination.Discard,
        targetPlayer:player.name
    };
}

export function makeGainDecision(player:Player, cs:Card[], trigger:Card, destination:GainDestination) : GainCardDecision {
    return {
        decisionType:DecisionType.GainCard,
        trigger:trigger.name,
        minSelections:1,
        maxSelections:1,
        options:cards.getNames(cs),
        gainSource:GainCardSource.Pile,
        destination:destination,
        targetPlayer:player.name
    };
}

export function makeGainAnyDecision(player:Player, cs:Card[], trigger:Card) : GainCardDecision {
    return {
        decisionType:DecisionType.GainCard,
        trigger:trigger.name,
        minSelections:0,
        maxSelections:cs.length,
        options:cards.getNames(cs),
        gainSource:GainCardSource.CardSet,
        destination:GainDestination.Discard,
        targetPlayer:player.name
    };
}

export function makeDiscardCardDecision(player:Player, cs:Card[], trigger:Card, min:number, max:number, destination:DiscardDestination) : DiscardCardDecision {
    return {
        decisionType:DecisionType.DiscardCard,
        trigger:trigger.name,
        minSelections:min,
        maxSelections:max,
        options:cards.getNames(cs),
        destination:destination,
        targetPlayer:player.name
    };
}

export function makeTrashCardDecision(player:Player, cs:Card[], trigger:Card, min:number, max:number, trashFrom:TrashCardSource=TrashCardSource.Hand) : TrashCardDecision {
    return {
        decisionType:DecisionType.TrashCard,
        trigger:trigger.name,
        minSelections:min,
        maxSelections:max,
        options:cards.getNames(cs),
        trashFrom:trashFrom,
        targetPlayer:player.name
    };
}

export function makeTrashInPlayCardDecision(player:Player, card:Card, trigger:Card) : TrashCardDecision {
    return {
        decisionType:DecisionType.TrashCard,
        trigger:trigger.name,
        minSelections:0,
        maxSelections:1,
        options:[card.name],
        trashFrom:TrashCardSource.InPlay,
        targetPlayer:player.name
    };

}

export function makeRevealCardDecision(cs:Card[], trigger:Card) : RevealCardDecision {
    return {
        decisionType:DecisionType.RevealCard,
        trigger:trigger.name,
        minSelections:0,
        maxSelections:1,
        options:cards.getNames(cs)
    };
}

export function makeEffectsDecision(es:effects.LabelledEffect[], trigger:Card, num:number) : ChooseEffectDecision{
    return {
        decisionType:DecisionType.RevealCard,
        trigger:trigger.name,
        minSelections:num,
        maxSelections:num,
        options:_.map(es, e => e.getLabel())
    };
}

export function makeOrderCardsDecision(cs:Card[], trigger:Card) : OrderCardsDecision {
    return {
        decisionType:DecisionType.OrderCards,
        trigger:trigger.name,
        minSelections:cs.length,
        maxSelections:cs.length,
        options:cards.getNames(cs)
    };
}

export function makeSetAsideCardDecision(card:Card, trigger:Card) : SetAsideCardDecision {
    return {
        decisionType:DecisionType.SetAsideCard,
        trigger:trigger.name,
        minSelections:0,
        maxSelections:1,
        options:[card.name]
    };
}

export function makeDiscardDeckDecision(trigger:Card) : DiscardDeckDecision {
    return {
        decisionType:DecisionType.DiscardDeck,
        trigger:trigger.name,
        minSelections:1,
        maxSelections:1,
        options:[Yes, No]
    };
}

export function makeNameCardDecision(cs:Card[], trigger:Card) : NameCardDecision {
    return {
        decisionType:DecisionType.NameCard,
        trigger:trigger.name,
        minSelections:1,
        maxSelections:1,
        options:cards.getNames(cs)
    };
}
