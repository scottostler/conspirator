var _ = require('underscore');
var View = require('./util.js').View;
var cardview = require('./cardview.js');
var Card = require('./cards.js').Card;
var Cards = require('./cards.js').Cards;
var Player = require('./player.js');

var PlayerLocations = ['south', 'north', 'west', 'east'];
var PlayerColors = ['blue', 'red', 'green', 'yellow'];

/**
 * @constructor
 */
function PlayerView(gameView, player, index) {
    var that = this;
    this.gameView = gameView;
    this.player = player;

    var classes = ['player-area', this.divClass, PlayerLocations[index], PlayerColors[index]];
    this.$el = $('<div>').addClass(classes.join(' '));

    this.$nameLabel = $('<div>').text(player.name).addClass('name-label');
    this.$el.append(this.$nameLabel);

    this.deckView = new cardview.CardView(Cards.Cardback)
    this.addViews([this.deckView]);

    this.discardView = new cardview.CardView(null);
    this.discardView.$el.addClass('discard');
    this.$el.append(this.discardView.$el);

    this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
    this.cardViewsInHand = [];

    this.updateDeckAndDiscardViews();
}

PlayerView.prototype = Object.create(View.prototype);

PlayerView.prototype.updateDeckAndDiscardViews = function() {
    this.deckView.setCardImage(this.player.deckCount() === 0 ? null : Cards.Cardback);
    this.deckView.setBadgeCount(this.player.deckCount());
    this.discardView.setCardImage(this.player.topDiscard());
};

PlayerView.prototype.makeCardViewForCard = function(card) {
    return new cardview.CardView(card, !this.isActivePlayer());
};

PlayerView.prototype.viewForCard = function(card) {
    if (!card instanceof Card) {
        throw new Error('Illegal argument: ' + card);
    }

    var view = _.find(this.cardViewsInHand, function(view) {
        return view.card === card;
    });

    if (!view) {
        console.error('Missing card view', this, card);
    }

    return view;
}

PlayerView.prototype.removeCardViewFromHand = function(cardView) {
    this.cardViewsInHand = _.without(this.cardViewsInHand, cardView);
    cardView.$el.remove();
    this.applyHandTransformations();
};

PlayerView.prototype.removeCardFromHand = function(card) {
    var cardView = this.viewForCard(card);
    this.removeCardViewFromHand(cardView);
};

PlayerView.prototype.addCardToHand = function(card) {
    var cv = this.makeCardViewForCard(card);
    this.$handContainer.append(cv.$el);
    this.cardViewsInHand.push(cv);
    this.applyHandTransformations();
}

PlayerView.prototype.clearSelectionMode = function() {
    this.$el.find('.card')
        .off('click mouseenter mouseleave')
        .removeClass('selectable not-selectable selected highlight not-highlight');
};

PlayerView.prototype.drawCards = function(cards) {
    var that = this;

    _.each(cards, _.bind(this.addCardToHand, this));
    this.applyHandTransformations();
    this.updateDeckAndDiscardViews();
};

PlayerView.prototype.discardCards = function(cards) {
    _.each(cards, _.bind(this.removeCardFromHand, this));
    this.updateDeckAndDiscardViews();
};

// HumanPlayerView

/**
 * @constructor
 */
function HumanPlayerView(gameView, player, index) {
    PlayerView.call(this, gameView, player, index);
}

module.exports.HumanPlayerView = HumanPlayerView;

HumanPlayerView.prototype = Object.create(PlayerView.prototype);
HumanPlayerView.prototype.constructor = PlayerView;

HumanPlayerView.prototype.divClass = 'human-player';

HumanPlayerView.prototype.applyHandTransformations = function() {};

HumanPlayerView.prototype.isActivePlayer = function() {
    return true;
}

HumanPlayerView.prototype.highlightBasicTreasures = function() {
    _.each(this.cardViewsInHand, function(cv) {
        if (cv.card.isBasicTreasure()) {
            cv.$el.addClass('highlight');
        } else {
             cv.$el.addClass('not-highlight');
        }
    });
};

HumanPlayerView.prototype.unhighlightCardViews = function() {
    _.each(this.cardViewsInHand, function(cv) {
        cv.$el.removeClass('highlight not-highlight');
    });
};

// RemotePlayerView

/**
 * @constructor
 */
function RemotePlayerView(gameView, player, index) {
    PlayerView.call(this, gameView, player, index);
}

RemotePlayerView.prototype = Object.create(PlayerView.prototype);
RemotePlayerView.prototype.constructor = PlayerView;

RemotePlayerView.prototype.divClass = 'remote-player';

RemotePlayerView.prototype.applyHandTransformations = function() {
    var $cards = this.$handContainer.children();
    var leftMargin = 5;
    var degreeSpan = 45;
    var degrees = _.range(-degreeSpan, degreeSpan, degreeSpan * 2 / $cards.length);
    _.each($cards, function(cardView, i) {
        $(cardView).css({ rotate: degrees[i] });
    });
};

RemotePlayerView.prototype.isActivePlayer = function() {
    return false;
}

module.exports.RemotePlayerView = RemotePlayerView;
