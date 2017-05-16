import * as _  from 'underscore';

import Decider from '../decider';
import { Decision } from '../decisions';

class RandomDecider extends Decider {

    constructor(label: string) {
        super();
        this.label = label;
    }

    decide<T>(decision: Decision<T>) : Promise<T[]> {
        const count = _.random(decision.minSelections, decision.maxSelections);
        const picked = _.sample<T>(decision.options, count);
        return Promise.resolve(picked);
    }
}

export default RandomDecider;