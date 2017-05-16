import * as $ from 'jquery';

import * as base from '../base';
import * as cards from '../cards';
import { possessive } from '../utils';

class GameStateView {

    $counters:any;

    constructor() {
        this.$counters = $('.status-counters');
    }

    updateStatusCounter(update: base.GameState) {
        this.$counters.find('.turn-label').text(
            possessive(update.activePlayer) + ' Turn ' + update.turnCount);

        this.$counters.find('.phase-label').text(
            base.TurnPhase[update.turnState.phase] + ' Phase');

        this.$counters.find('.action-count').text(update.turnState.actionCount);
        this.$counters.find('.buy-count').text(update.turnState.buyCount);
        this.$counters.find('.coin-count').text(update.turnState.coinCount);
        this.$counters.find('.extra-coins').text('');
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

export default GameStateView;
