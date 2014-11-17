import base = require('./base');

class TurnState {

    phase:base.TurnPhase;
    actionCount:number;
    playedActionCount:number;
    buyCount:number;
    coinCount:number;

    cardDiscount:number;
    copperValue:number;
    cardBought:boolean;

    constructor() {
        this.phase = base.TurnPhase.Action;
        this.actionCount = 1;
        this.playedActionCount = 0;
        this.buyCount = 1;
        this.coinCount = 0;

        this.cardDiscount = 0;
        this.copperValue = 1;
        this.cardBought = false;
    }
}



export = TurnState;