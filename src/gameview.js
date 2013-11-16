
function View() {
    // All views expect this.$el.
}

View.prototype.addViews = function(views) {
    views.forEach(_.bind(function(v) {
        this.$el.append(v.$el);
    }, this));
}

function CardView(card) {
    this.card = card;
    this.$el = $('<div>').addClass('card');
    $('<img>').appendTo(this.$el);
    this.setCardImage(card);
}

CardView.prototype = new View();

CardView.prototype.setCardImage = function(card) {
    var $img = this.$el.find('img');
    $img.attr('src', card ? card.assetURL : '');
};

function PileView(pile) {
    this.pile = pile;

    this.$el = $('<div>').addClass('card');
    var $img = $('<img>').appendTo(this.$el);
    $img.attr('src', this.pile.card.assetURL);

    if (!pile.hideBadge) {
        this.$badge = $('<div>').text(this.pile.count).addClass('badge badge-warning');
        this.$el.append(this.$badge);
        this.updateCount();
    }
}

PileView.prototype = new View();

PileView.prototype.updateCount = function() {
    if (this.$badge) {
        this.$badge.text(this.pile.count);
    }
};

var PlayerLocations = ['south', 'north', 'west', 'east'];

function HumanPlayerView(player, index) {
    this.player = player;
    this.$el = $('<div>').addClass('player-area human-player ' + PlayerLocations[index]);
    this.deckView = new CardView(Cards.Cardback)
    this.addViews([this.deckView]);

    this.discardView = new CardView();
    this.discardView.$el.addClass('discard');
    this.$el.append(this.discardView.$el);

    this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
    this.cardViewsInHand = [];

    player.on('draw', _.bind(function(cards) {
        cards.forEach(_.bind(function(card) {
            var cardView = new CardView(card);
            this.$handContainer.append(cardView.$el);
            this.cardViewsInHand.push(cardView);
        }, this));
        this.updateDeckAndDiscardViews();
    }, this));

    player.on('discard', _.bind(function(cards) {
        cards.forEach(_.bind(function(card) {
            this.discardCardViewFromHand(this.viewForCard(card));
        }, this));

        this.updateDeckAndDiscardViews();
    }, this));

    player.on('played', _.bind(function(card) {
        this.discardCardViewFromHand(this.viewForCard(card));
        this.updateDeckAndDiscardViews();
    }, this));

    player.on('shuffle', _.bind(function() {
        this.updateDeckAndDiscardViews();
    }, this));
};

HumanPlayerView.prototype = new View();

HumanPlayerView.prototype.updateDeckAndDiscardViews = function() {
    this.deckView.setCardImage(this.player.deck.length === 0 ? null : Cards.Cardback);
    this.discardView.setCardImage(_.last(this.player.discard));
};

HumanPlayerView.prototype.viewForCard = function(card) {
    var view = _.find(this.cardViewsInHand, function(view) {
        return view.card === card;
    });

    if (!view) {
        console.error('Missing card view', this, card);
    }

    return view;
}

HumanPlayerView.prototype.clearSelectionMode = function() {
    this.$el.find('.card').unbind('click').removeClass('selectable not-selectable');
};

HumanPlayerView.prototype.discardCardViewFromHand = function(cardView) {
    this.cardViewsInHand = _.without(this.cardViewsInHand, cardView);
    cardView.$el.remove();
};

function GameStatusMessageLabel(game) {
    this.game = game;
    this.$message = $('#status-message');
    this.$counters = $('#status-counters');

    game.on('game-update', _.bind(function(update, description, object) {
        this.$message.text(description);
        this.updateStatusCounter();
    }, this));
}

GameStatusMessageLabel.prototype.updateStatusCounter = function() {
    this.$counters.find('.action-count').text(this.game.activePlayerActionCount);
    this.$counters.find('.buy-count').text(this.game.activePlayerBuyCount);
    this.$counters.find('.coin-count').text(this.game.activePlayerMoneyCount);
};

function reorderKingdomPileGroups(pileGroups) {
    var firstRow = [];
    var secondRow = [];

    pileGroups.forEach(function(group) {
        var midpoint = Math.ceil(group.length / 2);
        firstRow = firstRow.concat(group.slice(0, midpoint));
        secondRow = secondRow.concat(group.slice(midpoint));
    });

    return firstRow.concat(secondRow);
}

