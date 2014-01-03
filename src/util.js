var _ = require('underscore');

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

exports.isClient = function() {
    return window.location.href.match('^http');
}

exports.repeat = function(o, n) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) {
        a[i] = _.isFunction(o) ? o() : o;
    }
    return a;
}

exports.removeFirst = function(array, o) {
    var index = array.indexOf(o);
    if (index != -1) {
        return array.slice(0, index).concat(array.slice(index + 1));
    } else {
        return array;
    }
}

exports.labelRange = function(l, r) {
    if (l == r) {
        return l;
    } else {
        return l + '-' + r;
    }
};

exports.pluralize = function(noun, n) {
    return n == 1 ? noun : noun + 's';
}

exports.possessive = function(noun) {
    return noun + "'s";
}

exports.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Adapts a function which accepts an object or null to accept
// a zero or one element array.
exports.adaptListToOption = function(f) {
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

exports.onEnter = function($input, f) {
    $input.keypress(function(e) {
        if (e.which === 13) {
            e.preventDefault();
            f();
            return false;
        }
    });
}

/**
 * @constructor
 */
function View() {
    // All views expect this.$el.
}

exports.View = View;

View.prototype.addViews = function(views) {
    views.forEach(_.bind(function(v) {
        this.$el.append(v.$el);
    }, this));
}
