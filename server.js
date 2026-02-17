const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    let deck = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            deck.push({ suit: s, value: v });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        players[socket.id] = { id: socket.id, name: username, rows: null };
        io.emit('updatePlayers', Object.values(players));
    });

    socket.on('startGame', () => {
        let deck = createDeck();
        Object.keys(players).forEach(id => {
            players[id].rows = null; // 重置狀態
            io.to(id).emit('dealCards', deck.splice(0, 8));
        });
        io.emit('gameStatus', '大家努力排牌中...');
    });

    socket.on('submitRows', (rows) => {
        if (players[socket.id]) {
            players[socket.id].rows = rows;
            const allPlayers = Object.values(players);
            const submitted = allPlayers.filter(p => p.rows !== null);
            
            io.emit('gameStatus', `已有 ${submitted.length} 位玩家準備好開牌...`);

            // 當所有入咗房嘅人都交咗牌
            if (submitted.length === allPlayers.length && allPlayers.length > 0) {
                io.emit('revealCards', allPlayers); // 向所有人公開所有人的牌
                io.emit('gameStatus', '全部開牌！睇吓邊個贏！');
            }
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', Object.values(players));
    });
});

server.listen(3000, () => console.log('伺服器運行於 http://localhost:3000'));