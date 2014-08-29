/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />
import $ = require('jquery');
import _ = require('underscore');

import util = require('./util');
import base = require('./base');
import View = require('./view');
import cards = require('./cards');
import gameview = require('./gameview');
import cardview = require('./cardview');

var Card = cards.Card;

var PlayerLocations = ['south', 'north', 'west', 'east'];
var PlayerColors = ['blue', 'red', 'green', 'yellow'];

export class PlayerView extends View {

    player:base.BasePlayer;
    gameView:gameview.GameView;
    deckView:cardview.CardView;
    discardView:cardview.CardView;
    cardViewsInHand:cardview.CardView[];

    $nameLabel:any;
    $handContainer:any;

    constructor(gameView:gameview.GameView, player:base.BasePlayer, index:number) {
        super();

        var classes = ['player-area', this.divClass(), PlayerLocations[index], PlayerColors[index]];
        this.$el.addClass(classes.join(' '));

        this.player = player;
        this.gameView = gameView;

        this.$nameLabel = $('<div>').text(player.getName()).addClass('name-label');
        this.$el.append(this.$nameLabel);

        this.deckView = new cardview.CardView(null, true)
        this.addViews([this.deckView]);

        this.discardView = new cardview.CardView(null);
        this.discardView.$el.addClass('discard');
        this.$el.append(this.discardView.$el);

        this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
        this.cardViewsInHand = [];

        this.updateDeckAndDiscardViews();
    }

    updateDeckAndDiscardViews() {
        this.deckView.setCardImage(this.player.deckCount() === 0 ? null : cards.cardbackURL());
        this.deckView.setBadgeCount(this.player.deckCount());

        var topDiscard = this.player.topDiscard();
        this.discardView.setCardImage(topDiscard ? topDiscard.assetURL : null);
    }

    makeCardViewForCard(card:cards.Card) : cardview.CardView {
        return new cardview.CardView(card, !this.isActivePlayer());
    }

    viewForCard(card:cards.Card) : cardview.CardView {
        var view = _.find(this.cardViewsInHand, function(view:any) {
            return view.card === card;
        });

        if (!view) {
            console.error('Missing card view', this, card);
        }

        return view;
    }

    removeCardViewFromHand(cardView:cardview.CardView) : void {
        this.cardViewsInHand = _.without(this.cardViewsInHand, cardView);
        cardView.$el.remove();
        this.applyHandTransformations();
    }

    removeCardFromHand(card:cards.Card) {
        var cardView = this.viewForCard(card);
        this.removeCardViewFromHand(cardView);
    }

    addCardToHand(card:cards.Card) {
        var cv = this.makeCardViewForCard(card);
        this.$handContainer.append(cv.$el);
        this.cardViewsInHand.push(cv);
        this.applyHandTransformations();
    }

    clearSelectionMode() {
        this.$el.find('.card')
            .off('click mouseenter mouseleave')
            .removeClass('selectable not-selectable selected highlight not-highlight');
    }

    drawCards(cards:cards.Card[]) {
        _.each(cards, _.bind(this.addCardToHand, this));
        this.applyHandTransformations();
        this.updateDeckAndDiscardViews();
    }

    discardCards(cards:cards.Card[]) {
        _.each(cards, _.bind(this.removeCardFromHand, this));
        this.updateDeckAndDiscardViews();
    }

    // Abstract methods

    divClass() : string {
        throw new Error('Unimplemented');
    }


    isActivePlayer() : boolean {
        throw new Error('Unimplemented');
    }

    applyHandTransformations() {
        throw new Error('Unimplemented');
    }

    highlightBasicTreasures() {}

    unhighlightCardViews() {}

}

export class HumanPlayerView extends PlayerView {

    divClass() {
        return 'human-player';
    }

    applyHandTransformations() {}

    isActivePlayer() {
        return true;
    }


    highlightBasicTreasures() {
        _.each(this.cardViewsInHand, function(cv:any) {
            if (cv.card.isBasicTreasure()) {
                cv.$el.addClass('highlight');
            } else {
                 cv.$el.addClass('not-highlight');
            }
        });
    }

    unhighlightCardViews() {
        _.each(this.cardViewsInHand, function(cv:any) {
            cv.$el.removeClass('highlight not-highlight');
        });
    }

}

export class RemotePlayerView extends PlayerView {

    divClass() {
        return 'remote-player';
    }

    applyHandTransformations() {
        var $cards = this.$handContainer.children();
        var leftMargin = 5;
        var degreeSpan = 45;
        var degrees = _.range(-degreeSpan, degreeSpan, degreeSpan * 2 / $cards.length);

        _.each($cards, (cardView, i) => {
            $(cardView).css({ rotate: degrees[i], transformOrigin: '10px bottom' });
        });
    }

    isActivePlayer() {
        return false;
    }

}
