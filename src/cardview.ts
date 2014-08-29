import util = require('./util');
import cards = require('./cards');
import View = require('./view');

var Card = cards.Card;

export class CardView extends View {

    card:cards.Card;
    $badge:any;
    $vpBadge:any;

    constructor(card:cards.Card, useCardback:boolean=false) {
        super();
        this.card = card;
        this.$el = $('<div>').addClass('card');
        this.$badge = $('<div>').addClass('badge count-badge badge-warning').hide();
        this.$vpBadge = null;
        this.$el.append(this.$badge);

        if (useCardback) {
            this.setCardImage(cards.cardbackURL());
        } else if (card) {
            this.setCardImage(card.assetURL);
        } else {
            this.setCardImage(null);
        }

        this.$el.data('view', this);
    }

    setCardImage(cardURL:string) {
        this.$el.find('.card-inner').remove();
        if (cardURL) {
            $('<img>').attr('src', cardURL).addClass('card-inner').appendTo(this.$el);
        } else {
            $('<span>').addClass('card-inner').appendTo(this.$el);
        }
    }

    setBadgeCount(count:number) {
        if (count === 0) {
            this.$badge.hide();
        } else {
            this.$badge.show().text(count);
        }
    }

    setVPBadgeCount(count:number) {
        if (!this.$vpBadge) {
            this.$vpBadge = $('<div>').addClass('badge vp-badge badge-success');
            this.$el.append(this.$vpBadge);
        }

        this.$vpBadge.text(count);
    }
}


export class PileView extends View {

    pile:cards.Pile;
    $badge:any;
    $vpBadge:any;

    constructor(pile:cards.Pile) {
        super();
        this.pile = pile;
        this.$el = $('<div>').addClass('card');
        var $img = $('<img>').appendTo(this.$el);
        $img.attr('src', this.pile.card.assetURL);

        this.$badge = $('<div>').text(this.pile.count).addClass('badge count-badge badge-warning');
        this.$el.append(this.$badge);
        this.updateCount(pile.count);

        this.$el.data('view', this);
    }

    updateCount(newCount:number) {
        if (this.$badge) {
            this.$badge.text(newCount);
        }
    }

    setVPBadgeCount(count:number) {
        if (!this.$vpBadge) {
            this.$vpBadge = $('<div>').addClass('badge vp-badge badge-success');
            this.$el.append(this.$vpBadge);
        }

        this.$vpBadge.text(count);
    }
}
