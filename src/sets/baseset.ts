import _ = require('underscore');
import util = require('../util');
import base = require('../base');
import Game = require('../game');
import e = require('../effects');
import cards = require('../cards');
import Player = require('../player');
import Decisions = require('../decisions');

import DiscardDestination = base.DiscardDestination;
import GainDestination = base.GainDestination;
import Effect = e.Effect;
import VPEffect = e.VPEffect;
import Resolution = e.Resolution;
import Target = e.Target;

export var SetName = 'Base';

class LibraryDrawEffect implements Effect {

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var discardType = cards.Type.Action;
        var targetHandSize = 7;

        var isDone = function() {
            return !player.canDraw() || player.hand.length >= targetHandSize;
        };

        var setAsideCards:cards.Card[] = [];
        var drawCardEvent = () => {
            if (isDone()) {
                if (setAsideCards.length > 0) {
                    game.addCardsToDiscard(player, setAsideCards);
                }
                return Resolution.Advance;
            }

            var card = player.takeCardFromDeck();
            if (card.matchesType(discardType)) {
                var decision = Decisions.drawOrDiscardCard(card);
                return player.promptForDecision(game, decision, (choice) => {
                    if (choice === Decisions.Options.Draw) {
                        game.drawTakenCard(player, card);
                    } else {
                        setAsideCards.push(card);
                    }

                    game.pushEvent(drawCardEvent);
                    return Resolution.Advance;
                });
            } else {
                game.drawTakenCard(player, card);
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
    
    process(game:Game, player:Player, card:cards.Card) {
        var matchingCards = cards.getVictories(player.getHand());
        if (matchingCards.length > 0) {
            return player.promptForDiscard(game, 1, 1, matchingCards, DiscardDestination.Deck);
        } else {
            game.revealPlayerHand(player);
            return Resolution.Advance;
        }
    }
}

class DiscardToDrawEffect implements Effect{
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        if (player.hand.length === 0) {
            return Resolution.Advance;
        }

        return player.promptForDiscard(game, 0, player.hand.length, player.hand, DiscardDestination.Discard, (cards) => {
            if (cards.length > 0) {
                game.drawCards(player, cards.length);
            }

            return Resolution.Advance;
        });
    }
}

class ChancellorEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var decision = Decisions.binaryDecision('Shuffle discard into deck?');
        return player.promptForDecision(game, decision, (choice) => {
            if (choice === Decisions.Options.Yes) {
                player.shuffleCompletely();
                game.log(player, 'shuffles discard into deck');
            }

            return Resolution.Advance;
        });
    }
}

class AdventurerDrawEffect implements Effect {
    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
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

    process(game:Game, player:Player, card:cards.Card) {
        game.trashCardFromPlay(player, card);
        return Resolution.Advance;
    }
}

class SpyAttackEffect implements Effect {

    getTarget() { return Target.AllPlayers; }

    process(game:Game, targetPlayer:Player) {
        var attackingPlayer = game.activePlayer;
        var card = game.revealCardFromDeck(targetPlayer);
        if (card) {
            var decision = Decisions.binaryDecision('Discard ' + card.name + '?');
            return attackingPlayer.promptForDecision(game, decision, (choice) => {
                if (choice === Decisions.Options.Yes) {
                    game.discardCardsFromDeck(targetPlayer, 1);
                }

                return Resolution.Advance;
            });
        } else {
            return Resolution.Advance;
        }
    }
}

var ThiefTrashedCardsKey = 'ThiefTrashedCards';

class ThiefTrashEffect implements Effect {

    getTarget() { return Target.OtherPlayers; }

    process(game:Game, targetPlayer:Player) {
        var attackingPlayer = game.activePlayer;
        var numCards = 2;
        var cardType = cards.Type.Treasure;

        var revealedCards = targetPlayer.takeCardsFromDeck(numCards);
        var matchingCards = cards.filterByType(revealedCards, cardType);
        var nonMatchingCards = _.difference(revealedCards, matchingCards);

        if (matchingCards.length > 0) {
            var label = 'Choose ' + util.possessive(targetPlayer.name) + ' card to trash';
            var decision = Decisions.chooseCard(label, matchingCards);

            return attackingPlayer.promptForDecision(game, decision, (choice:cards.Card) => {
                var firstChoice = matchingCards.indexOf(choice);
                matchingCards.forEach((c, i) => {
                    if (i === firstChoice) {
                        var trashedCards = game.getStoredState(ThiefTrashedCardsKey, []);
                        trashedCards = trashedCards.concat([c]);
                        game.setStoredState(ThiefTrashedCardsKey, trashedCards);

                        game.addCardToTrash(targetPlayer, c);
                    } else {
                        targetPlayer.addCardToDiscard(c);
                        game.log(targetPlayer.name, 'discards', c.name);
                    }
                });

                if (nonMatchingCards.length > 0) {
                    targetPlayer.addCardsToDiscard(nonMatchingCards);
                }

                return Resolution.Advance;
            });
        } else {
            if (nonMatchingCards.length > 0) {
                targetPlayer.addCardsToDiscard(nonMatchingCards);
                game.log(targetPlayer.name, 'discards', _.pluck(nonMatchingCards, 'name').join(', '));
            }

            return Resolution.Advance;
        }
    }
}

class ThiefGainEffect implements Effect {

    getTarget() { return Target.ActivePlayer; }

