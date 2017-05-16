import * as _  from 'underscore';
import { pad } from '../utils';
import { Card } from '../cards';
import { calculateScore } from '../scoring';
import { cardImageURL } from './gameview';
import CardView from './cardview';
import View from './view';

type PlayerDeckPair = [string, Card[]];

interface ScoredDeckInfo {
    name: string;
    deck: Card[];
    score: number;
}

class ScoreSheet extends View {

    sortedDecks: ScoredDeckInfo[];

    constructor(decks: PlayerDeckPair[], selector: any) {
        super(selector);
        
        let scoredDecks = decks.map(d => {
            return { name: d[0], deck: d[1], score: calculateScore(d[1]) };
        });

        this.sortedDecks = _.sortBy(scoredDecks, d => -d.score);
        
        this.$el.find('.modal-body').empty();
        this.buildTitleView();
        this.buildSummaryView();

        this.$el.find('.new-game').click(() => {
            this.close();
            (<any>window).conspirator.beginLocalGame();
        });
    }

    buildTitleView() {
        if (this.sortedDecks.length < 2) {
            return;
        }

        var isTie = this.sortedDecks[0].score == this.sortedDecks[1].score;  
        var title = isTie ? 'Tie Game!' : this.sortedDecks[0].name + ' wins!';
        this.$el.find('.modal-title').text(title);
    }

    sortKeyForCard(card: Card) : string {
        var index = '';
        if (card.isVictory) {
            index += 'A';
        } else if (card.isCurse) {
            index += 'B';
        } else if (card.isTreasure) {
            index += 'C';
        } else {
            index += 'D';
        }

        // assumes card costs range 0-99
        index += pad(99 - card.cost, 2);
        index += card.name;
        return index;
    }

    buildSummaryView() {
        var $summaryTable = $('<table class="scoresheet">');
        var $summary = $('<div>').addClass('summary').append($summaryTable);

        for (const deck of this.sortedDecks) {
            const $tr = $('<tr>');
            $tr.append($('<td>').text(deck.name + ': '));
            $tr.append($('<td>').text(deck.score + ' VP'));

            const sortedDeck = _.sortBy<Card, string>(deck.deck, this.sortKeyForCard);
            const deckBreakdownHTML = $('<div>');
            const deckBreakdown = _.countBy<Card>(sortedDeck, card => {
                return card.name;
            });
            const cardLookup = _.indexBy<Card>(sortedDeck, card => {
                return card.name;
            });

            for (const cardName of Object.keys(deckBreakdown)) {
                var card = cardLookup[cardName];
                var currentCardView = new CardView(cardImageURL(card), null);
                currentCardView.setBadgeCount(deckBreakdown[cardName]);

                if (card.isVictory) {
                    const vp = card.vp.calculatePoints(sortedDeck);
                    currentCardView.setVPBadgeCount(vp);
                }

                deckBreakdownHTML.append(currentCardView.$el);
            };

            $tr.append($('<td>').append(deckBreakdownHTML));
            $summaryTable.append($tr);
        }

        $summary.appendTo(this.$el.find('.modal-body'));
    }

    show() {
        this.$el.modal('show');
    }

    close() {
        this.$el.modal('hide');
    }
}

export default ScoreSheet;
