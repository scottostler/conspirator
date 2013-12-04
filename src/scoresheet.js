/**
 * @constructor
 */
function ScoreSheet(game, $el) {
    this.game = game;
    this.$el = $el;

    this.$el.on('hidden', _.bind(this.close, this));

    this.$el.find('.modal-title').text('Game Over');

    this.$el.find('.modal-body').empty();
    this.buildSummaryView();
    this.buildPlayerViews();

    this.$el.find('.new-game').click(function() {
        window.dominion.beginGame();
    });
}

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
    
};