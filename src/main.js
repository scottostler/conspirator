$(function() {

    function makeComputerPlayers(numPlayers) {
        var computerNames = ['Alice', 'Bob', 'Carlos'];
        return _.take(computerNames, numPlayers).map(function(name) {
            var AI = new ComputerAI(null);
            var player = new Player(name, AI);
            AI.player = player;
            return player;
        });
    }

    function beginGame() {
        var numPlayers = 2;
        var $canvas = $('#canvas');

        var forcedCards = [Cards.Gardens, Cards.Library];
        var randomCards = _.sample(
            _.difference(Cards.BaseSet, forcedCards),
            NumKingdomCards - forcedCards.length);
        var kingdomCards = forcedCards.concat(randomCards);

        var playerInterface = new PlayerInterface(null);
        var humanPlayer = new Player('Player', playerInterface);
        playerInterface.player = humanPlayer;
        var players = [humanPlayer].concat(makeComputerPlayers(numPlayers - 1));

        var game = new Game(kingdomCards, players);
        var gameView = new GameView(game, 0);

        playerInterface.setGameView(gameView);
        game.start();

        window.dominion = {
            g: game,
            gv: gameView,
            beginGame: beginGame
        };
    }

    $('.new-game').click(beginGame);

    beginGame();
});