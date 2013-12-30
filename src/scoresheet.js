/**
 * @constructor
 */
function ScoreSheet(game, $el) {
    this.game = game;
    this.$el = $el;

    this.$el.on('hidden', _.bind(this.close, this));

    this.sortedPlayers = _.sortBy(this.game.players, function(player) {
        return -player.calculateScore();
    });
    
    this.$el.find('.modal-body').empty();
    this.buildTitleView();
    this.buildSummaryView();
    this.buildPlayerViews();

    this.$el.find('.new-game').click(function() {
        window.dominion.beginGame();
    });
}

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
    var $tr;
    _.each(this.sortedPlayers, _.bind(function(player) {
        $tr = $('<tr>');
        $tr.append($('<td>').text(player.name + ': '));
        $tr.append($('<td>').text(player.calculateScore() + 'VP'));
        
        player.deckBreakdown = $('<div>');
        player.sortedDeck = _.sortBy(player.deck.concat(player.discard).concat(player.hand), function(card) {
            return card.name;
        });
        player.sortedDeck = _.sortBy(player.sortedDeck, function(card) {
            return -card.cost;
        });
        player.sortedDeck = _.sortBy(player.sortedDeck, function(card) {
            if (card.isVictory()) {
                return 0;
            } else if (card.isTreasure()) {
                return 1;
            } else {
                return 2;
            }
        });
        var index;
        var card;
        var currentCardView;
        var previousName = '';
        for (index = 0; index < player.sortedDeck.length; index++) {
            card = player.sortedDeck[index];
            if (card.name != previousName) {
                currentCardView = new CardView(card);
                player.deckBreakdown.append(currentCardView.$el);
                badgeCount = 1;
                currentCardView.setBadgeCount(badgeCount);
            } else {
                badgeCount++;
                currentCardView.setBadgeCount(badgeCount);
            }
            previousName = card.name;
        }
        $tr.append($('<td>').append(player.deckBreakdown));
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
    
};