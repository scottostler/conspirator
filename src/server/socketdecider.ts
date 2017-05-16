// SocketDecider proxies decisions to a connected socketio client.

import * as socketIo from 'socket.io';
import Decider from '../decider';
import { Decision } from '../decisions';

type PromiseCallbacks = [(arg: any) => void, (arg: any) => void];

class SocketDecider extends Decider {

    socket: SocketIO.Socket;
    pendingPromise: PromiseCallbacks | null;

    constructor(socket: SocketIO.Socket) {
        super();

        this.socket = socket;
        this.pendingPromise = null;

        this.socket.on('decision', (choices: any[]) => {
            if (!this.pendingPromise) {
                throw new Error('Decision made with no pending callback')
            }

            // Clear before invoking.
            const callbackPair = this.pendingPromise;
            this.pendingPromise = null;

            callbackPair[0](null);
        });
    }

    // When a SocketDecider is asked to make a decision, the
    // callback is saved until the player responds via the socket.
    // As players can only make one decision at a time,
    // at most one callback should be stored.
    assertNoCallback() {
        if (this.pendingPromise) {
            console.error('SocketDecider already has a stored promise pair', this.pendingPromise);
        }
    }

    decide<T>(d: Decision<T>) : Promise<T[]> {
        this.assertNoCallback();
        return new Promise<T[]>(function(resolve, reject) {
            this.pendingPromise = [resolve, reject];
        });
     }
}

export default SocketDecider;
