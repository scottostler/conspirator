// Cards.Fortuneteller = new Card({
//     name: 'Fortuneteller',
//     cost: 3,
//     effects: [gainCoins(2), otherPlayersDiscardUntilCurseOrVictory()],
//     attack: true,
//     set: 'cornucopia'
// });

// Cards.Fairgrounds = new Card({
//     name: 'Fairgrounds',
//     cost: 6,
//     vp: vpPerNDistinctCards(2, 5),
//     set: 'cornucopia'
// });

// Cards.FarmingVillage = new Card({
//     name: 'Farming Village',
//     cost: 4,
//     effects: [gainActions(2), drawCardType(1, [Card.Type.Treasure, Card.Type.Action])],
//     set: 'cornucopia'
// });

// Cards.Hamlet = new Card({
//     name: 'Hamlet',
//     cost: 2,
//     effects: [
//         drawCards(1), gainActions(1),
//         discardForEffect(Card.Type.All, gainActions(1)),
//         discardForEffect(Card.Type.All, gainBuys(1))],
//     set: 'cornucopia'
// });

// Cards.Harvest = new Card({
//     name: 'Harvest',
//     cost: 5,
//     effects: [revealUniqueCardsForCoins(4)],
//     set: 'cornucopia'
// });

// Cards.HornOfPlenty = new Card({
//     name: 'Horn Of Plenty',
//     cost: 5,
//     money: gainFromHornOfPlenty(),
//     set: 'cornucopia'
// });

// Cards.HuntingParty = new Card({
//     name: 'Hunting Party',
//     cost: 5,
//     effects: [drawCards(1), gainActions(1), drawUniqueCard()],
//     set: 'cornucopia'
// });

// Cards.Jester = new Card({
//     name: 'Jester',
//     cost: 5,
//     effects: [gainCoins(2), jesterAttack()],
//     attack: true,
//     set: 'cornucopia'
// });

// Cards.Menagerie = new Card({
//     name: 'Menagerie',
//     cost: 3,
//     effects: [gainActions(1), revealAndTestHand(areUnique, drawCards(3), drawCards(1))],
//     set: 'cornucopia'
// });

// Cards.Remake = new Card({
//     name: 'Remake',
//     cost: 4,
//     effects: [trashCardToGainExactlyPlusCost(1, Card.Type.All), trashCardToGainExactlyPlusCost(1, Card.Type.All)],
//     set: 'cornucopia'
// });

// Cards.Cornucopia = [
//     Cards.Fairgrounds,
//     Cards.Hamlet,
//     Cards.HornOfPlenty,
//     Cards.HuntingParty,
//     Cards.Menagerie,
//     Cards.Remake,
//     Cards.Fortuneteller,
//     Cards.Harvest,
//     Cards.FarmingVillage,
//     Cards.Jester
// ];
