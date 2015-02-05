# Conspirator

Conspirator is a Dominion game engine implemented in TypeScript,
including an HTML UI. Currently, the Baseset and Intrigue are
implemented.

To get started:

1) install node.js and npm, e.g. on a Mac:

    brew install node

2) install the project's dependencies

    npm install

3a) generate javascript

    grunt

3b) or to automatically re-generate the javascript on source code changes

    grunt watch

4) open index.html to start!

# Development

1) to automatically test compilation and run tests on commit:

    echo "grunt && grunt test" > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

2) to manually run tests

    run tests with: `grunt test`