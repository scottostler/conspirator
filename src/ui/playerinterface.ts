import * as utils from '../utils';
import * as game from '../game';
import * as cards from '../cards';
import{ Decision } from '../decisions';

import Decider from '../decider';
import { GameView } from './gameview';

class PlayerInterface implements Decider {
    
    label: string | null;

    gameView: GameView;

    constructor(gameView: GameView) {
        this.gameView = gameView;
    }

    decide<T>(decision: Decision<T>) : Promise<T[]> {
        return this.gameView.offerDecision(decision);
    }

};

export default PlayerInterface;
