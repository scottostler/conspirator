// TODO: comment until base works

// import * as _ from 'underscore';

// import { CardType, DiscardDestination, GainDestination } from '../base';

import { Card } from '../cards';

// import { Card, CardInPlay, Curse, Estate, Silver } from '../cards';
// import * as decisions from '../decisions';
// import { BasicVPEffect, CardDiscountEffect, DiscardEffect, DiscardForCoinsEffect,
//          DrawOneCard, DrawTwoCards, DrawThreeCards, Effect, EffectChoice, GainCardEffect, GainCostRestriction, GainOneAction,
//          GainOneBuy, GainOneCoin, GainTwoActions, GainTwoCoins, LabelledEffect, ReactionType,
//          Resolution, Target, TrashEffect, TrashForEffect, TrashToGainPlusCostEffect, TrashTwoCards, VPEffect } from  '../effects';
// import Game from '../game';
// import { Player } from './player';
// import * as util from '../util';

// const SetName = 'Intrigue';

// class BaronDiscardEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game:Game, player:Player, trigger: CardInPlay) {
//         const estates = player.hand.filter(c => c.isSameCard(Estate));
//         const decision = decisions.makeDiscardCardDecision(
//             player, estates, trigger, 0, 1, DiscardDestination.Discard);
//         return player.promptForDiscardDecision(decision, cs => {
//             if (cs.length > 0) {
//                 game.incrementCoinCount(4)
//             } else {
//                 game.playerGainsFromSupply(player, Estate);
//             }
//             return Resolution.Advance;
//         });
//     }
// }

// class ConspiratorDrawEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         if (game.turnState.playedActionCount >= 3) {
//             game.drawCards(player, 1);
//             game.incrementActionCount(1);
//         }

//         return Resolution.Advance;
//     }
// }


// class DukeVPEffect implements VPEffect {
//     calculatePoints(deck: Card[]) : number {
//         return cards.countByCard(deck, cards.Duchy);
//     }
// }

// class IronworksEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         const gainableCards = game.filterGainablePiles(0, 4, CardType.All).map(p => p.card);
//         const decision = decisions.makeGainDecision(
//             player, gainableCards, trigger, GainDestination.Discard);
//         return player.promptForGainDecision(decision, cs => {
//             if (cs.length > 0) {
//                 const gainedCard = cs[0];

//                 if (gainedCard.isAction()) {
//                     game.incrementActionCount(1);
//                 }

//                 if (gainedCard.isTreasure()) {
//                     game.incrementCoinCount(1);
//                 }

//                 if (gainedCard.isVictory()) {
//                     game.drawCards(player, 1);
//                 }
//             }

//             return Resolution.Advance;
//         });
//     }
// }


// class MasqueradePassEffect implements Effect {

//     getTarget() { return Target.AllPlayers; }
    
//     process(game: Game, player: Player, trigger: CardInPlay) {
//         const targetPlayer = game.playerLeftOf(player);
//         const decision = decisions.makePassCardDecision(player, targetPlayer, trigger);
//         return player.promptForCardDecision(decision, cs => {
//             game.playerSelectsCardToPass(player, targetPlayer, cs[0]);
//             return Resolution.Advance;
//         });
//     }
// }

// class MasqueradeReceiveEffect implements Effect {
//     getTarget() { return Target.ActivePlayer; }
    
//     process(game: Game, player: Player, trigger: CardInPlay) {
//         game.distributePassedCards();
//         return Resolution.Advance;
//     }
// }

// class MiningVillageTrashEffect implements  Effect {

//     getTarget() { return  Target.ActivePlayer; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         if (!game.isExactCardInPlay(trigger)) {
//             return Resolution.Advance;
//         }

//         const decision = decisions.makeTrashCardDecision(player, [trigger], trigger, 0, 1);
//         return player.promptForCardDecision(decision, cs => {
//             if (cs.length > 0 && game.trashCardFromPlay(player, trigger)) {
//                 game.incrementCoinCount(2);
//             }

//             return Resolution.Advance;
//         });
//     }
// }

// class MinionDiscardEffect implements LabelledEffect {

//     getTarget() { return Target.AllPlayers; }
//     getLabel() { return 'Discard and draw four cards'; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         if (game.isActivePlayer(player) || player.hand.length >= 5) {
//             game.discardHand(player);
//             game.drawCards(player, 4);
//         }

