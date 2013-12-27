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
function CardView(card, useCardback) {
    this.card = card;
    this.$el = $('<div>').addClass('card');
    $('<img>').appendTo(this.$el);

    this.$badge = $('<div>').addClass('badge badge-warning').hide();
    this.$el.append(this.$badge);

    if (card) {
        this.setCardImage(useCardback ? Cards.Cardback : card);
    }

    this.$el.data('view', this);
}

CardView.prototype = Object.create(View.prototype);

CardView.prototype.setCardImage = function(card) {
    var $img = this.$el.find('img');
    $img.attr('src', card ? card.assetURL : '');
};

CardView.prototype.setBadgeCount = function(count) {
    if (count === 0) {
        this.$badge.hide();
    } else {
        this.$badge.show().text(count);
    }
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

    this.$el.data('view', this);
}

PileView.prototype = Object.create(View.prototype);

PileView.prototype.updateCount = function() {
    if (this.$badge) {
        this.$badge.text(this.pile.count);
    }
};

/**
 * @constructor
 */
function GameStatusMessageLabel(game) {
    this.game = game;
    this.$message = $('.status-message');
    this.$counters = $('.status-counters');

    game.on('game-update', _.bind(this.updateStatusCounter, this))
    game.on('stat-update', _.bind(this.updateStatusCounter, this));
}

GameStatusMessageLabel.prototype.updateStatusCounter = function() {
    this.$counters.find('.turn-label').text(
        possessive(this.game.activePlayer.name) + ' Turn ' + this.game.turnCount);

    this.$counters.find('.phase-label').text(
        capitalize(this.game.turnState) + ' Phase ');

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
    var that = this;
    this.$el = $('.game-container');
    this.game = game;

    this.pileViews = [];

    this.$inPlay = $('.in-play').empty();
    this.inPlayViews = [];

    var $playerViews = $('.player-areas').empty();
    this.playerViews = this.game.players.map(function(p, i) {
        var view = i === humanPlayerIndex ? new HumanPlayerView(that, p, i) : new RemotePlayerView(that, p, i);
        $playerViews.append(view.$el);
        return view;
    });

    this.$kingdomPiles = $('.kingdom-piles').empty();
    reorderKingdomPileGroups(this.game.kingdomPileGroups).forEach(function(pile, i) {
        var pileView = new PileView(pile);
        that.$kingdomPiles.append(pileView.$el);
        that.pileViews.push(pileView);
    });

    this.trashView = new CardView(Cards.Trash);
    this.$kingdomPiles.append(this.trashView.$el);

    this.statusMessageLabel = new GameStatusMessageLabel(this.game);

    this.$doneButton = $('.done-button');

    this.game.on(Game.GameUpdate, _.bind(this.handleGameUpdate, this));

    this.game.on('empty-play-area', function() {
        that.$inPlay.empty();
        that.inPlayViews = [];
    });

    this.game.on('trash-card-from-play', function(card) {
        var cardView = this.viewForInPlayCard(card);
        that.inPlayViews = removeFirst(that.inPlayViews, cardView);
        cardView.$el.remove();
        that.updateTrashView();
    });

    this.game.on('add-card-to-trash', function(card) {
        that.updateTrashView();
    });

    this.game.on('log', function(msg) {
        var $log = $('.message-log');
        var $line = $('<div>').text(msg);
        $log.append($line).scrollTop($log[0].scrollHeight);
    });

    $(document).on('mouseenter', '.card', function(e) {
        var view = $(e.currentTarget).data('view');
        var src = view.$el.find('img').attr('src');
        if (src) {
            $('.card-preview img').attr('src', src);
        } else {
            $('.card-preview img').attr('src', Cards.Cardback.assetURL);
        }
    });

    $(document).on('mouseout', '.card', function(e) {
        $('.card-preview img').attr('src', Cards.Cardback.assetURL);
    });
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
            this.showStatusMessage('Game over');
            this.showScoreSheet();
            break;
        case Game.GameUpdates.NextTurn:
        case Game.GameUpdates.NextPhase:
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

GameView.prototype.offerHandSelection = function(player, minCards, maxCards, autoConfirm, selectableCards, onSelect) {
    var that = this;
    var currentSelection = [];

    var endSelection = function() {
        that.hideDoneButton();
        that.clearSelectionMode();
        onSelect(_.pluck(currentSelection, 'card'));
    };

    var showOrHideDoneButton = function() {
        if (currentSelection.length >= minCards) {
            that.offerDoneButton(endSelection);
        } else {
            that.hideDoneButton();
        }
    };

    var cardToggleHandler = function(cardView) {
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
    };

    var playerView = this.viewForPlayer(player);
    _.each(playerView.cardViewsInHand, function(cardView) {
        if (_.contains(selectableCards, cardView.card)) {
            cardView.$el.addClass('selectable').click(_.partial(cardToggleHandler, cardView));
        } else {
            cardView.$el.addClass('not-selectable');
        }
    });

    showOrHideDoneButton();
};

// Prompt user to select one card or press done.
GameView.prototype.offerOptionalSingleHandSelection = function(player, selectableCards, onSelect) {
    if (arguments.length == 2) {
        onSelect = selectableCards;
        selectableCards = player.hand;
    }

    this.offerHandSelection(player, 0, 1, true, selectableCards, adaptListToOption(onSelect));
};

// Prompt user to select one card.
GameView.prototype.offerSingleHandSelection = function(player, selectableCards, onSelect) {
    if (arguments.length == 2) {
        onSelect = selectableCards;
        selectableCards = player.hand;
    }

    this.offerHandSelection(player, 1, 1, true, selectableCards, adaptListToOption(onSelect));
};

GameView.prototype.offerMultipleHandSelection = function(player, minCards, maxCards, selectableCards, onSelect) {
    if (arguments.length == 4) {
        onSelect = selectableCards;
        selectableCards = player.hand;
    }

    var autoConfirm = maxCards === 1;
    this.offerHandSelection(player, minCards, maxCards, autoConfirm, selectableCards, onSelect);
};


GameView.prototype.hideDoneButton = function() {
    this.$doneButton.hide().unbind('click');
};

GameView.prototype.offerDoneButton = function(onDone) {
    var that = this;
    this.$doneButton.show().unbind('click').click(function() {
        that.clearSelectionMode();
        that.hideDoneButton();
        onDone();
    });
};

GameView.prototype.showScoreSheet = function() {
    var scoresheet = new ScoreSheet(this.game, $('.scoresheet'));
    scoresheet.show();
};
