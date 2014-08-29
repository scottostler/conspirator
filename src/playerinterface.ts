import _ = require('underscore');
import util = require('./util');
import game = require('./game');
import cards = require('./cards');
import base = require('./base');
import Player = require('./player');
import gameview = require('./gameview');
import decisions = require('./decisions');
import decider = require('./decider');

class PlayerInterface implements decider.Decider {
    
    player:base.BasePlayer;
    gameView:gameview.GameView;

    assertPlayer() {
        if (!this.player) {
            console.error('Missing valid player', this);
        }
    }

    // Must be set before any prompting
    setPlayer(player:base.BasePlayer) {
        this.player = player;
    }

    // This method solves a circular dependency between this and the gameView :(
    setGameView(gameView:gameview.GameView) {
        this.gameView = gameView;
    }

    // Prompting

    promptForPileSelection(piles:cards.Pile[], allowTreasures:boolean, allowCancel:boolean, onSelect:cards.PurchaseCallback) {
        this.assertPlayer();
        var message = allowTreasures ? 'Play treasure or buy card' : 'Gain card';
        this.gameView.showStatusMessage(message);

        this.gameView.offerPileSelection(this.player, piles, allowTreasures, allowCancel, (card, treasures) => {
            if (card) {
                // Auto-play basic treasures when buying.
                var basicTreasures = allowTreasures ? cards.getBasicTreasures(this.player.getHand()) : [];
                onSelect(card, basicTreasures);
            } else if (treasures) {
                onSelect(null, treasures);
            } else {
                onSelect(null, []);
            }
        });
    }

    defaultHandSelectionLabel(min:number, max:number) : string {
        return 'Select ' + util.labelRange(min, max) + ' ' + util.pluralize('card', max);
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], onSelect:cards.CardsCallback, label?:string) {
        this.assertPlayer();
        this.gameView.showStatusMessage(label ? label : this.defaultHandSelectionLabel(min, max));
        this.gameView.offerMultipleHandSelection(this.player, min, max, cards, onSelect);
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
        this.assertPlayer();
        this.gameView.offerCardSelection(this.player, cards, onOrder);
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.AnyCallback) {
        this.assertPlayer();
        this.gameView.offerOptions(decision.title, decision.options, onDecide);
    }

};

export = PlayerInterface;
