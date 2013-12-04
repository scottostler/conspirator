/**
 * @constructor
 */
function View() {
    // All views expect this.$el.
}

View.prototype.addViews = function(views) {
    views.forEach(_.bind(function(v) {
        this.$el.append(v.$el);
    }, this));
}

/**
 * @constructor
 */
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

/**
 * @constructor
 */
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

/**
 * @constructor
 */
function HumanPlayerView(gameView, player, index) {
    this.gameView = gameView;
    this.player = player;
    this.$el = $('<div>').addClass('player-area human-player ' + PlayerLocations[index]);
    this.deckView = new CardView(Cards.Cardback)
    this.addViews([this.deckView]);

    this.discardView = new CardView();
    this.discardView.$el.addClass('discard');
    this.$el.append(this.discardView.$el);

    this.$handContainer = $('<div>').addClass('hand').appendTo(this.$el);
    this.cardViewsInHand = [];

    this.player.on(Player.PlayerUpdates.DrawCards, _.bind(function(cards) {
        cards.forEach(_.bind(function(card) {
            var cardView = new CardView(card);
            this.$handContainer.append(cardView.$el);
            this.cardViewsInHand.push(cardView);
        }, this));
        this.updateDeckAndDiscardViews();
    }, this));

    this.player.on(Player.PlayerUpdates.Shuffle, _.bind(this.updateDeckAndDiscardViews, this));

    this.player.on(Player.PlayerUpdates.DiscardCards, _.bind(function(cards) {
        cards.forEach(_.bind(function(card) {
            this.removeCardViewFromHand(this.viewForCard(card));
        }, this));
        this.updateDeckAndDiscardViews();
    }, this));

    this.player.on(Player.PlayerUpdates.PlayCard, _.bind(function(card) {
        this.removeCardViewFromHand(this.viewForCard(card));
        this.updateDeckAndDiscardViews();
    }, this));

    this.player.on(Player.PlayerUpdates.DiscardCardsFromDeck, _.bind(function() {
        console.log(Player.PlayerUpdates.DiscardCardsFromDeck);
        this.updateDeckAndDiscardViews();
    }, this));

    this.player.on(Player.PlayerUpdates.TrashCards, _.bind(function(cards) {
        cards.forEach(_.bind(function(card) {
            this.removeCardViewFromHand(this.viewForCard(card));
        }, this));
        this.gameView.updateTrashView();
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
    this.$el.find('.card').unbind('click').removeClass('selectable not-selectable selected');
};

HumanPlayerView.prototype.removeCardViewFromHand = function(cardView) {
    this.cardViewsInHand = _.without(this.cardViewsInHand, cardView);
    cardView.$el.remove();
};

/**
 * @constructor
 */
function GameStatusMessageLabel(game) {
    this.game = game;
    this.$message = $('#status-message');
    this.$counters = $('#status-counters');

    game.on('game-update', _.bind(function(update, description, object) {
        this.$message.text(description);
        this.updateStatusCounter();
    }, this));

    game.on('stat-update', _.bind(function() {
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

/**
 * @constructor
 */
function GameView(game, humanPlayerIndex) {
    this.$el = $('#game-container');
    this.game = game;

    this.pileViews = [];

    this.$inPlay = $('.in-play').empty();
    this.inPlayViews = [];

    var $playerViews = $('.player-areas').empty();
    this.playerViews = this.game.players.map(_.bind(function(p, i) {
        var view = new HumanPlayerView(this, p, i);
        $playerViews.append(view.$el);
        return view;
    }, this));

    this.$kingdomPiles = $('.kingdom-piles').empty();
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
        this.inPlayViews = [];
    }, this));

    this.game.on('trash-card-from-play', _.bind(function(card) {
        var cardView = this.viewForInPlayCard(card);
        this.inPlayViews = removeFirst(this.inPlayViews, cardView);
        cardView.$el.remove();
        this.updateTrashView();
    }, this));
}

GameView.prototype = new View();

GameView.prototype.handleGameUpdate = function(update, description, subject, object) {
    switch(update) {
        case Game.GameUpdates.BoughtCard:
        case Game.GameUpdates.GainedCard:
            this.viewForPile(object).updateCount();
            this.viewForPlayer(subject).updateDeckAndDiscardViews();
            break;
        case Game.GameUpdates.PlayedCard:
            var cardView = new CardView(object);
            this.inPlayViews.push(cardView);
            this.$inPlay.append(cardView.$el);
            break;
        case Game.GameUpdates.GameOver:
            this.showScoreSheet();
            break;
        case Game.GameUpdates.NextTurn:
            break;
        default:
            console.log('unhandled game update', update, description);
    }
};

GameView.prototype.viewForInPlayCard = function(card) {
    var cardView = _.find(this.inPlayViews, function(v) {
        return v.card === card;
    });

    if (!cardView) {
        console.error('Missing view for in play card', card);
    }

    return cardView;
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

GameView.prototype.updateTrashView = function() {
    var topCard = _.last(this.game.trash);
    this.trashView.setCardImage(topCard || Cards.Trash);
};

GameView.prototype.clearSelectionMode = function() {
    this.$kingdomPiles.find('.card')
        .removeClass('selectable not-selectable').unbind('click').unbind('hover');
    this.trashView.$el.removeClass('selectable not-selectable');

    this.playerViews.forEach(function(view) {
        view.clearSelectionMode();
    });
};

GameView.prototype.offerPileSelection = function(selectablePiles, allowCancel, onSelect) {
    this.clearSelectionMode();
    this.trashView.$el.addClass('not-selectable');

    var endSelection = _.bind(function(pile) {
        this.hideDoneButton();
        this.clearSelectionMode();
        onSelect(pile);
    }, this);

    _.each(this.pileViews, _.bind(function(pileView) {
        if (_.contains(selectablePiles, pileView.pile)) {
            pileView.$el.addClass('selectable').click(_.bind(function() {
                endSelection(pileView.pile);
            }, this));
        } else {
            pileView.$el.addClass('not-selectable');
        }
    }, this));

    if (allowCancel) {
        this.offerDoneButton(endSelection);
    }
};

GameView.prototype.offerHandSelection = function(minCards, maxCards, autoConfirm, selectableCards, onSelect) {
    var currentSelection = [];

    var endSelection = _.bind(function() {
        this.hideDoneButton();
        this.clearSelectionMode();
        onSelect(_.pluck(currentSelection, 'card'));
    }, this);

    var showOrHideDoneButton = _.bind(function() {
        if (currentSelection.length >= minCards) {
            this.offerDoneButton(endSelection);
        } else {
            this.hideDoneButton();
        }
    }, this);

    var cardToggleHandler = _.bind(function(cardView) {
        var wasSelected = cardView.$el.hasClass('selected');
        if (!wasSelected && currentSelection.length == maxCards) {
            alert("You've already selected " + maxCards + " " + pluralize('card', maxCards));
            return;
        }

        if (wasSelected) {
            currentSelection = removeFirst(currentSelection, cardView);
        } else {
            currentSelection.push(cardView);
        }

        if (currentSelection.length >= minCards && autoConfirm) {
            endSelection();
        } else {
            cardView.$el.toggleClass('selected');
            showOrHideDoneButton();
        }
    }, this);

    var playerView = this.viewForPlayer(this.game.activePlayer);
    _.each(playerView.cardViewsInHand, _.bind(function(cardView) {
        if (_.contains(selectableCards, cardView.card)) {
            cardView.$el.addClass('selectable').click(_.partial(cardToggleHandler, cardView));
        } else {
            cardView.$el.addClass('not-selectable');
        }
    }, this));

    showOrHideDoneButton();
};

// Prompt user to select one card or press done.
GameView.prototype.offerOptionalSingleHandSelection = function(selectableCards, onSelect) {
    if (arguments.length == 1) {
        onSelect = selectableCards;
        selectableCards = this.game.activePlayer.hand;
    }

    this.offerHandSelection(0, 1, true, selectableCards, adaptListToOption(onSelect));
};

// Prompt user to select one card.
GameView.prototype.offerSingleHandSelection = function(selectableCards, onSelect) {
    if (arguments.length == 1) {
        onSelect = selectableCards;
        selectableCards = this.game.activePlayer.hand;
    }

    this.offerHandSelection(1, 1, true, selectableCards, adaptListToOption(onSelect));
};

GameView.prototype.offerMultipleHandSelection = function(minCards, maxCards, selectableCards, onSelect) {
    if (arguments.length == 3) {
        onSelect = selectableCards;
        selectableCards = this.game.activePlayer.hand;
    }

    this.offerHandSelection(minCards, maxCards, false, selectableCards, onSelect);
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

GameView.prototype.showScoreSheet = function() {
    var scoresheet = new scoresheet(this.game, $('.scoresheet'));
    scoresheet.show();
};
