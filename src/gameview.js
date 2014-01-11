var _ = require('underscore');
var util = require('./util.js');
var playerview = require('./playerview.js');
var cardview = require('./cardview.js');
var Card = require('./cards.js').Card;
var Cards = require('./cards.js').Cards;
var ScoreSheet = require('./scoresheet.js');

/**
 * @constructor
 */
function GameStateView(game) {
    this.$counters = $('.status-counters');
}

GameStateView.prototype.updateStatusCounter = function(update) {
    this.$counters.find('.turn-label').text(
        util.possessive(update.activePlayer) + ' Turn ' + update.turnCount);

    this.$counters.find('.phase-label').text(
        util.capitalize(update.turnState) + ' Phase ');

    this.$counters.find('.action-count').text(update.actionCount);
    this.$counters.find('.buy-count').text(update.buyCount);
    this.$counters.find('.coin-count').text(update.coinCount);
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
        var view = i === humanPlayerIndex
            ? new playerview.HumanPlayerView(that, p, i)
            : new playerview.RemotePlayerView(that, p, i);
        $playerViews.append(view.$el);
        return view;
    });

    this.$kingdomPiles = $('.kingdom-piles').empty();
    reorderKingdomPileGroups(this.game.kingdomPileGroups).forEach(function(pile, i) {
        var pileView = new cardview.PileView(pile);
        that.$kingdomPiles.append(pileView.$el);
        that.pileViews.push(pileView);
    });

    this.trashView = new cardview.CardView(Cards.Trash);
    this.$kingdomPiles.append(this.trashView.$el);

    this.gameStateView = new GameStateView(this.game);
    this.$statusMessageLabel = $('.status-message');

    this.$doneButton = $('.done-button');

    this.game.on('log', function(msg) {
        var $log = $('.message-log');
        var $line = $('<div>').text(msg);
        $log.append($line).scrollTop($log[0].scrollHeight);
    });

    this.game.on('state-update', function(update) {
        that.gameStateView.updateStatusCounter(update);
    });

    this.game.on('empty-play-area', function() {
        that.$inPlay.empty();
        that.inPlayViews = [];
    });

    this.game.on('trash-card-from-play', function(card) {
        var cardView = that.viewForInPlayCard(card);
        that.inPlayViews = util.removeFirst(that.inPlayViews, cardView);
        cardView.$el.remove();
        that.setTrashViewCard(card);
    });

    this.game.on('trash-cards-from-hand', function(player, cards) {
        var playerView = that.viewForPlayer(player);
        _.each(cards, function(card) {
            playerView.removeCardFromHand(card);
        }, this);
        that.setTrashViewCard(_.last(cards));
    });

    this.game.on('add-card-to-trash', function(card) {
        that.setTrashViewCard(card);
    });


    this.game.on('game-over', function() {
        that.showStatusMessage('Game over');
        that.showScoreSheet();
    });

    this.game.on('play-card', function(player, card) {
        var cardView = new cardview.CardView(card, false);
        that.inPlayViews.push(cardView);
        that.$inPlay.append(cardView.$el);

        var playerView = that.viewForPlayer(player);
        playerView.removeCardFromHand(card);
    });

    this.game.on('gain-card', function(player, card) {
        var pileView = that.pileViewForCard(card);
        if (pileView) {
            pileView.updateCount();
        }

        that.viewForPlayer(player).updateDeckAndDiscardViews();
    });

    this.game.on('gain-card-into-hand', function(player, card) {
        var pileView = that.pileViewForCard(card);
        if (pileView) {
            pileView.updateCount();
        }

        that.viewForPlayer(player).drawCards([card]);
    });

    this.game.on('draw-cards', function(player, cards) {
        that.viewForPlayer(player).drawCards(cards);
    });

    this.game.on('discard-cards', function(player, cards) {
        var playerView = that.viewForPlayer(player);
        playerView.discardCards(cards);
    });

    this.game.on('draw-and-discard-cards', function(player, draw, discard) {
        var playerView = that.viewForPlayer(player);
        playerView.drawCards(draw);
    });

    this.game.on('discard-cards-from-deck', function(player, num) {
        that.viewForPlayer(player).updateDeckAndDiscardViews();
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

module.exports.GameView = GameView;

GameView.prototype = new util.View();

GameView.prototype.viewForInPlayCard = function(card) {
    var cardView = _.find(this.inPlayViews, function(v) {
        return v.card === card;
    });

    if (!cardView) {
        console.error('Missing view for in play card', card);
    }

    return cardView;
};

// Will return null if no pile exist, e.g. for prizes
GameView.prototype.pileViewForCard = function(card) {
    return _.find(this.pileViews, function(p) {
        return p.pile.card === card;
    });
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
    this.$statusMessageLabel.text(message);
};

GameView.prototype.setTrashViewCard = function(card) {
    this.trashView.setCardImage(card || Cards.Trash);
};

// Player Interface Interaction

GameView.prototype.clearSelectionMode = function() {
    this.$kingdomPiles.find('.card')
        .removeClass('selectable not-selectable').unbind('click').unbind('hover');
    this.trashView.$el.removeClass('selectable not-selectable');

    this.playerViews.forEach(function(view) {
        view.clearSelectionMode();
    });
};

GameView.prototype.offerPileSelection = function(player, selectablePiles, allowCancel, allowPlayTreasures, onSelect) {
    this.clearSelectionMode();
    this.trashView.$el.addClass('not-selectable');
    var that = this;

    var endSelection = function(pile) {
        that.hideDoneButton();
        that.clearSelectionMode();
        onSelect(pile, null);
    };

    if (allowPlayTreasures) {
        var treasures = player.
        this.offerHandSelection(player, 1, 1, true, )
    }

    _.each(this.pileViews, function(pileView) {
        var isSelectable = _.some(selectablePiles, function(p) {
            return p.card === pileView.pile.card;
        });
        if (isSelectable) {
            pileView.$el.addClass('selectable').click(function() {
                endSelection(pileView.pile);
            });
        } else {
            pileView.$el.addClass('not-selectable');
        }
    });

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
            alert("You've already selected " + maxCards + " " + util.pluralize('card', maxCards));
            return;
        }

        if (wasSelected) {
            currentSelection = util.removeFirst(currentSelection, cardView);
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

    this.offerHandSelection(player, 0, 1, true, selectableCards, util.adaptListToOption(onSelect));
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
