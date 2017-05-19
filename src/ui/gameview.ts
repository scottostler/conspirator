import * as $ from 'jquery';
import * as _  from 'underscore';

import * as utils from '../utils';
import { GainDestination } from '../base';
import { Card, CardInPlay, CardsCallback, SupplyPile } from '../cards';
import { Decision, DecisionType } from '../decisions';
import { EventListener, GameEvent } from '../event';
import { CardRecord, GameRecord } from '../gamerecord';
import { PlayerIdentifier } from '../player';
import { getCardByName } from '../sets/cardlist';

import { PlayerView } from './playerview';
import CardView from './cardview';
import GameStateView from './gamestateview';

import ScoreSheet from './scoresheet';
import View from './view';

export class GameView extends View implements EventListener {

    gameRecord: GameRecord;
    humanPlayerIndex: number;

    pileViews: CardView[];
    $inPlay: JQuery;
    inPlayViews: CardView[];
    playerViews: PlayerView[];
    $kingdomPiles: JQuery;
    trashView: CardView;
    gameStateView: GameStateView;
    $statusMessageLabel: JQuery;
    $doneButton: JQuery;

    constructor(gameRecord: GameRecord, humanPlayerIndex: number) {
        super('.game-container');
        this.gameRecord = gameRecord;
        this.pileViews = [];

        this.$inPlay = $('.in-play').empty();
        this.inPlayViews = [];

        const $playerViews = $('.player-areas').empty();
        this.humanPlayerIndex = humanPlayerIndex;

        this.playerViews = _.map(gameRecord.players, (p, idx) => {
            const view = new PlayerView(p, idx);
            $playerViews.append(view.$el);
            return view;
        });

        this.$kingdomPiles = $('.kingdom-piles').empty();

        gameRecord.piles.forEach(pile => {
            const card = getCardByName(pile.card.name)
            const pileView = new CardView(cardImageURL(card), card.name);
            pileView.setBadgeCount(pile.count);
            
            this.$kingdomPiles.append(pileView.$el);
            this.pileViews.push(pileView);
        });

        this.trashView = new CardView(TrashImageURL, 'Trash');
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
                $('.card-preview img').attr('src', CardbackImageURL);
            }
        });

        $(document).on('mouseout', '.card', e => {
            $('.card-preview img').attr('src', CardbackImageURL);
        });
    }

    viewForInPlayCard(card: CardInPlay) : CardView {
        for (const view of this.inPlayViews) {
            if (view.identifier === card.identifier) {
                return view;
            }
        }
        throw new Error('Missing view for in-play card ' + card);
    }

    // Will return null if no pile exist, e.g. for prizes
    pileViewForCard(card: Card) : CardView {
        for (const view of this.pileViews) {
            if (view.identifier === card.name) {
                return view;
            }
        }
        throw new Error(`No pile for card ${card.name}`);
    }

    viewForPlayer(player: PlayerIdentifier) : PlayerView {
        for (const playerView of this.playerViews) {
            if (playerView.playerRecord.identifier === player) {
                return playerView;
            }
        }
        throw new Error('Missing playerView for ' + player)
    }

    get humanPlayerView() : PlayerView {
        return this.playerViews[this.humanPlayerIndex];
    }

    showStatusMessage(message: string) {
        this.$statusMessageLabel.text(message);
    }

    updateTrashPile() {
        const card = _.last<CardRecord>(this.gameRecord.trash);
        if (card) {
            this.trashView.setCardImage(cardImageURL(getCardByName(card.name)));
        } else {
            this.trashView.setCardImage(TrashImageURL);
        }
    }

    //// Player Interface Interaction

    clearSelectionMode() {
        this.gameStateView.hideExtraCoinIndicator();

        this.$kingdomPiles.find('.card')
            .removeClass('selectable not-selectable').unbind('click mouseenter mouseleave');
        this.trashView.$el.removeClass('selectable not-selectable');

        this.playerViews.forEach(view => {
            view.clearSelectionMode();
        });
    }

    // Used for buying or gaining cards from piles.
    offerPileSelection(selectablePiles: SupplyPile[], allowCancel: boolean, onSelect: CardsCallback) {
        this.clearSelectionMode();
        this.trashView.$el.addClass('not-selectable');

        const endSelection = (card: Card | null) => {
            this.hideDoneButton();
            this.clearSelectionMode();
            onSelect(card ? [card] : []);
        };

        const selectableCardNames = selectablePiles.map(p => p.card.name);
        const playerView = this.playerViews[this.humanPlayerIndex];

        for (const pileView of this.pileViews) {
            const identifier = pileView.identifier;
            if (identifier && selectableCardNames.includes(identifier)) {
                pileView.$el.addClass('selectable').click(() => {
                    const card = getCardByName(identifier);
                    endSelection(card);
                });
            } else {
                pileView.$el.addClass('not-selectable');
            }
        }

        if (allowCancel) {
            this.offerDoneButton(() => {
                endSelection(null);
            });
        }
    }

    offerHandSelection(minCards: number, maxCards: number, autoConfirm: boolean, selectableCardIdentifiers: string[], onSelect: utils.StringArrayCallback) {
        let currentSelection: CardView[] = [];

        const endSelection = () => {
            this.hideDoneButton();
            this.clearSelectionMode();
            const names: string[] = [];
            for (const v of currentSelection) {
                if (v.identifier) {
                    names.push(v.identifier);
                }
            }
            onSelect(names);
        };

        const showOrHideDoneButton = () => {
            if (currentSelection.length >= minCards) {
                this.offerDoneButton(endSelection);
            } else {
                this.hideDoneButton();
            }
        };

        const cardToggleHandler = (cardView: CardView) => {
            const wasSelected = cardView.$el.hasClass('selected');
            if (!wasSelected && currentSelection.length == maxCards) {
                alert("You've already selected " + maxCards + " " + utils.pluralize('card', maxCards));
                return;
            }

            if (wasSelected) {
                currentSelection = utils.removeFirst<CardView>(currentSelection, cardView);
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

        const playerView = this.playerViews[this.humanPlayerIndex];
        for (const cardView of playerView.cardViewsInHand) {
            if (_.contains(selectableCardIdentifiers, cardView.identifier)) {
                cardView.$el.addClass('selectable').click(_.partial(cardToggleHandler, cardView));
            } else {
                cardView.$el.addClass('not-selectable');
            }
        } 
        showOrHideDoneButton();
    }

    offerMultipleHandSelection(minCards: number, maxCards: number, selectableCardIdentifiers: string[], onSelect: utils.StringArrayCallback) {
        var autoConfirm = maxCards === 1;
        this.offerHandSelection(minCards, maxCards, autoConfirm, selectableCardIdentifiers, onSelect);
    }

    offerDecision<T>(decision: Decision<T>) : Promise<T[]> {
        return this.offerOptions("Make a decision", decision.options);
    }

    offerOptions(title: string, options: any[]) : Promise<any[]> {
        if (options.length < 1) {
            throw new Error('Invalid choices: ' + options);
        }

        var $modal = $('.choice');
        var $footer = $modal.find('.modal-footer');

        $modal.find('.modal-title').text(title);
        $footer.empty();

        return new Promise<any[]>((resolve, reject) => {
            _.each(options, option => {
                var $button = $('<button>').addClass('btn btn-primary').text(option).click(function() {
                    (<any>$modal).modal('hide');
                    resolve([option]);
                });
                $button.appendTo($footer);
            });

            (<any>$modal).modal({ 'keyboard': false, 'backdrop': 'static' });
        });
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

    showScoreSheet(allDecks: Card[][]) {
        const deckPairs: any = _.zip(this.gameRecord.players.map(p => p.name), allDecks); 
        const scoresheet = new ScoreSheet(deckPairs, $('.scoresheet'));
        scoresheet.show();
    }

    //// Game Listener

    log(msg: string) {
        var $log = $('.message-log');
        var $line = $('<div>').text(msg);
        $log.append($line).scrollTop($log[0].scrollHeight);
    }

    playAreaEmptied() {
        this.$inPlay.empty();
        this.inPlayViews = [];
    }

    playerDrewCards(player: PlayerIdentifier, cards: CardInPlay[]) {
        this.viewForPlayer(player).drawCards(cards);
    }

    playerGainedCard(player: PlayerIdentifier, card: CardInPlay, newCount: number, dest: GainDestination) {
        const playerView = this.viewForPlayer(player);
        const pileView = this.pileViewForCard(card);
        if (pileView) {
            pileView.setBadgeCount(newCount);
        }

        if (dest === GainDestination.Hand) {
            playerView.drawCards([card]);
        } else {
            playerView.updateDeckAndDiscardViews();
        }
    }

    playerGainedCardFromTrash(player: PlayerIdentifier, card: CardInPlay) {
        this.viewForPlayer(player).updateDeckAndDiscardViews();
        this.updateTrashPile();
    }

    playerPassedCard(player: PlayerIdentifier, targetPlayer: PlayerIdentifier, card: CardInPlay) {
        this.viewForPlayer(player).removeCardFromHand(card)
        this.viewForPlayer(targetPlayer).addCardToHand(card);
    }

    playerPlayedCard(player: PlayerIdentifier, card: CardInPlay) {
        var cardView = new CardView(cardImageURL(card), card.identifier);
        this.inPlayViews.push(cardView);
        this.$inPlay.append(cardView.$el);

        this.viewForPlayer(player).removeCardFromHand(card);
    }

    playerPlayedClonedCard(player: PlayerIdentifier, card:Card) {
        // TODO: visually highlight played card
    }

    playerDiscardedCards(player: PlayerIdentifier, cards: CardInPlay[]) {
        this.viewForPlayer(player).discardCards(cards);
    }

    playerDiscardedCardsFromDeck(player: PlayerIdentifier, cards: CardInPlay[]) {
        this.viewForPlayer(player).updateDeckAndDiscardViews();
    }

    playerTrashedCards(player: PlayerIdentifier, cards: CardInPlay[]) {
        const playerView = this.viewForPlayer(player);
        for (const card of cards) {
            playerView.removeCardFromHand(card);
        }
        this.updateTrashPile();
    }

    playerTrashedCardFromDeck(player: PlayerIdentifier, card: Card) {
        this.viewForPlayer(player).updateDeckAndDiscardViews();
        this.updateTrashPile();
    }

    playerRevealedCards(player: PlayerIdentifier, cards: CardInPlay[]) {
        // TODO: reveal animation?
    }

    trashCardFromPlay(card:CardInPlay) {
        const cardView = this.viewForInPlayCard(card);
        this.inPlayViews = utils.removeFirst(this.inPlayViews, cardView);
        cardView.$el.remove();
        this.updateTrashPile();
    }

    addCardToTrash(card: Card) {
        this.updateTrashPile();
    }

    gameEnded(decks:Card[][]) {
        this.showStatusMessage('Game over');
        this.showScoreSheet(decks);
    }

    //// EventListener

    handleEvent(event: GameEvent) {
        // TODO
    } 

}

// Card Images

var AssetRoot = 'assets/cards-296x473';

function rawCardImageURL(set:string, name:string) : string {
    var filename = name.toLowerCase().replace(/\s+/g, '') + '.jpg';
    return [AssetRoot, set, filename].join('/');
}

export function cardImageURL(card: Card | CardRecord) : string {
    return rawCardImageURL(card.set, card.name);
}

export var CardbackImageURL = rawCardImageURL('basecards', 'cardback');
export var TrashImageURL = rawCardImageURL('basecards', 'trash');
