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

_.mixin({
    mapSum: function(list, iterator, context) {
        if (context) {
            iterator = _.bind(iterator, context);
        }
        return _.reduceRight(list, function(acc, value) {
            return acc + iterator(value);
        }, 0);
    }
});