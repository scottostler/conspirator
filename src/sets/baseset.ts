import _ = require('underscore');
import base = require('../base');
import cards = require('../cards');
import decisions = require('../decisions');
import effects = require('../effects');
import Game = require('../game');
import Player = require('../player');
import util = require('../util');

import DiscardDestination = base.DiscardDestination;
import GainDestination = base.GainDestination;
import TrashCardSource = decisions.TrashCardSource;
import e = effects;
import Effect = e.Effect;
import VPEffect = e.VPEffect;
import Resolution = e.Resolution;
import Target = e.Target;

export var SetName = 'Base';

class LibraryDrawEffect implements Effect {

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var discardType = cards.Type.Action;
        var targetHandSize = 7;

        // TODO?: use 'repeat' Resolution to simplify
        var isDone = function() {
            return !player.canDraw() || player.hand.length >= targetHandSize;
        };

        var drawCardEvent = () => {
            if (isDone()) {
                game.discardSetAsideCards(player);
                return Resolution.Advance;
            }

            var takenCard = player.takeCardFromDeck();
            if (takenCard.matchesType(discardType)) {
                var decision = decisions.makeSetAsideCardDecision(takenCard, trigger);
                return player.promptForCardDecision(decision, cs => {
                    if (cs.length > 0) {
                        game.setAsideCard(player, takenCard);
                    } else {
                        game.drawTakenCard(player, takenCard);
                    }

                    game.pushEvent(drawCardEvent);
                    return Resolution.Advance;
                });
            } else {
                game.drawTakenCard(player, takenCard);
                game.pushEvent(drawCardEvent);
                return Resolution.Advance;
            }
        };

        game.pushEvent(drawCardEvent);
        return Resolution.Advance;
    }
}

class BureaucratDiscardEffect implements Effect {

    getTarget() { return Target.OtherPlayers; }
    
    process(game:Game, player:Player, trigger:cards.Card) {
        var matchingCards = cards.getVictories(player.getHand());
        if (matchingCards.length > 0) {
            var decision = decisions.makeDiscardCardDecision(player, matchingCards, trigger, 1, 1, DiscardDestination.Deck);
            return player.promptForCardDecision(decision, cs => {
                if (cs.length !== 1) {
                    throw new Error('Unexpected decision response: ' + cs.join(', '));
                }

                game.discardCards(player, cs, DiscardDestination.Deck);
                return Resolution.Advance;
            });
        } else {
            game.revealPlayerHand(player);
            return Resolution.Advance;
        }
    }
}

class DiscardToDrawEffect implements Effect{
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var decision = decisions.makeDiscardCardDecision(player, player.hand, trigger, 0, player.hand.length, DiscardDestination.Discard);
        return player.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                game.discardCards(player, cs, DiscardDestination.Discard);
                game.drawCards(player, cs.length);
            }

            return Resolution.Advance;
        });
    }
}

class ChancellorEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var decision = decisions.makeDiscardDeckDecision(trigger);
        return player.promptForBooleanDecision(decision, choice => {
            if (choice) {
                player.putDeckIntoDiscard();
            }

            return Resolution.Advance;
        });
    }
}

class AdventurerDrawEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var num = 2;
        var cardType = cards.Type.Treasure;
        var selectedCards:cards.Card[] = [];
        var revealedCards:cards.Card[] = [];

        while (selectedCards.length < num && player.canDraw()) {
            var card = player.takeCardFromDeck();
            if (card.matchesType(cardType)) {
                selectedCards.push(card);
            } else {
                revealedCards.push(card);
            }
        }

        game.drawAndDiscardFromDeck(player, selectedCards, revealedCards);
        return Resolution.Advance;
    }
}

class TrashThisCardEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        game.trashCardFromPlay(player, trigger);
        return Resolution.Advance;
    }
}

class SpyAttackEffect implements Effect {

    getTarget() { return Target.AllPlayers; }

