declare var window: any;

export function mapSum<T>(list:T[], f:(t:T)=>number) : number {
    return list.reduce((acc, cur) => acc + f(cur), 0); 
}

export function isClient() : boolean {
    return typeof window === 'undefined';
}

export function removeFirst<T>(array: T[], o: T) : T[] {
    var index = array.indexOf(o);
    if (index != -1) {
        return array.slice(0, index).concat(array.slice(index + 1));
    } else {
        return array;
    }
}

export function labelRange(l: number, r: number) : string {
    if (l == r) {
        return l.toString();
    } else {
        return l + ' to ' + r;
    }
}

export function pluralize(noun: string, n: number) : string {
    return n == 1 ? noun : noun + 's';
}

export function possessive(noun: string) : string {
    return noun + "'s";
}

export function capitalize(s: string) : string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pad(num: number, size: number) : string {
    var s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

export function listToOption<T>(xs: T[]) : T | null {
    if (xs.length > 1) {
        throw new Error('listToOption given array of size ' + xs.length + ': ' + xs);
    }
    return xs.length == 1 ? xs[0] : null;
}

export function onEnter($input: any, f: ()=>void) {
    $input.keypress(function(e:any) {
        if (e.which === 13) {
            e.preventDefault();
            f();
            return false;
        }
    });
}

export interface AnyCallback {
    (x: any) : void;
}

export interface StringArrayCallback {
    (xs: string[]) : void;
}

/*
This file has no dependencies
GUID Creation
Project: https://github.com/Steve-Fenton/TypeScriptUtilities
Author: Steve Fenton
*/

export class Guid {
    static newGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
}
