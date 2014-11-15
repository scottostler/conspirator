import $ = require('jquery');
import _ = require('underscore');
import util = require('./util');
import playerview = require('./playerview');
import cardview = require('./cardview');
import cards = require('./cards');
import ScoreSheet = require('./scoresheet');
import View = require('./view');
import game = require('./game');
import base = require('./base');

export class GameStateView {

    $counters:any;
    copperValue:number;

    constructor() {
        this.$counters = $('.status-counters');
        this.copperValue = 1;
    }

    updateStatusCounter(update:base.TurnState) {
        this.$counters.find('.turn-label').text(
            util.possessive(update.activePlayer) + ' Turn ' + update.turnCount);

        this.$counters.find('.phase-label').text(
            base.TurnPhase[update.turnPhase] + ' Phase');

        this.$counters.find('.action-count').text(update.actionCount);
        this.$counters.find('.buy-count').text(update.buyCount);
        this.$counters.find('.coin-count').text(update.coinCount);
        this.$counters.find('.extra-coins').text('');

        this.copperValue = update.copperValue;
    }

    showExtraCoinIndicator(extraCoins:number) {
        if (extraCoins > 0) {
            this.$counters.find('.extra-coins').text('+' + extraCoins);
        }
    }

    hideExtraCoinIndicator() {
        this.$counters.find('.extra-coins').text('');
    }

}

function reorderKingdomPileGroups(pileGroups:cards.Pile[][]) : cards.Pile[] {
    var firstRow:cards.Pile[] = [];
    var secondRow:cards.Pile[] = [];

    pileGroups.forEach(function(group) {
        var midpoint = Math.ceil(group.length / 2);
        firstRow = firstRow.concat(group.slice(0, midpoint));
        secondRow = secondRow.concat(group.slice(midpoint));
    });

    return firstRow.concat(secondRow);
}

export class GameView extends View implements base.BaseGameListener {

    game:base.BaseGame;
    pileViews:cardview.PileView[];
    $inPlay:any;
    inPlayViews:any;
    playerViews:playerview.PlayerView[];
    $kingdomPiles:any;
    trashView:any;
    gameStateView:GameStateView;
    $statusMessageLabel:any;
    $doneButton:any;

    constructor(game:base.BaseGame, humanPlayerIndex:number) {
        super('.game-container');
        this.game = game;
        this.game.gameListener = this; // TODO: ugh
        this.pileViews = [];

        this.$inPlay = $('.in-play').empty();
        this.inPlayViews = [];

        var $playerViews = $('.player-areas').empty();
        this.playerViews = this.game.players.map((p, i) => {
            var view = i === humanPlayerIndex
                ? new playerview.HumanPlayerView(this, p, i)
                : new playerview.RemotePlayerView(this, p, i);
            $playerViews.append(view.$el);
            return view;
        });

        this.$kingdomPiles = $('.kingdom-piles').empty();
        reorderKingdomPileGroups(this.game.kingdomPileGroups).forEach((pile, i) => {
            var pileView = new cardview.PileView(pile);
            this.$kingdomPiles.append(pileView.$el);
            this.pileViews.push(pileView);
        });

        this.trashView = new cardview.CardView(cards.Trash);
        this.$kingdomPiles.append(this.trashView.$el);

        this.gameStateView = new GameStateView();
        this.$statusMessageLabel = $('.status-message');
        this.$doneButton = $('.done-button');

        this.setupMouseEvents();
    }

    setupMouseEvents() {
        $(document).on('mouseenter', '.card', e => {
            var view = $(e.currentTarget).data('view');
            var src = view.$el.find('img').attr('src');
            if (src) {
                $('.card-preview img').attr('src', src);
            } else {
                $('.card-preview img').attr('src', cards.cardbackURL());
            }
        });

        $(document).on('mouseout', '.card', e => {
            $('.card-preview img').attr('src', cards.cardbackURL());
        });
    }

    viewForInPlayCard(card:cards.Card) : cardview.CardView {
        var cardView = _.find(this.inPlayViews, function(v:cardview.CardView) {
            return v.card === card;
        });

        if (!cardView) {
            console.error('Missing view for in play card', card);
        }

        return cardView;
    }

    // Will return null if no pile exist, e.g. for prizes
    pileViewForCard(card:cards.Card) : cardview.PileView {
        return _.find(this.pileViews, function(p:cardview.PileView) {
            return p.pile.card === card;
        });
    }

    viewForPlayer(player:base.BasePlayer) : playerview.PlayerView {
        var playerView = _.find(this.playerViews, function(p:playerview.PlayerView) {
            return p.player === player;
        });

        if (!playerView) {
            console.error('Missing view for player', player);
        }

        return playerView;
    }

