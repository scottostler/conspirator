module.exports = function (grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.initConfig({
        ts: {
            options: {
                noImplicitAny: true,
                compile: true,                 // perform compilation. [true (default) | false]
                comments: false,               // same as !removeComments. [true | false (default)]
                target: 'es3',                 // target javascript language. [es3 (default) | es5]
                module: 'amd',                 // target javascript module style. [amd (default) | commonjs]
                sourceMap: true,               // generate a source map for every output js file. [true (default) | false]
                sourceRoot: '',                // where to locate TypeScript files. [(default) '' == source ts location]
                mapRoot: '',                   // where to locate .map.js files. [(default) '' == generated js location.]
            },

            build: {
                src: ["src/**/*.ts"],
                html: ['src/html/*.tpl.html'],
                outDir: 'build',
            },

            watch: {
                src: ["src/**/*.ts"],
                html: ['src/html/*.tpl.html'],
                outDir: 'build',
                watch: 'src',
            },

            test: {
                options: {
                    module: 'commonjs',
                    sourceMap: false
                },
                src: ["src/**/*.ts", "test/**/*.ts", "!src/ui/*.ts", "!src/server/*.ts"],
                html: ['src/html/*.tpl.html'],
                outDir: 'build_test',
            }
        },

        mochaTest: {
            test: {
                options: {
                },
                src: ['build_test/**/*.js']
            },
        }

    });

    grunt.registerTask("default", ["ts:build"]);
    grunt.registerTask("watch", ["ts:watch"]);
    grunt.registerTask("test", ["ts:test", 'mochaTest:test']);
};