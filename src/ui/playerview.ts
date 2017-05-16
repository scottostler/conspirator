import * as $ from 'jquery';
import * as _  from 'underscore';

import { Card, CardInPlay } from '../cards';
import { PlayerRecord } from '../gamerecord';

import { cardImageURL, CardbackImageURL } from './gameview';
import CardView from './cardview';
import View from './view';

const PlayerLocations = ['south', 'north'];
const PlayerColors = ['blue', 'red'];

export class PlayerView extends View {

    playerRecord: PlayerRecord;
    deckView: CardView;
    discardView: CardView;
    cardViewsInHand: CardView[];

    $nameLabel: JQuery;
    $handContainer: JQuery;

    constructor(playerRecord: PlayerRecord, index: number) {
        super();

        const classes = ['player-area', PlayerLocations[index], PlayerColors[index]];
        this.$el.addClass(classes.join(' '));

        this.playerRecord = playerRecord;
        this.$nameLabel = $('<div>').text(playerRecord.name).addClass('name-label');
        this.$el.append(this.$nameLabel);

        this.deckView = new CardView(null, 'Deck');
        this.addViews([this.deckView]);

        this.discardView = new CardView(null, 'Discard');
        this.discardView.$el.addClass('discard');
        this.$el.append(this.discardView.$el);

        this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
        this.cardViewsInHand = [];

        this.updateDeckAndDiscardViews();
    }

    updateDeckAndDiscardViews() {
        this.deckView.setCardImage(this.playerRecord.deckCount === 0 ? null : CardbackImageURL);
        this.deckView.setBadgeCount(this.playerRecord.deckCount);

        var topDiscard = this.playerRecord.topDiscard;
        this.discardView.setCardImage(topDiscard ? cardImageURL(topDiscard) : null);
    }

    makeCardViewForCard(card: CardInPlay) : CardView {
        return new CardView(cardImageURL(card), card.identifier);
    }

    viewForCardInHand(card: CardInPlay) : CardView {
        for (const view of this.cardViewsInHand) {
            if (view.identifier == card.identifier) {
                return view;
            }
        }

        throw new Error('Missing card view for ' + card);
    }

    removeCardViewFromHand(cardView: CardView) : void {
        this.cardViewsInHand = _.without(this.cardViewsInHand, cardView);
        cardView.$el.remove();
        this.applyHandTransformations();
    }

    removeCardFromHand(card: CardInPlay) {
        var cardView = this.viewForCardInHand(card);
        this.removeCardViewFromHand(cardView);
    }

    addCardToHand(card: CardInPlay) {
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

    drawCards(cards: CardInPlay[]) {
        for (const card of cards) {
            this.addCardToHand(card);
        }

        this.applyHandTransformations();
        this.updateDeckAndDiscardViews();
    }

    discardCards(cards:CardInPlay[]) {
        for (const card of cards) {
            this.removeCardFromHand(card);
        }
        this.updateDeckAndDiscardViews();
    }
    
    applyHandTransformations() {
        const $this = $(this);

        if (this.playerRecord.hand !== null) {
            $this.addClass('human-player');
            $this.removeClass('remote-player');
        } else {
            $this.removeClass('human-player');
            $this.addClass('remote-player');

            const cards = this.$handContainer.children().toArray();
            const leftMargin = 5;
            const degreeSpan = 45;
            const degrees = _.range(-degreeSpan, degreeSpan, degreeSpan * 2 / cards.length);

            for (let [i, cardView] of cards.entries()) {
                $(cardView).css({ rotate: degrees[i], transformOrigin: '10px bottom' });
            }
        }
    }

}
