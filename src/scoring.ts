import { Card } from './cards';
import * as utils from './utils';

export function calculateScore(deck: Card[]) : number {
    return utils.mapSum(deck, (card: Card) => {
        if (card.vp) {
            return card.vp.calculatePoints(deck);
        } else {
            return 0;
        }
    });
}
