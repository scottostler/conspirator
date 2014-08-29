declare var requirejs:any;

requirejs.config({
    paths: {
        'underscore': '../assets/lib/underscore-min',
        'jquery': '../assets/lib/jquery-2.0.3.min',
        'jquery.transit': '../assets/lib/jquery.transit-0.9.9.min',
        'bootstrap': '../assets/bootstrap/bootstrap.min'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery.transit': ['jquery'],
        'bootstrap': ['jquery'],
    }
});

requirejs(['jquery.transit', 'bootstrap', 'main']);