    process(game:Game, player:Player, card:cards.Card) {
        var trashedCards:cards.Card[] = game.getStoredState(ThiefTrashedCardsKey);
        game.clearStoredState(ThiefTrashedCardsKey);

        trashedCards.forEach((card:cards.Card) => {
            game.pushEvent(() => {
                var decision = Decisions.binaryDecision('Gain ' + card.name + '?');
                return player.promptForDecision(game, decision, (choice) => {
                    if (choice === Decisions.Options.Yes) {
                        game.playerGainsFromTrash(player, card);
                    }
                    return Resolution.Advance;
                });
            });
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

var Adventurer = new cards.Card({
    name: 'Adventurer',
    cost: 6,
    effects: [new AdventurerDrawEffect()],
    set: SetName
});

var Bureaucrat = new cards.Card({
    name: 'Bureaucrat',
    cost: 4,
    attack:true,
    effects: [
        new e.GainCardEffect(cards.Silver, Target.ActivePlayer, GainDestination.Deck),
        new BureaucratDiscardEffect()],
    set: SetName
});

var Cellar = new cards.Card({
    name: 'Cellar',
    cost: 2,
    effects: [
        new e.GainActionsEffect(1),
        new DiscardToDrawEffect()],
    set: SetName
});

var Chancellor = new cards.Card({
    name: 'Chancellor',
    cost: 3,
    effects: [
        new e.GainCoinsEffect(2),
        new ChancellorEffect()],
    set: SetName
});

var Chapel = new cards.Card({
    name: 'Chapel',
    cost: 2,
    effects: [new e.TrashEffect(Target.ActivePlayer, 0, 4)],
    set: SetName
});

var CouncilRoom = new cards.Card({
    name: 'Council Room',
    cost: 5,
    effects: [
        new e.DrawEffect(4),
        new e.GainBuysEffect(1),
        new e.DrawEffect(1, Target.OtherPlayers)],
    set: SetName
});

// TODO: handle correctly with Throne Room
var Feast = new cards.Card({
    name: 'Feast',
    cost: 4,
    effects: [
        new TrashThisCardEffect(),
        new e.GainCardWithCostEffect(0, 5)],
    set: SetName
});

var Festival = new cards.Card({
    name: 'Festival',
    cost: 5,
    effects: [
        new e.GainActionsEffect(2),
        new e.GainBuysEffect(1),
        new e.GainCoinsEffect(2)],
    set: SetName
});

var Gardens = new cards.Card({
    name: 'Gardens',
    cost: 4,
    vp: new GardenVPEffect(),
    set: SetName
});

var Laboratory = new cards.Card({
    name: 'Laboratory',
    cost: 5,
    effects: [
        new e.DrawEffect(2),
        new e.GainActionsEffect(1)],
    set: SetName
});

var Library = new cards.Card({
    name: 'Library',
    cost: 5,
    effects: [new LibraryDrawEffect()],
    set: SetName
});

var Market = new cards.Card({
    name: 'Market',
    cost: 5,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new e.GainBuysEffect(1),
        new e.GainCoinsEffect(1)],
    set: SetName
});

var Mine = new cards.Card({
    name: 'Mine',
    cost: 5,
    effects: [
        new e.TrashToGainPlusCostEffect(3, cards.Type.Treasure, GainDestination.Hand)],
    set: SetName
});

var Militia = new cards.Card({
    name: 'Militia',
    cost: 4,
    effects: [
        new e.GainCoinsEffect(2),
        new e.DiscardToEffect(Target.OtherPlayers, 3)],
    attack: true,
    set: SetName
});

var Moat = new cards.Card({
    name: 'Moat',
    cost: 2,
    effects: [new e.DrawEffect(2)],
    reaction: new e.MoatReaction(),
    set: SetName
});

var Moneylender = new cards.Card({
    name: 'Moneylender',
    cost: 4,
    effects: [
        new e.TrashForEffect(
            new e.GainCoinsEffect(3),
            cards.makeIsCardPredicate(cards.Copper))],
    set: SetName
});

var Remodel = new cards.Card({
    name: 'Remodel',
    cost: 4,
    effects: [
        new e.TrashToGainPlusCostEffect(2)],
    set: SetName
});

var Smithy = new cards.Card({
    name: 'Smithy',
    cost: 4,
    effects: [new e.DrawEffect(3)],
    set: SetName
});

var Spy = new cards.Card({
    name: 'Spy',
    cost: 4,
    effects: [
        new e.DrawEffect(1),
        new e.GainActionsEffect(1),
        new SpyAttackEffect()],
    attack: true,
    set: SetName
});

var Thief = new cards.Card({
    name: 'Thief',
    cost: 4,
    effects: [new ThiefTrashEffect(), new ThiefGainEffect()],
    attack: true,
    set: SetName
});

var ThroneRoom = new cards.Card({
    name: 'Throne Room',
    cost: 4,
    effects: [new e.PlayActionManyTimesEffect(2)],
    set: SetName
});

var Village = new cards.Card({
    name: 'Village',
    cost: 3,
    effects: [new e.DrawEffect(1), new e.GainActionsEffect(2)],
    set: SetName
});

var Witch = new cards.Card({
    name: 'Witch',
    cost: 5,
    effects: [
        new e.DrawEffect(2),
        new e.GainCardEffect(cards.Curse, Target.OtherPlayers)],
    attack: true,
    set: SetName
});

var Woodcutter = new cards.Card({
    name: 'Woodcutter',
    cost: 3,
    effects: [new e.GainCoinsEffect(2), new e.GainBuysEffect(1)],
    set: SetName
});

var Workshop = new cards.Card({
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