    showStatusMessage(message:string) {
        this.$statusMessageLabel.text(message);
    }

    setTrashViewCard(card?:cards.Card) {
        this.trashView.setCardImage(card ? card.assetURL : cards.Trash.assetURL);
    }

    // Player Interface Interaction

    clearSelectionMode() {
        this.gameStateView.hideExtraCoinIndicator();

        this.$kingdomPiles.find('.card')
            .removeClass('selectable not-selectable').unbind('click mouseenter mouseleave');
        this.trashView.$el.removeClass('selectable not-selectable');

        this.playerViews.forEach(function(view) {
            view.clearSelectionMode();
        });
    }

    // Used for buying or gaining cards from piles.
    // Optionally allows treasures in be played while buying.
    offerPileSelection(player:base.BasePlayer, selectablePiles:cards.Pile[], allowPlayTreasures:boolean, allowCancel:boolean, onSelect:cards.PurchaseCallback) {
        this.clearSelectionMode();
        this.trashView.$el.addClass('not-selectable');

        var endSelection:cards.PurchaseCallback = (card, treasure) => {
            this.hideDoneButton();
            this.clearSelectionMode();
            onSelect(card, treasure);
        };

        if (allowPlayTreasures) {
            var treasures = cards.getTreasures(player.getHand());
            this.offerHandSelection(player, 1, 1, true, treasures, util.adaptListToOption((card:cards.Card) => {
                endSelection(null, [card]);
            }));
        }

        var playerView = this.viewForPlayer(player);
        _.each(this.pileViews, (pileView:cardview.PileView) => {
            var isSelectable = _.some(selectablePiles, function(p:cards.Pile) {
                return p.card === pileView.pile.card;
            });
            if (isSelectable) {
                pileView.$el.addClass('selectable').click(() => {
                    endSelection(pileView.pile.card, null);
                });

                if (allowPlayTreasures) {
                    var basicTreasures = cards.getBasicTreasures(player.getHand());
                    var basicCoinMoney = util.mapSum(basicTreasures, card => {
                        if (card === cards.Copper) {
                            return this.gameStateView.copperValue;
                        } else {
                            return card.money;
                        }
                    });

                    pileView.$el.hover(() => {
                        playerView.highlightBasicTreasures();
                        this.gameStateView.showExtraCoinIndicator(basicCoinMoney);
                    }, () => {
                        playerView.unhighlightCardViews();
                        this.gameStateView.hideExtraCoinIndicator();
                    });
                }
            } else {
                pileView.$el.addClass('not-selectable');
            }
        });

        if (allowCancel) {
            this.offerDoneButton(() => {
                endSelection(null, null);
            });
        }
    }

