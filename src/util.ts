import _ = require('underscore');

export function mapSum<T>(list:T[], f:(t:T)=>number) : number {
    return _.reduceRight<T, number>(list, function(acc, value) {
        return acc + f(value);
    }, 0);
}

export function reverse<T>(list:T[]) : T[] {
    return list.concat().reverse();
}

export function count(list:any[], target:any) : number {
    var c = 0;
    for (var i = 0; i < list.length; ++i){
        if (list[i] === target) {
            c++;
        }
    }
    return c;
}

export function isClient() : boolean {
    return window.location.href.match('^http') !== null;
}

export function duplicate<T>(o:T, n:number) : T[] {
    return _.times<T>(n, () => {
        return _.clone(o);
    });
}

export function removeFirst<T>(array:T[], o:T) : T[] {
    var index = array.indexOf(o);
    if (index != -1) {
        return array.slice(0, index).concat(array.slice(index + 1));
    } else {
        return array;
    }
}

export function labelRange(l:number, r:number) : string {
    if (l == r) {
        return l.toString();
    } else {
        return l + ' to ' + r;
    }
}

export function pluralize(noun:string, n:number) : string {
    return n == 1 ? noun : noun + 's';
}

export function possessive(noun:string) : string {
    return noun + "'s";
}

export function capitalize(s:string) : string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pad(num:number, size:number) : string {
    var s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

// Adapts a function which accepts an object or null to accept
// a zero or one element array.
export function adaptListToOption<T>(f:(t:T)=>void) : (ts:T[])=>void {
    return function(l:T[]) {
        if (l.length == 1) {
            f(l[0]);
        } else if (l.length == 0) {
            f(null);
        } else {
            console.error('adaptListToOption: unexpected list size', l, f);
        }
    }
}

export function onEnter($input:any, f:()=>void) {
    $input.keypress(function(e:any) {
        if (e.which === 13) {
            e.preventDefault();
            f();
            return false;
        }
    });
}

export interface AnyCallback {
    (x:any) : void;
}
