import * as cards from '../cards';
import * as decisions from '../decisions';
import Game from '../game';
import { Player } from '../player';
import * as util from '../utils';
import * as e from './common';

export const SetName = 'Seaside';

// TODO
// Ambassador

export const Bazaar = new cards.Card({
    name: 'Bazaar',
    cost: 5,
    effects: [e.DrawOneCard, e.GainTwoActions, e.GainOneCoin],
    set: SetName
});

// Caravan
// Cut Purse
// Embargo
// Explorer
// Fishing Village
// Ghost Ship
// Haven
// Island
// Lighthouse
// Lookout
// Merchant Ship
// Native Village
// Navigator
// Outpost
// Pearl Diver
// Pirate Ship
// Salvager
// Seahag
// Smugglers
// Tactician
// Treasure Map
// Treasury

export const Warehouse = new cards.Card({
    name: 'Warehouse',
    cost: 3,
    effects: [e.GainOneAction, e.DrawThreeCards, e.DiscardThreeCards],
    set: SetName
});

// Wharf


export var Cardlist:cards.Card[] = [
    // Ambassador,
    Bazaar,
    // Caravan,
    // CutPurse,
    // Embargo,
    // Explorer,
    // FishingVillage,
    // GhostShip,
    // Haven,
    // Island,
    // Lighthouse,
    // Lookout,
    // MerchantShip,
    // NativeVillage,
    // Navigator,
    // Outpost,
    // PearlDiver,
    // PirateShip,
    // Salvager,
    // Seahag,
    // Smugglers,
    // Tactician,
    // TreasureMap,
    // Treasury,
    Warehouse,
    // Wharf
];
