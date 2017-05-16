import { Decision, DecisionType } from './decisions';

abstract class Decider {
    /// Optional identifying label for logging and debugging.
    label: string | null;
    abstract decide<T>(d: Decision<T>) : Promise<T[]>;
}

export default Decider;
