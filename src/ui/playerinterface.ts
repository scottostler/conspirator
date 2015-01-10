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

    promptForDecision(decision:decisions.Decision, onDecide:util.StringArrayCallback) {
        this.assertPlayer();
        this.gameView.offerOptions('Make a decision', decision.options, onDecide);
    }

};

export = PlayerInterface;
