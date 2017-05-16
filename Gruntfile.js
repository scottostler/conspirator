module.exports = function (grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.initConfig({
        ts: {
            build: {
                src: ["src/**/*.ts"],
                outDir: 'build',
                tsconfig: true,
            },
        },

        mochaTest: {
            test: {
                options: {
                    require: 'ts-node/register'
                },
                src: ['src/**/*.ts', 'test/**/*.ts', "!src/ui/*.ts", "!src/server/*.ts"]
            },
        }

    });

    grunt.registerTask("default", ["ts:build"]);
    grunt.registerTask("test", ["mochaTest:test"]);
};
