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

    this.deckView = new CardView(Cards.Cardback)
    this.addViews([this.deckView]);

    this.discardView = new CardView(null);
    this.discardView.$el.addClass('discard');
    this.$el.append(this.discardView.$el);

    this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
    this.cardViewsInHand = [];

    this.player.on(Player.PlayerUpdates.DrawCards, _.bind(this.drawCards, this));

    this.player.on(Player.PlayerUpdates.Shuffle, _.bind(this.updateDeckAndDiscardViews, this));

    this.player.on(Player.PlayerUpdates.DiscardCards, function(cards) {
        cards.forEach(function(card) {
            that.removeCardViewFromHand(that.viewForCard(card));
        });
        that.applyHandTransformations();
        that.updateDeckAndDiscardViews();
    });

    this.player.on(Player.PlayerUpdates.PlayCard, function(card) {
        that.removeCardViewFromHand(that.viewForCard(card));
        that.applyHandTransformations();
        that.updateDeckAndDiscardViews();
    });

    this.player.on(Player.PlayerUpdates.DiscardCardsFromDeck, function() {
        that.updateDeckAndDiscardViews();
    });

    this.player.on(Player.PlayerUpdates.TrashCards, function(cards) {
        cards.forEach(function(card) {
            that.removeCardViewFromHand(that.viewForCard(card));
        });
        that.applyHandTransformations();
        that.gameView.updateTrashView();
    });

    this.updateDeckAndDiscardViews();
}

PlayerView.prototype = Object.create(View.prototype);

PlayerView.prototype.updateDeckAndDiscardViews = function() {
    this.deckView.setCardImage(this.player.deck.length === 0 ? null : Cards.Cardback);
    this.deckView.setBadgeCount(this.player.deck.length);
    this.discardView.setCardImage(_.last(this.player.discard));
};

PlayerView.prototype.viewForCard = function(card) {
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
};

PlayerView.prototype.clearSelectionMode = function() {
    this.$el.find('.card').unbind('click').removeClass('selectable not-selectable selected');
};

// HumanPlayerView

/**
 * @constructor
 */
function HumanPlayerView(gameView, player, index) {
    PlayerView.call(this, gameView, player, index);
}

HumanPlayerView.prototype = Object.create(PlayerView.prototype);
HumanPlayerView.prototype.constructor = PlayerView;

HumanPlayerView.prototype.divClass = 'human-player';

HumanPlayerView.prototype.drawCards = function(cards) {
    var that = this;
    cards.forEach(function(card) {
        var cardView = new CardView(card);
        that.$handContainer.append(cardView.$el);
        that.cardViewsInHand.push(cardView);
    });
    this.applyHandTransformations();
    this.updateDeckAndDiscardViews();
};

HumanPlayerView.prototype.applyHandTransformations = function() {};

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

RemotePlayerView.prototype.drawCards = function(cards) {
    var that = this;
    cards.forEach(function(card) {
        var cardView = new CardView(card, !window.dominion.debug);
        that.$handContainer.append(cardView.$el);
        that.cardViewsInHand.push(cardView);
    });
    this.applyHandTransformations();
    this.updateDeckAndDiscardViews();
};

RemotePlayerView.prototype.applyHandTransformations = function() {
    var $cards = this.$handContainer.children();
    var leftMargin = 5;
    var degreeSpan = 45;
    var degrees = _.range(-degreeSpan, degreeSpan, degreeSpan * 2 / $cards.length);
    _.each($cards, function(cardView, i) {
        $(cardView).css({ rotate: degrees[i] });
    });
};