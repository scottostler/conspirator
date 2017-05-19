import * as $ from 'jquery';
import View from './view';

class CardView extends View {

    // Used to uniquely identify this CardView instance.
    // Can be singleton string for a specific global cardview (aka 'Trash'),
    // or the identifier from a specific card instance.
    //
    // No global registry is kept, so CardViews must be iterated in the view hierarchy
    // to find a particular CardView.
    identifier: string | null;

    $badge: any;
    $vpBadge: any;

    constructor(cardURL: string | null, identifier: string | null) {
        super();
        this.identifier = identifier;
        this.$el = $('<div>').addClass('card');
        this.$badge = $('<div>').addClass('badge count-badge badge-warning').hide();
        this.$vpBadge = null;
        this.$el.append(this.$badge);
        this.setCardImage(cardURL);
        this.$el.data('view', this);
    }

    // Can pass null to clear image.
    setCardImage(cardURL: string | null) {
        this.$el.find('.card-inner').remove();
        if (cardURL) {
            $('<img>').attr('src', cardURL).addClass('card-inner').appendTo(this.$el);
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

    unhighlight() {
        this.$el.removeClass('highlight not-highlight');
    }
}

export default CardView;