//         return Resolution.Advance;
//     }
// }

// class ShantyTownEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game:Game, player: Player, trigger: CardInPlay) {
//         game.revealPlayerHand(player);

//         if (player.hand.filter(c => c.isAction()).length === 0) {
//             game.drawCards(player, 2);
//         }

//         return Resolution.Advance;
//     }

// }

// class SwindlerEffect implements Effect {

//     getTarget() { return Target.OtherPlayers; }

//     process(game: Game, targetPlayer: Player, trigger: CardInPlay) {
//         const trashedCard = game.trashCardFromDeck(targetPlayer);
//         if (!trashedCard) {
//             return Resolution.Advance;
//         }

//         const cost = game.effectiveCardCost(trashedCard);
//         const gainableCards = game.filterGainablePiles(cost, cost).map(p => p.card);
//         const decision = decisions.makeGainDecision(targetPlayer, gainableCards, trigger, GainDestination.Discard);
//         return game.activePlayer.promptForGainDecision(decision);
//     }
// }

// class TributeEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         const discardingPlayer = game.playerLeftOf(player);
//         const discardedCards = game.discardFromDeck(discardingPlayer, 2);
//         const uniqueDiscards = cards.uniq(discardedCards);
//         uniqueDiscards.forEach(c => {
//             if (c.isAction()) {
//                 game.incrementActionCount(2);
//             }

//             if (c.isTreasure()) {
//                 game.incrementCoinCount(2);
//             }

//             if (c.isVictory()) {
//                 game.drawCards(player, 2);
//             }
//         });

//         return Resolution.Advance;
//     }
// }

// class WishingWellEffect implements Effect {

//     getTarget() { return Target.ActivePlayer; }

//     process(game: Game, player: Player, trigger: CardInPlay) {
//         const decision = decisions.makeNameCardDecision(player, game.allCardsInGame(), trigger);
//         return player.promptForCardDecision(decision, cs => {
//             const namedCard = cs[0];
//             const revealed = game.revealCardFromDeck(player);
//             if (revealed && revealed.isSameCard(namedCard)) {
//                 game.drawCards(player, 1);
//             }
//             return Resolution.Advance;
//         });
//     }
// }

// export const Baron = new Card({
//     name: 'Baron',
//     cost: 4,
//     effects: [
//         GainOneBuy,
//         new BaronDiscardEffect()
//     ],
//     set: SetName
// });

// export const Bridge = new Card({
//     name: 'Bridge',
//     cost: 4,
//     effects: [
//         GainOneBuy,
//         GainOneCoin,
//         new CardDiscountEffect(1)
//     ],
//     set: SetName
// });

// export const Conspirator = new Card({
//     name: 'Conspirator',
//     cost: 4,
//     effects: [
//         GainTwoCoins,
//         new ConspiratorDrawEffect()
//     ],
//     set: SetName
// });

// export const Courtyard = new Card({
//     name: 'Courtyard',
//     cost: 2,
//     effects: [
//         DrawThreeCards,
//         new DiscardEffect(1, Target.ActivePlayer, DiscardDestination.Deck)
//     ],
//     set: SetName
// });

// export const Duke = new Card({
//     name: 'Duke',
//     cost: 5,
//     vp: new DukeVPEffect(),
//     set: SetName
// });

// export const GreatHall = new Card({
//     name: 'Great Hall',
//     cost: 3,
//     effects: [DrawOneCard, GainOneAction],
//     vp: new BasicVPEffect(1),
//     set: SetName
// });

// export const Harem = new Card({
//     name: 'Harem',
//     cost: 6,
//     money: 2,
//     vp: new BasicVPEffect(2),
//     set: SetName
// });

// export const Ironworks = new Card({
//     name: 'Ironworks',
//     cost: 4,
//     effects: [new IronworksEffect()],
//     set: SetName
// });

// export const Masquerade = new Card({
//     name: 'Masquerade',
//     cost: 3,
//     effects: [
//         DrawTwoCards,
//         new MasqueradePassEffect(), new MasqueradeReceiveEffect(),
//         new TrashEffect(0, 1)
//     ],
//     set: SetName
// });

