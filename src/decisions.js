var Decisions = {};

Decisions.Options = {
    No: 'No',
    Yes: 'Yes',
    Discard: 'Discard',
    Keep: 'Keep'
};

Decisions.shuffleDiscardIntoDeck = function(game) {
    return {
        title: 'Shuffle discard into deck?',
        options: [Decisions.Options.No, Decisions.Options.Yes]
    };
};

Decisions.discardCardOntoDeck = function(game, cards) {
    return {
        title: 'Select card to discard onto deck',
        options: cards
    };
};

Decisions.keepOrDiscardTopCard = function(game, player, card) {
    return {
        title: 'Keep or discard ' + player.name + "'s " + card.name + '?',
        options: [Decisions.Options.Discard, Decisions.Options.Keep]
    };
};