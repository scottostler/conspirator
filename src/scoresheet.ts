import _ = require('underscore');
import util = require('./util');
import base = require('./base');
import View = require('./view');
import cards = require('./cards');
import cardview = require('./cardview');
import scoring = require('./scoring')

class ScoreSheet extends View {

    game:base.BaseGame;
    sortedPlayers:base.BasePlayer[];
    fullDecks:cards.Card[][]
    scores:number[];

    constructor(game:base.BaseGame, fullDecks:cards.Card[][], selector:any) {
        super(selector);

        this.game = game;
        this.fullDecks = fullDecks;

        this.scores = _.map(game.players, player => {
            return scoring.calculateScore(this.deckForPlayer(player));
        });

        this.sortedPlayers = _.sortBy(game.players, player => {
            return -this.scoreForPlayer(player);
        });
        
        this.$el.find('.modal-body').empty();
        this.buildTitleView();
        this.buildSummaryView();

        this.$el.find('.new-game').click(() => {
            this.close();
            (<any>window).conspirator.beginLocalGame();
        });
    }

    deckForPlayer(player:base.BasePlayer) : cards.Card[] {
        var idx = this.game.players.indexOf(player);
        return this.fullDecks[idx];
    }

    scoreForPlayer(player:base.BasePlayer) : number {
        var idx = this.game.players.indexOf(player);
        return this.scores[idx];
    }

    buildTitleView() {
        var isTie = this.scoreForPlayer(this.sortedPlayers[0]) == this.scoreForPlayer(this.sortedPlayers[1]);
        var title = isTie ? 'Tie Game!' : this.sortedPlayers[0].getName() + ' wins!';
        this.$el.find('.modal-title').text(title);
    }

    sortKeyForCard(card:cards.Card) : string {
        var index = '';
        if (card.isVictory()) {
            index += 'A';
        } else if (card.isCurse()) {
            index += 'B';
        } else if (card.isTreasure()) {
            index += 'C';
        } else {
            index += 'D';
        }

        // assumes card costs range 0-99
        index += util.pad(99 - card.cost, 2);
        index += card.name;
        return index;
    }

    buildSummaryView() {
        var $summaryTable = $('<table class="scoresheet">');
        var $summary = $('<div>').addClass('summary').append($summaryTable);

        _.each(this.sortedPlayers, (player:base.BasePlayer) => {
            var $tr = $('<tr>');

            $tr.append($('<td>').text(player.getName() + ': '));
            $tr.append($('<td>').text(this.scoreForPlayer(player) + 'VP'));

            var sortedDeck = _.sortBy<cards.Card, string>(this.deckForPlayer(player), this.sortKeyForCard);
            var deckBreakdownHTML = $('<div>');
            var deckBreakdown = _.countBy<cards.Card>(sortedDeck, card => {
                return card.name;
            });
            var cardLookup = _.indexBy<cards.Card>(sortedDeck, card => {
                return card.name;
            });


            _.each(_.keys(deckBreakdown), cardName => {
                var card = cardLookup[cardName];
                var currentCardView = new cardview.CardView(card);
                currentCardView.setBadgeCount(deckBreakdown[cardName]);

                if (card.isVictory()) {
                    var vp = card.vp.calculatePoints(sortedDeck);
                    currentCardView.setVPBadgeCount(vp);
                }

                deckBreakdownHTML.append(currentCardView.$el);
            });

            $tr.append($('<td>').append(deckBreakdownHTML));
            $summaryTable.append($tr);
        });

        $summary.appendTo(this.$el.find('.modal-body'));
    }

    show() {
        this.$el.modal('show');
    }

    close() {
        this.$el.modal('hide');
    }
}

export = ScoreSheet;