    process(game:Game, targetPlayer:Player, card:cards.Card) {
        var attackingPlayer = game.activePlayer;
        var revealedCard = game.revealCardFromDeck(targetPlayer);
        var decision = decisions.makeDiscardCardDecision(targetPlayer, [revealedCard], card, 0, 1, DiscardDestination.Discard);

        return attackingPlayer.promptForCardDecision(decision, cs => {
            if (cs.length === 1) {
                game.discardCardsFromDeck(targetPlayer, 1);
            }
            return Resolution.Advance;
        });
    }
}

var ThiefTrashedCardsKey = 'ThiefTrashedCards';

class ThiefTrashEffect implements Effect {

    getTarget() { return Target.OtherPlayers; }

    trashAndRememberCard(game:Game, targetPlayer:Player, card:cards.Card) {
        var trashedCards = game.getStoredState(ThiefTrashedCardsKey, []);
        trashedCards = trashedCards.concat([card]);
        game.setStoredState(ThiefTrashedCardsKey, trashedCards);
        game.addCardToTrash(targetPlayer, card);
    }

    // TODO?: delay discarding until end of effects

    process(game:Game, targetPlayer:Player, trigger:cards.Card) {
        var attackingPlayer = game.activePlayer;
        var numCards = 2;
        var cardType = cards.Type.Treasure;

        var takenCards = targetPlayer.takeCardsFromDeck(numCards);
        var matchingCards = cards.filterByType(takenCards, cardType);
        var nonMatchingCards = _.difference(takenCards, matchingCards);

        targetPlayer.addCardsToDiscard(nonMatchingCards);

        var decision = decisions.makeTrashCardDecision(targetPlayer, matchingCards, trigger, 1, 1, TrashCardSource.CardSet);
        return attackingPlayer.promptForCardDecision(decision, cs => {
            if (cs.length > 0) {
                var cardToTrash = cs[0];
                var remainingCards = cards.removeFirst(matchingCards, cardToTrash);
                this.trashAndRememberCard(game, targetPlayer, cardToTrash);
                remainingCards.forEach(c => {
                    targetPlayer.addCardToDiscard(c);
                });
            }
            return Resolution.Advance;
        });
    }
}

class ThiefGainEffect implements Effect {

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, trigger:cards.Card) {
        var trashedCards:cards.Card[] = game.getStoredState(ThiefTrashedCardsKey);
        game.clearStoredState(ThiefTrashedCardsKey);

        var decision = decisions.makeGainAnyDecision(player, trashedCards, trigger);
        return player.promptForCardDecision(decision, cs => {
            cs.forEach(c => {
                game.playerGainsFromTrash(player, c);
            });

            return Resolution.Advance;
        });

        return Resolution.Advance;
    }
}

class GardenVPEffect implements VPEffect {
    calculatePoints(deck:cards.Card[]) : number {
        var cardsPerVP = 10;
        return Math.floor(deck.length / cardsPerVP);
    }
}

export var Adventurer = new cards.Card({
    name: 'Adventurer',
    cost: 6,
    effects: [new AdventurerDrawEffect()],
    set: SetName
});

export var Bureaucrat = new cards.Card({
    name: 'Bureaucrat',
    cost: 4,
    attack:true,
    effects: [
        new e.GainCardEffect(cards.Silver, Target.ActivePlayer, GainDestination.Deck),
        new BureaucratDiscardEffect()],
    set: SetName
});

export var Cellar = new cards.Card({
    name: 'Cellar',
    cost: 2,
    effects: [
        new e.GainActionsEffect(1),
        new DiscardToDrawEffect()],
    set: SetName
});

export var Chancellor = new cards.Card({
    name: 'Chancellor',
    cost: 3,
    effects: [
        new e.GainCoinsEffect(2),
        new ChancellorEffect()],
    set: SetName
});

export var Chapel = new cards.Card({
    name: 'Chapel',
    cost: 2,
    effects: [new e.TrashEffect(Target.ActivePlayer, 0, 4)],
    set: SetName
});

export var CouncilRoom = new cards.Card({
    name: 'Council Room',
    cost: 5,
    effects: [
        new e.DrawEffect(4),
        new e.GainBuysEffect(1),
        new e.DrawEffect(1, Target.OtherPlayers)],
    set: SetName
});

// TODO: handle correctly with Throne Room
export var Feast = new cards.Card({
    name: 'Feast',
    cost: 4,
    effects: [
        new TrashThisCardEffect(),
        new e.GainCardWithCostEffect(0, 5)],
    set: SetName
});

