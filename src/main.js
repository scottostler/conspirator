$(function() {

    function makeComputerPlayers(numPlayers) {
        var computerNames = ['Alice', 'Bob', 'Carlos'];
        var AI = new ComputerAI();
        return _.take(computerNames, numPlayers).map(function(name) {
            return new Player(name, AI);
        });
    }

    var numPlayers = 2;
    var $canvas = $('#canvas');
    var $log = $('#log');
    var kingdomCards = _.sample(Cards.BaseSet, NumKingdomCards);

    var playerInterface = new PlayerInterface();
    var humanPlayer = new Player('Player', playerInterface);
    var players = [humanPlayer].concat(makeComputerPlayers(numPlayers - 1));

    var game = new Game(kingdomCards, players);
    var gameView = new GameView(game, 0);

    playerInterface.setGameView(gameView);
    game.start();

    window.dominion = {
        g: game,
        gv: gameView
    };
});