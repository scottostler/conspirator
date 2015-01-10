import _ = require('underscore');
import util = require('../util');
import game = require('../game');
import cards = require('../cards');
import base = require('../base');
import Player = require('../player');
import decisions = require('../decisions');
import decider = require('../decider');
import gameview = require('./gameview');

class PlayerInterface implements decider.Decider {
    
    player:base.BasePlayer;
    gameView:gameview.GameView;

    assertPlayer() {
        if (!this.player) {
            console.error('Missing valid player', this);
        }
    }

    // TODO: this method solves a circular dependency between this and the gameView :(
    setGameView(gameView:gameview.GameView) {
        this.gameView = gameView;
    }


    // Must be set before any prompting
    setPlayer(player:base.BasePlayer) {
        this.player = player;
    }

    // Prompting

    promptForPileSelection(piles:cards.Pile[], allowTreasures:boolean, allowCancel:boolean, label:string, onSelect:cards.PurchaseCallback) {
        this.assertPlayer();
        this.gameView.showStatusMessage(label);

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

    fullHandSelectionLabel(min:number, max:number, label:string) : string {
        return 'Select ' + util.labelRange(min, max) + ' ' + util.pluralize('card', max) + ' to ' + label;
    }

    promptForHandSelection(min:number, max:number, cards:cards.Card[], label:string, onSelect:cards.CardsCallback) {
        this.assertPlayer();
        this.gameView.showStatusMessage(this.fullHandSelectionLabel(min, max, label));
        this.gameView.offerMultipleHandSelection(this.player, min, max, cards, onSelect);
    }

    promptForCardOrdering(cards:cards.Card[], onOrder:cards.CardsCallback) {
        this.assertPlayer();
        this.gameView.offerCardOrdering(this.player, cards, onOrder);
    }

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        this.assertPlayer();
        this.gameView.offerOptions('Make a decision', decision.options, onDecide);
    }

};

export = PlayerInterface;