export var Festival = new cards.Card({
    name: 'Festival',
    cost: 5,
    effects: [
        new e.GainActionsEffect(2),
        new e.GainBuysEffect(1),
        new e.GainCoinsEffect(2)],
    set: SetName
});

export var Gardens = new cards.Card({
    name: 'Gardens',
    cost: 4,
    vp: new GardenVPEffect(),
    set: SetName
});

export var Laboratory = new cards.Card({
    name: 'Laboratory',
    cost: 5,
    effects: [
        new e.DrawEffect(2),
        new e.GainActionsEffect(1)],
    set: SetName
});

export var Library = new cards.Card({
    name: 'Library',
    cost: 5,
    effects: [new LibraryDrawEffect()],
    set: SetName
});

export var Market = new cards.Card({
    name: 'Market',
    cost: 5,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new e.GainBuysEffect(1),
        new e.GainCoinsEffect(1)],
    set: SetName
});

export var Mine = new cards.Card({
    name: 'Mine',
    cost: 5,
    effects: [
        new e.TrashToGainPlusCostEffect(3, cards.Type.Treasure, GainDestination.Hand)],
    set: SetName
});

export var Militia = new cards.Card({
    name: 'Militia',
    cost: 4,
    effects: [
        new e.GainCoinsEffect(2),
        new e.DiscardToEffect(Target.OtherPlayers, 3)],
    attack: true,
    set: SetName
});

export var Moat = new cards.Card({
    name: 'Moat',
    cost: 2,
    effects: [new e.DrawEffect(2)],
    reaction: new e.MoatReaction(),
    set: SetName
});

export var Moneylender = new cards.Card({
    name: 'Moneylender',
    cost: 4,
    effects: [
        new e.TrashForEffect(
            new e.GainCoinsEffect(3),
            cards.makeIsCardPredicate(cards.Copper))],
    set: SetName
});

export var Remodel = new cards.Card({
    name: 'Remodel',
    cost: 4,
    effects: [
        new e.TrashToGainPlusCostEffect(2)],
    set: SetName
});

export var Smithy = new cards.Card({
    name: 'Smithy',
    cost: 4,
    effects: [new e.DrawEffect(3)],
    set: SetName
});

export var Spy = new cards.Card({
    name: 'Spy',
    cost: 4,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new SpyAttackEffect()],
    attack: true,
    set: SetName
});

export var Thief = new cards.Card({
    name: 'Thief',
    cost: 4,
    effects: [new ThiefTrashEffect(), new ThiefGainEffect()],
    attack: true,
    set: SetName
});

export var ThroneRoom = new cards.Card({
    name: 'Throne Room',
    cost: 4,
    effects: [new e.PlayActionManyTimesEffect(2)],
    set: SetName
});

export var Village = new cards.Card({
    name: 'Village',
    cost: 3,
    effects: [new e.DrawEffect(1), new e.GainActionsEffect(2)],
    set: SetName
});

export var Witch = new cards.Card({
    name: 'Witch',
    cost: 5,
    effects: [
        new e.DrawEffect(2),
        new e.GainCardEffect(cards.Curse, Target.OtherPlayers)],
    attack: true,
    set: SetName
});

export var Woodcutter = new cards.Card({
    name: 'Woodcutter',
    cost: 3,
    effects: [new e.GainCoinsEffect(2), new e.GainBuysEffect(1)],
    set: SetName
});

export var Workshop = new cards.Card({
    name: 'Workshop',
    cost: 3,
    effects: [new e.GainCardWithCostEffect(0, 4)],
    set: SetName
});

export var Cardlist:cards.Card[] = [
    Adventurer,
    Bureaucrat,
    Cellar,
    Chapel,
    Chancellor,
    CouncilRoom,
    Feast,
    Festival,
    Gardens,
    Market,
    Laboratory,
    Library,
    Mine,
    Moat,
    Moneylender,
    Militia,
    Remodel,
    Smithy,
    Spy,
    Thief,
    ThroneRoom,
    Village,
    Witch,
    Woodcutter,
    Workshop
];