function GameView(game, humanPlayerIndex) {
    this.$el = $('#game-container');
    this.game = game;

    this.pileViews = [];

    this.$inPlay = $('.in-play');

    var $playerViews = $('.player-areas');
    this.playerViews = this.game.players.map(_.bind(function(p, i) {
        var view = new HumanPlayerView(p, i);
        $playerViews.append(view.$el);
        return view;
    }, this));

    this.$kingdomPiles = $('.kingdom-piles');
    reorderKingdomPileGroups(this.game.kingdomPileGroups).forEach(_.bind(function(pile, i) {
        var pileView = new PileView(pile);
        this.$kingdomPiles.append(pileView.$el);
        this.pileViews.push(pileView);
    }, this));

    this.trashView = new CardView(Cards.Trash);
    this.$kingdomPiles.append(this.trashView.$el);

    this.statusMessageLabel = new GameStatusMessageLabel(this.game);

    this.$doneButton = $('.done-button');

    this.game.on(Game.GameUpdate, _.bind(this.handleGameUpdate, this));

    this.game.on('empty-play-area', _.bind(function() {
        this.$inPlay.empty();
    }, this));
}

GameView.prototype = new View();

GameView.prototype.handleGameUpdate = function(update, description, object) {
    switch(update) {
        case Game.GameUpdates.BoughtCard:
            this.viewForPile(object).updateCount();
            this.viewForPlayer(this.game.activePlayer).updateDeckAndDiscardViews();
            break;
        case Game.GameUpdates.PlayedCard:
            var cardView = new CardView(object);
            this.$inPlay.append(cardView.$el);
            break;
        case Game.GameUpdates.NextTurn:
            break;
        default:
            console.log('unhandled game update', update, description);
    }
};

GameView.prototype.viewForPile = function(pile) {
    var pileView = _.find(this.pileViews, function(p) {
        return p.pile === pile;
    });

    if (!pileView) {
        console.error('Missing view for pile', pile);
    }

    return pileView;
};

GameView.prototype.viewForPlayer = function(player) {
    var playerView = _.find(this.playerViews, function(p) {
        return p.player === player;
    });

    if (!playerView) {
        console.error('Missing view for player', player);
    }

    return playerView;
};

GameView.prototype.showStatusMessage = function(message) {
    this.statusMessageLabel.$message.text(message);
};

GameView.prototype.clearSelectionMode = function() {
    this.$kingdomPiles.find('.card')
        .removeClass('selectable not-selectable').unbind('click').unbind('hover');
    this.trashView.$el.removeClass('selectable not-selectable');

    this.playerViews.forEach(function(view) {
        view.clearSelectionMode();
    });
};

GameView.prototype.offerPileSelection = function(selectablePiles, onSelect) {
    this.clearSelectionMode();

    this.trashView.$el.addClass('not-selectable');

    _.each(this.pileViews, _.bind(function(pileView) {
        if (_.contains(selectablePiles, pileView.pile)) {
            pileView.$el.addClass('selectable').click(_.bind(function() {
                this.clearSelectionMode();
                this.hideDoneButton();

                var treasures = this.game.activePlayer.getTreasuresInHand();
                onSelect(treasures, pileView.pile);
            }, this));
        } else {
            pileView.$el.addClass('not-selectable');
        }
    }, this));
};


GameView.prototype.offerHandSelection = function(selectableCards, onSelect) {
    this.clearSelectionMode();
    var playerView = this.viewForPlayer(this.game.activePlayer);

    _.each(playerView.cardViewsInHand, _.bind(function(cardView) {
        if (_.contains(selectableCards, cardView.card)) {
            cardView.$el.addClass('selectable').click(_.bind(function() {
                this.clearSelectionMode();
                this.hideDoneButton();

                onSelect(cardView.card);
            }, this));
        } else {
            cardView.$el.addClass('not-selectable');
        }
    }, this));
};

GameView.prototype.hideDoneButton = function() {
    this.$doneButton.hide().unbind('click');
};

GameView.prototype.offerDoneButton = function(onDone) {
    this.$doneButton.show().unbind('click').click(_.bind(function() {
        this.clearSelectionMode();
        this.hideDoneButton();
        onDone();
    }, this));
};