    offerHandSelection(player:base.BasePlayer, minCards:number, maxCards:number, autoConfirm:boolean, selectableCards:cards.Card[], onSelect:cards.CardCallback) {
        var currentSelection:cardview.CardView[] = [];

        var endSelection = () => {
            this.hideDoneButton();
            this.clearSelectionMode();
            onSelect(_.pluck(currentSelection, 'card'));
        };

        var showOrHideDoneButton = () => {
            if (currentSelection.length >= minCards) {
                this.offerDoneButton(endSelection);
            } else {
                this.hideDoneButton();
            }
        };

        var cardToggleHandler = (cardView:cardview.CardView) => {
            var wasSelected = cardView.$el.hasClass('selected');
            if (!wasSelected && currentSelection.length == maxCards) {
                alert("You've already selected " + maxCards + " " + util.pluralize('card', maxCards));
                return;
            }

            if (wasSelected) {
                currentSelection = util.removeFirst<cardview.CardView>(currentSelection, cardView);
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
        _.each(playerView.cardViewsInHand, (cardView:cardview.CardView) => {
            if (_.contains(selectableCards, cardView.card)) {
                cardView.$el.addClass('selectable').click(_.partial(cardToggleHandler, cardView));
            } else {
                cardView.$el.addClass('not-selectable');
            }
        });

        showOrHideDoneButton();
    }

    offerMultipleHandSelection(player:base.BasePlayer, minCards:number, maxCards:number, selectableCards:cards.Card[], onSelect:cards.CardsCallback) {
        var autoConfirm = maxCards === 1;
        this.offerHandSelection(player, minCards, maxCards, autoConfirm, selectableCards, onSelect);
    }

    offerOptions(title:string, options:any[], onDecide:util.AnyCallback) {
        if (options.length < 1) {
            console.log('Invalid generic choice args', title, options);
        }

        var $modal = $('.choice');
        var $footer = $modal.find('.modal-footer');

        $modal.find('.modal-title').text(title);
        $footer.empty();

        _.each(options, option => {
            var label = option['getLabel'] ? option.getLabel() : option.toString();
            var $button = $('<button>').addClass('btn btn-primary').text(label).click(function() {
                (<any>$modal).modal('hide');
                onDecide(option);
            });
            $button.appendTo($footer);
        });

        (<any>$modal).modal('show');
    }

    offerCardOrdering(player:base.BasePlayer, cards:cards.Card[], onSelect:cards.CardsCallback) {
        var offerRemainingCards = (remainingCards:cards.Card[], pickedCards:cards.Card[]) => {
            this.offerOptions('Pick cards', remainingCards, card => {
                pickedCards = pickedCards.concat([card]);
                remainingCards = util.removeFirst<cards.Card>(remainingCards, card);
                if (remainingCards.length == 0) {
                    onSelect(pickedCards);
                } else {
                    offerRemainingCards(remainingCards, pickedCards);
                }
            });
        };

        offerRemainingCards(cards, []);
    }

    hideDoneButton() {
        this.$doneButton.hide().unbind('click');
    }

    offerDoneButton(onDone:()=>void) {
        this.$doneButton.show().unbind('click').click(() => {
            this.clearSelectionMode();
            this.hideDoneButton();
            onDone();
        });
    }

    showScoreSheet(decks:cards.Card[][]) {
        var scoresheet = new ScoreSheet(this.game, decks, $('.scoresheet'));
        scoresheet.show();
    }

    // Game Listener

    log(msg:string) {
        var $log = $('.message-log');
        var $line = $('<div>').text(msg);
        $log.append($line).scrollTop($log[0].scrollHeight);
    }

    stateUpdated(state:base.TurnState) {
        this.gameStateView.updateStatusCounter(state);
    }

    playAreaEmptied() {
        this.$inPlay.empty();
        this.inPlayViews = [];
    }

    playerDrewCards(player:base.BasePlayer, cards:cards.Card[]) {
        this.viewForPlayer(player).drawCards(cards);
    }

    playerGainedCard(player:base.BasePlayer, card:cards.Card, newCount:number, dest:base.GainDestination) {
        var playerView = this.viewForPlayer(player);
        var pileView = this.pileViewForCard(card);
        if (pileView) {
            pileView.updateCount(newCount);
        }

        if (dest === base.GainDestination.Hand) {
            playerView.drawCards([card]);
        } else {
            playerView.updateDeckAndDiscardViews();
        }
    }

    playerPassedCard(player:base.BasePlayer, targetPlayer:base.BasePlayer, card:cards.Card) {
        this.viewForPlayer(player).removeCardFromHand(card)
        this.viewForPlayer(targetPlayer).addCardToHand(card);
    }

    playerPlayedCard(player:base.BasePlayer, card:cards.Card) {
        var cardView = new cardview.CardView(card, false);
        this.inPlayViews.push(cardView);
        this.$inPlay.append(cardView.$el);

        this.viewForPlayer(player).removeCardFromHand(card);
    }

    playerPlayedClonedCard(player:base.BasePlayer, card:cards.Card) {
        // TODO: visually highlight played card
    }

    playerDiscardsCards(player:base.BasePlayer, cards:cards.Card[]) {
        this.viewForPlayer(player).discardCards(cards);
    }

    playerDiscardsCardsFromDeck(player:base.BasePlayer, cards:cards.Card[]) {
        this.viewForPlayer(player).updateDeckAndDiscardViews();
    }

    playerTrashesCards(player:base.BasePlayer, cards:cards.Card[]) {
        var playerView = this.viewForPlayer(player);
        _.each(cards, card => {
            playerView.removeCardFromHand(card);
        });
        this.setTrashViewCard(_.last(cards));
    }

    playerDrawsAndDiscardsCards(player:base.BasePlayer, drawn:cards.Card[], discard:cards.Card[]) {
        this.viewForPlayer(player).drawCards(drawn);
    }

    trashCardFromPlay(card:cards.Card) {
        var cardView = this.viewForInPlayCard(card);
        this.inPlayViews = util.removeFirst(this.inPlayViews, cardView);
        cardView.$el.remove();
        this.setTrashViewCard(card);
    }

    trashCardFromDeck(player:base.BasePlayer, card:cards.Card) {
        this.viewForPlayer(player).updateDeckAndDiscardViews();
        this.setTrashViewCard(card);
    }

    addCardToTrash(card:cards.Card) {
        this.setTrashViewCard(card);
    }

    gameEnded(decks:cards.Card[][]) {
        this.showStatusMessage('Game over');
        this.showScoreSheet(decks);
    }

}
