function repeat(o, n) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) {
        a[i] = _.isFunction(o) ? o() : o;
    }
    return a;
}

function removeFirst(array, o) {
    var index = array.indexOf(o);
    if (index != -1) {
        return array.slice(0, index).concat(array.slice(index + 1));
    } else {
        return array;
    }
}

function reverseCopy(array) {
    return array.concat().reverse();
}

_.mixin({
    mapSum: function(list, iterator, context) {
        if (context) {
            iterator = _.bind(iterator, context);
        }
        return _.reduceRight(list, function(acc, value) {
            return acc + iterator(value);
        }, 0);
    },
    reverse: function(list) {
        return list.concat().reverse();
    }
});

function pluralize(noun, n) {
    return n == 1 ? noun : noun + 's';
}

// Adapts a function which accepts an object or null to accept
// an empty or single element array.
function adaptListToOption(f) {
    return function(l) {
        if (l.length == 1) {
            f(l[0]);
        } else if (l.length == 0) {
            f(null);
        } else {
            console.error('adaptListToOption: unexpected list size', l, f);
        }
    }
}
