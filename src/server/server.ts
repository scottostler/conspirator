import * as utils from '../utils';
import * as cards from '../cards';
import Game from '../game';
import { Player } from '../player';
import Decider from '../decider';
import SocketDecider from './socketdecider';

import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as http from 'http';
import * as socketIo from 'socket.io';

declare function require(name:string):any;
declare const process:any;

const app = express()
const server = http.createServer(app)
const io = socketIo.listen(server);

app.use(cookieParser());
app.use(express.session({ secret: 'double jack' }));
app.use('/assets', express.static('assets'));

app.get('/', (req:any, res:any) => {
    res.sendfile('index.html');
});

function startGame(playerNames: string[]) {
    const gameInstance = new Game(playerNames);


    gameInstance.start();
}

const numPlayers = 2;
const deciders: Decider[] = [];
io.sockets.on('connection', (socket: any) => {
    const playerName = 'Player ' + deciders.length + 1;
    const decider = new SocketDecider(socket);
    deciders.push(decider);

    socket.emit('log', 'Welcome, ' + playerName);
    socket.broadcast.emit('log', playerName + ' joins');

    socket.on('chat', function(message:any) {
        socket.broadcast.emit('chat', {
            name: playerName,
            message: message.text
        });
    });

    if (deciders.length === numPlayers) {
        const game = new Game(deciders.map(d => d.label));
        game.completeWithDeciders(deciders);
    }
});

const port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on ' + port);