// export const MiningVillage = new Card({
//     name: 'Mining Village',
//     cost: 4,
//     effects: [
//         DrawOneCard,
//         GainTwoActions,
//         new MiningVillageTrashEffect()],
//     set: SetName
// });

// export const MinionDiscard = new MinionDiscardEffect();

// export const Minion = new Card({
//     name: 'Minion',
//     cost: 5,
//     effects: [
//         GainOneAction,
//         new EffectChoice([GainTwoCoins, ])
//     ],
//     attack: true,
//     set: SetName
// });

// export const Nobles = new Card({
//     name: 'Nobles',
//     cost: 6,
//     effects: [
//         new EffectChoice([GainTwoActions, DrawThreeCards])
//     ],
//     vp: new BasicVPEffect(2),
//     set: SetName
// });

// export const Pawn = new Card({
//     name: 'Pawn',
//     cost: 2,
//     effects: [new EffectChoice(
//         [GainOneAction, DrawOneCard, GainOneBuy, GainOneCoin],
//         Target.ActivePlayer, 2)],
//     set: SetName
// });

// export const SecretChamber = new Card({
//     name: 'Secret Chamber',
//     cost: 2,
//     effects: [new DiscardForCoinsEffect()],
//     reaction: [
//         ReactionType.OnAttack,
//         [DrawTwoCards, new DiscardEffect(2, Target.ActivePlayer, DiscardDestination.Deck)]],
//     set: SetName
// });

// export const ShantyTown = new Card({
//     name: 'Shanty Town',
//     cost: 3,
//     effects: [
//         GainTwoActions,
//         new ShantyTownEffect()],
//     set: SetName
// });

// export const Steward = new Card({
//     name: 'Steward',
//     cost: 3,
//     effects: [
//         new EffectChoice([DrawTwoCards, GainTwoCoins, TrashTwoCards])
//     ],
//     set: SetName
// });

// export const Swindler = new Card({
//     name: 'Swindler',
//     cost: 3,
//     effects: [
//         GainTwoCoins,
//         new SwindlerEffect()],
//     attack: true,
//     set: SetName
// });

// export const TorturerDiscard = new DiscardEffect(2, Target.ChoosingPlayer);
// export const GainCurseIntoHand = new GainCardEffect(Curse, Target.ChoosingPlayer, GainDestination.Hand);

// export const Torturer = new Card({
//     name: 'Torturer',
//     cost: 5,
//     effects: [
//         DrawThreeCards,
//         new EffectChoice([TorturerDiscard, GainCurseIntoHand], Target.OtherPlayers)],
//     attack: true,
//     set: SetName
// });

// const GainSilverEffect = new GainCardEffect(
//     Silver, Target.ActivePlayer, GainDestination.Hand);

// export const TradingPost = new Card({
//     name: 'Trading Post',
//     cost: 5,
//     effects: [
//         new TrashForEffect(GainSilverEffect, cards.allCardsPredicate, 2)
//     ],
//     set: SetName
// });

// export const Tribute = new Card({
//     name: 'Tribute',
//     cost: 5,
//     effects: [new TributeEffect()],
//     set: SetName
// });

// export const Upgrade = new Card({
//     name: 'Upgrade',
//     cost: 5,
//     effects: [
//         DrawOneCard,
//         GainOneAction,
//         new TrashToGainPlusCostEffect(
//             1, CardType.All,
//             GainDestination.Discard,
//             GainCostRestriction.ExactlyCost)
//     ],
//     set: SetName
// });

// export const WishingWell = new Card({
//     name: 'Wishing Well',
//     cost: 3,
//     effects: [ DrawOneCard, GainOneAction, new WishingWellEffect()],
//     set: SetName
// });

export const Cardlist: Card[] = [
    // Baron,
    // Bridge,
    // Conspirator,
    // Courtyard,
    // Duke,
    // GreatHall,
    // Harem,
    // Ironworks,
    // Masquerade,
    // MiningVillage,
    // Minion,
    // Nobles,
    // Pawn,
    // SecretChamber,
    // ShantyTown,
    // Steward,
    // Swindler,
    // Torturer,
    // TradingPost,
    // Tribute,
    // Upgrade,
    // WishingWell
];
