/// <reference path="../typings/jquery/jquery.d.ts" />
import $ = require('jquery');

class View {

    $el:any;

    constructor(selector:any='<div>') {
        this.$el = $(selector);
    }

    addViews(views:View[]) {
        views.forEach(v => {
            this.$el.append(v.$el);
        });
    }

}

export = View;
