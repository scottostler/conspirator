# Conspirator

Conspirator is a Dominion game engine implemented in TypeScript,
including an HTML UI. Currently, the Base set and Intrigue are
implemented.

To get started:

1) install node.js and npm, e.g. on a Mac:

    brew install node

2) install the project's dependencies

    npm install

3) generate javascript

    grunt

3a) or to automatically re-generate on changes

    grunt watch

4) open index.html to start!

5) run tests with: `grunt test`

# Development

1) to automatically test compilation and run tests on commit:
    echo "grunt && grunt test" > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
