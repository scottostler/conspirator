var Decisions = module.exports = {};

Decisions.Options = {
    No: 'No',
    Yes: 'Yes',
    Trash: 'Trash',
    Discard: 'Discard',
    Keep: 'Keep',
    Draw: 'Draw'
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

Decisions.keepOrDiscardCard = function(game, player, card) {
    return {
        title: 'Keep or discard ' + player.name + "'s " + card.name + '?',
        options: [Decisions.Options.Discard, Decisions.Options.Keep]
    };
};

Decisions.drawOrDiscardCard = function(game, card) {
    return {
        title: 'Draw or discard ' + card.name + '?',
        options: [Decisions.Options.Discard, Decisions.Options.Draw]
    };
};

Decisions.gainCard = function(game, card) {
    return {
        title: 'Gain ' + card.name + '?',
        options: [Decisions.Options.No, Decisions.Options.Yes]
    };
};

Decisions.chooseCardToGain = function(choosingPlayer, gainingPlayer, cards) {
    var gainPhrase = choosingPlayer === gainingPlayer
            ? '' : 'for ' + gainingPlayer.name + ' ';
    return {
        title: 'Choose card ' + gainPhrase + 'to gain',
        options: cards
    };
};

Decisions.chooseCardToTrash = function(game, player, cards) {
    return {
        title: 'Choose ' + player.name + "'s card to trash",
        options: cards
    };
};

Decisions.playAction = function(game, player, actions) {
    return {
        title: 'Choose action to play',
        options: actions
    };
};

Decisions.chooseEffect = function(game, player, effects) {
    return {
        title: 'Choose effect',
        options: effects
    };
};

Decisions.trashCardToGain = function(game, card, gainEffect) {
    var gainLabel = gainEffect._optionString ? gainEffect._optionString : gainEffect.toString();
    var label = 'Trash ' + card.name + ' to gain ' + gainLabel + '?';
    return {
        title: label,
        options: [Decisions.Options.Keep, Decisions.Options.Trash]
    };
};
