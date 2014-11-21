import util = require('./util');
import _ = require('underscore');
import Player = require('./player');
import cards = require('./cards');
import game = require('./game');
import decisions = require('./decisions');
import decider = require('./decider');

export class AIDecider implements decider.Decider {

    player:Player;

    assertPlayer() {
        if (!this.player) {
            console.error('Missing valid player', this);
        }
    }

    setPlayer(player:Player) {
        this.player = player;
    }

    promptForPileSelection(piles:any, allowTreasures:boolean, allowCancel:boolean, label:string, onSelect:cards.PurchaseCallback) {
        this.assertPlayer();
        var treasures = allowTreasures ? cards.getTreasures(this.player.getHand()) : [];
        var selection:any = _.head(_.shuffle(piles));
        onSelect(selection.card, treasures);
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], label:string, onSelect:cards.CardsCallback) {
        this.assertPlayer();
        onSelect(_.sample<cards.Card>(cards, _.random(min, max)));
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
        this.assertPlayer();
        onOrder(_.shuffle<cards.Card>(cards));
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback) {
        this.assertPlayer();
        onDecide(_.sample(decision.options));
    }
}

export function makeComputerPlayers(numPlayers:number) : Player[] {
    if (numPlayers > 4 || numPlayers == 0) {
        throw new Error('Invalid number of players: ' + numPlayers);
    }

    var computerNames = ['Alice', 'Bob', 'Carl', 'Doug'];
    return _.take(computerNames, numPlayers).map(function(name) {
        return new Player(name, new AIDecider());
    });
}
