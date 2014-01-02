var _ = require('underscore');
var View = require('./util.js').View;
var cardview = require('./cardview.js');

/**
 * @constructor
 */
function ScoreSheet(game, $el) {
    this.game = game;
    this.$el = $el;

    this.$el.on('hidden', _.bind(this.onClose, this));

    this.sortedPlayers = _.sortBy(this.game.players, function(player) {
        return -player.calculateScore();
    });
    
    this.$el.find('.modal-body').empty();
    this.buildTitleView();
    this.buildSummaryView();
    this.buildPlayerViews();

    var that = this;
    this.$el.find('.new-game').click(function() {
        that.close();
        window.dominion.beginGame();
    });
}

module.exports = ScoreSheet;

ScoreSheet.prototype = new View();

ScoreSheet.prototype.buildTitleView = function() {
    if (this.sortedPlayers[0].calculateScore() == this.sortedPlayers[1].calculateScore()) {
        this.$el.find('.modal-title').text('Tie Game!');
    } else {
        this.$el.find('.modal-title').text(this.sortedPlayers[0].name + ' wins!');
    }
};

ScoreSheet.prototype.buildSummaryView = function() {
    var $summaryTable = $('<table>');
    var $summary = $('<div>').addClass('summary').append($summaryTable);
    _.each(this.sortedPlayers, _.bind(function(player) {
        var $tr = $('<tr>');

        $tr.append($('<td>').text(player.name + ': '));
        $tr.append($('<td>').text(player.calculateScore() + 'VP'));
        
        var sortedDeck = _.sortBy(player.getFullDeck(), function(card) {
            var index = '';
            if (card.isVictory()) {
                index += 'A';
            } else if (card.isTreasure()) {
                index += 'B';
            } else {
                index += 'C';
            }
            index += (9 - card.cost).toString(); // assumes card costs range 0-9
            index += card.name;
            return index;
        });

        var deckBreakdownHTML = $('<div>');
        var deckBreakdown = _.countBy(sortedDeck, function(card) {
            return card.name;
        });
        _.each(_.keys(deckBreakdown), function(cardName) {
            var currentCardView = new cardview.CardView(_.find(sortedDeck, function(card) {
                return card.name == cardName;
            }));
            currentCardView.setBadgeCount(deckBreakdown[cardName]);
            deckBreakdownHTML.append(currentCardView.$el);
        }, this);
        $tr.append($('<td>').append(deckBreakdownHTML));

        $summaryTable.append($tr);
    }, this));

    $summary.appendTo(this.$el.find('.modal-body'));
};

ScoreSheet.prototype.buildPlayerViews = function() {
};

ScoreSheet.prototype.show = function() {
    this.$el.modal('show');
};

ScoreSheet.prototype.close = function() {
    this.$el.modal('hide');
    this.onClose();
};

ScoreSheet.prototype.onClose = function() {
};
