/// <reference path="../typings/underscore/underscore.d.ts" />
// import _ = require('underscore');

// import util = require('./util');
// import Player = require('./player');
// import game = require('./game');
// import Decisions = require('./decisions');
// import cards = require('./cards');

// Game.prototype.inactivePlayersDiscardToAttack = function(num) {
//     var that = this;

//     _.each(util.reverse(this.inactivePlayers), function(player) {
//         var discardAttack = function() {
//             that.discardNCardsEffect(player, num);
//         };

//         that.eventStack.push(function() {
//             that.allowReactionsToAttack(player, discardAttack, false);
//         });
//     });

//     this.advanceGameState();
// };

// Game.prototype.playersGainCardsEffect = function(players, cards, ontoDeck) {
//     var that = this;

//     _.each(players, function(player) {
//         _.each(cards, function(card) {
//             var pile = that.pileForCard(card);
//             if (pile.count > 0) {
//                 that.playerGainsCard(player, card, ontoDeck);
//             }
//         });
//     });

//     this.advanceGameState();
// };

// Game.prototype.playerGainsCardEffect = function(player, card) {
//     this.playersGainCardsEffect([player], [card]);
// }

// Game.prototype.playerGainsCardIntoHandEffect = function(player, card) {
//     this.playerGainsCard(player, card, false, true);
//     this.advanceGameState();
// }

// Game.prototype.playersGainCardsAttack = function(players, cards) {
//     var that = this;

//     _.each(util.reverse(players), function(player) {
//         var gainAttack = function() {
//             _.each(cards, function(card) {
//                 var pile = that.pileForCard(card);
//                 if (pile.count > 0) {
//                     that.playerGainsCard(player, card, false);
//                 }
//             });

//             that.advanceGameState();
//         };

//         that.eventStack.push(function() {
//             that.allowReactionsToAttack(player, gainAttack, false);
//         });
//     });

//     this.advanceGameState();
// };

// Game.prototype.playersDiscardCardJesterAttack = function(attackingPlayer, targetPlayers) {
//     var that = this;

//     _.each(util.reverse(targetPlayers), function(targetPlayer) {
//         var gainAttack = function() {
//             var pile = that.pileForCard(Cards.Curse);
//             if (pile.count > 0) {
//                 that.playerGainsCard(targetPlayer, Cards.Curse, false);
//             }
//             that.advanceGameState();
//         };

//         var chooseEffect = function() {
//             var card = targetPlayer.discardCardFromDeck();
//             var pile = that.pileForCard(card);

//             if (card) {
//                 that.log(targetPlayer.name, 'discards', card.name);
//             }

//             if (card && card.isVictory()) {
//                 gainAttack();
//             } else if (card && pile.count > 0) {
//                 var decision = Decisions.binaryDecision('Gain ' + card.name + '?');
//                 attackingPlayer.promptForDecision(that, decision, function(choice) {
//                     if (choice === Decisions.Options.Yes) {
//                         that.playerGainsCard(attackingPlayer, card, false);
//                     } else {
//                         that.playerGainsCard(targetPlayer, card, false);
//                     }
//                     that.advanceGameState();
//                 });
//             } else {
//                 that.advanceGameState();
//             }
//         };
//         that.eventStack.push(function() {
//             that.allowReactionsToAttack(targetPlayer, chooseEffect, false);
//         });
//     });

//     this.advanceGameState();
// };

// Game.prototype.playerChoosesGainedCardEffect = function(player, minCost, maxCost, cardOrType, intoHand, onGain) {
//     var that = this;
//     var gainablePiles = this.filterGainablePiles(minCost, maxCost, cardOrType);
//     if (gainablePiles.length > 0) {
//         player.promptForGain(this, gainablePiles, function(card) {
//             that.playerGainsCard(player, card, false, intoHand);

//             if (onGain) {
//                 onGain(card);
//             }

//             that.advanceGameState();
//         });
//     } else {
//         this.advanceGameState();
//     }
// };

// Game.prototype.playerDiscardsForCoinsEffect = function(player) {
//     var that = this;
//     player.promptForDiscard(this, 0, player.hand.length, player.hand, function(cards) {
//         if (cards.length > 0) {
//             that.incrementCoinCount(cards.length);
//         }

//         that.advanceGameState();
//     });
// };

// Game.prototype.playerDiscardCardForEffect = function(player, cardOrType, effect, altEffect?) {
//     var that = this;
//     var matchingCards = player.getMatchingCardsInHand(cardOrType);

//     if (matchingCards.length > 0) {
//         player.promptForDiscard(this, 0, 1, matchingCards, function(cards) {
//             if (cards.length > 0) {
//                 effect(that, that.activePlayer, that.inactivePlayers);
//             } else if (altEffect) {
//                 altEffect(that, that.activePlayer, that.inactivePlayers);
//             } else {
//                 that.advanceGameState();
//             }
//         });
//     } else if (altEffect) {
//         altEffect(this, this.activePlayer, this.inactivePlayers);
//     } else {
//         this.advanceGameState();
//     }
// };

// Game.prototype.playerDrawsCardTypeEffect = function(player, num, cardOrType) {
//     var selectedCards = [];
//     var revealedCards = [];

//     while (selectedCards.length < num && player.canDraw()) {
//         var card = player.takeCardFromDeck();
//         if (card.matchesCardOrType(cardOrType)) {
//             selectedCards.push(card);
//         } else {
//             revealedCards.push(card);
//         }
//     }

//     this.drawAndDiscardFromDeck(player, selectedCards, revealedCards);
//     this.advanceGameState();
// };

