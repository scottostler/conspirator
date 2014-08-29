import cards = require('./cards');
import base = require('./base');

export var Options = {
    No: 'No',
    Yes: 'Yes',
    Trash: 'Trash',
    Discard: 'Discard',
    Keep: 'Keep',
    Draw: 'Draw'
};

export interface Decision {
    title:string;
    options:any[];
}

export function binaryDecision(title:string) : Decision {
    return {
        title: title,
        options: [Options.No, Options.Yes]
    };
}

export function trashOrKeepCard(card:cards.Card) : Decision {
    return {
        title: 'Trash or keep ' + card.name + '?',
        options: [Options.Trash, Options.Keep]
    };
}

export function drawOrDiscardCard(card:cards.Card) : Decision {
    return {
        title: 'Draw or discard ' + card.name + '?',
        options: [Options.Discard, Options.Draw]
    };
}

export function chooseCard(title:string, cards:cards.Card[]) : Decision {
    return {
        title: title,
        options: cards
    };
}

export function chooseEffect(effects:any[]) : Decision {
    return {
        title: 'Choose effect',
        options: effects
    };
}
