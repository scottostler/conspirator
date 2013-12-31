var _ = require('underscore');
var View = require('./util.js').View;

/**
 * @constructor
 */
function ScoreSheet(game, $el) {
    this.game = game;
    this.$el = $el;

    this.$el.on('hidden', _.bind(this.onClose, this));

    this.$el.find('.modal-title').text('Game Over');

    this.$el.find('.modal-body').empty();
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

ScoreSheet.prototype.buildSummaryView = function() {
    var $summary = $('<div>').addClass('summary');

    _.each(this.game.players, _.bind(function(player) {
        $summary.append($('<div>').text(player.name + ': ' + player.calculateScore() + ' VP'));
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