// Game.prototype.playerDiscardCardOntoDeckEffect = function(player) {
//     if (player.hand.length > 0) {
//         player.promptForHandSelection(this, 1, 1, player.hand, (card) => {
//             this.discardCards(player, [card], true);
//             this.advanceGameState();
//         });
//     } else {
//         that.advanceGameState();
//     }
// };


// Game.prototype.playerDiscardsUniqueCardsForCoins = function(player, num) {
//     var cards = player.revealCardsFromDeck(num);
//     var coins = Cards.uniq(cards).length;
//     this.discardCardsFromDeck(player, num);
//     this.activePlayerGainsCoinsEffect(coins);
// };

// Game.prototype.playersDiscardExceptCurseOrVictoryAttack = function(players) {
//     var that = this;

//     _.each(util.reverse(players), function(player) {
//         that.eventStack.push(function() {
//             var revealEffect = function() {
//                 var numToDiscard = 0;
//                 var numCardsExpected = 1;
//                 var cards = player.revealCardsFromDeck(numCardsExpected);
//                 if (cards.length === numCardsExpected) {
//                     that.log(player.name, 'reveals', cards[0].name);
//                     while (!(cards[0].isVictory() || cards[0].isCurse())) {
//                         numToDiscard++;
//                         numCardsExpected++;
//                         cards = player.revealCardsFromDeck(numCardsExpected);
//                         if(cards.length !== numCardsExpected) break;
//                         that.log(player.name, 'reveals', cards[0].name);
//                     }
//                     player.discardCardsFromDeck(numToDiscard);
//                 }
//                 that.advanceGameState();
//             };

//             that.allowReactionsToAttack(player, revealEffect, false);
//         });
//     });
//     this.advanceGameState();
// };


// Game.prototype.keepOrDiscardTopCardOptionAttack = function(choosingPlayer, targetPlayers) {
//     var that = this;

//     _.each(util.reverse(targetPlayers), function(targetPlayer) {
//         that.eventStack.push(function() {
//             var chooseEffect = function() {
//                 var cards = targetPlayer.revealCardsFromDeck(1);
//                 if (cards.length > 0) {
//                     var card = cards[0];
//                     var decision = Decisions.binaryDecision('Discard ' + card.name + '?');
//                     choosingPlayer.promptForDecision(that, decision, function(choice) {
//                         if (choice === Decisions.Options.Yes) {
//                             that.log(choosingPlayer.name, 'discards', util.possessive(targetPlayer.name), card.name);
//                             targetPlayer.discardCardFromDeck();
//                         } else {
//                             that.log(choosingPlayer.name, 'keeps', util.possessive(targetPlayer.name), card.name);
//                         }

//                         that.advanceGameState();
//                     });
//                 } else {
//                     that.advanceGameState();
//                 }
//             };

//             if (targetPlayer === choosingPlayer) {
//                 chooseEffect();
//             } else {
//                 that.allowReactionsToAttack(targetPlayer, chooseEffect, false);
//             }
//         });
//     });

//     this.advanceGameState();
// };

// Game.prototype.playActionMultipleTimesEffect = function(player, num) {
//     var that = this;
//     var actions = player.getActionsInHand();
//     if (actions.length > 0) {
//         player.promptForHandSelection(this, 1, 1, actions, function(actions) {
//             that.playActionMultipleTimes(card, num);
//             that.advanceGameState();
//         });
//     } else {
//         this.advanceGameState();
//     }
// };

// Game.prototype.revealAndTestHandEffect = function(test, trueEffect, falseEffect) {
//     if (test(this.activePlayer.hand)) {
//         trueEffect(this, this.activePlayer, this.inactivePlayers);
//     } else if (falseEffect) {
//         falseEffect(this, this.activePlayer, this.inactivePlayers);
//     } else {
//         this.advanceGameState();
//     }
// };

// Game.prototype.playerChoosesNEffects = function(player, n, effects) {
//     var that = this;
//     var otherPlayers = this.playersAsideFrom(player);
//     var remainingEffects = effects;

//     var promptChoice = function() {
//         player.promptForEffectChoice(that, remainingEffects, function(effect) {
//             remainingEffects = util.removeFirst(remainingEffects, effect);
//         });
//     };

//     var events = util.repeat(promptChoice, n);
//     this.pushGameEvents(events);
//     this.advanceGameState();
// };

// Game.prototype.playerDrawForUniqueCard = function(player) {
//     this.revealPlayerHand(player);

//     var discardedCards = [];
//     var drawnCard = player.takeCardFromDeck();
//     while (drawnCard && _.contains(player.hand, drawnCard)) {
//         discardedCards.push(drawnCard);
//         drawnCard = player.takeCardFromDeck();
//     }

//     var drawnCardArray = drawnCard ? [drawnCard] : [];
//     this.drawAndDiscardFromDeck(player, drawnCardArray, discardedCards);

//     this.advanceGameState();
// };

// Game.prototype.playerGainCardFromHornOfPlenty = function(player) {
//     var cards = this.playArea;
//     var minCost = 0;
//     var maxCost = Cards.uniq(cards).length;
//     var that = this;

//     this.playerChoosesGainedCardEffect(player, minCost, maxCost, Card.Type.All, false, function(card) {
//         if (card.isVictory()) {
//             that.trashCardFromPlay(Cards.HornOfPlenty);
//         }
//     });
// };

// Game.prototype.offerTrashForEffect = function(player, card, trashEffect) {
//     var that = this;
//     var decision = Decisions.trashCardToGain(this, card, trashEffect);
//     player.promptForDecision(this, decision, function(choice) {
//         if (choice === Decisions.Options.Trash) {
//             that.trashCardFromPlay(card);
//             that.pushGameEvent(trashEffect);
//         }

//         that.advanceGameState();
//     });
// };
