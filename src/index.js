const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}\\index.html`);
});

const usersTyping = new Set();
const nicknameMap = {};

function userStartTyping(socket) {
  const userId = socket.id;
  const user = nicknameMap[userId];
  usersTyping.add(user);
  socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
}

function userStopTyping(socket) {
  const userId = socket.id;
  const user = nicknameMap[userId];
  if (usersTyping.has(user)) {
    usersTyping.delete(user);
  }
  socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
}

io.on('connection', (socket) => {
  const userId = socket.id;
  console.log(userId, 'connected');
  const initialNickname = `user-${userId}`;
  nicknameMap[userId] = initialNickname;
  socket.broadcast.emit('user connect', { user: initialNickname });
  socket.emit('set nickname', { nickname: initialNickname });
  socket.on('set nickname', (newNickname) => {
    console.log('Nickname change for userId', userId, '->', newNickname);
    nicknameMap[userId] = newNickname;
  });
  socket.on('disconnect', () => {
    userStopTyping(socket);
    socket.broadcast.emit('user disconnect', { user: nicknameMap[userId] });
    console.log(userId, 'disconnected');
  });
  socket.on('chat message', (msgData) => {
    console.log(`message from user ${msgData.user}: ${msgData.msg}`);
    socket.broadcast.emit('chat message', msgData);
  });
  socket.on('user start typing', () => {
    userStartTyping(socket);
  });
  socket.on('user stop typing', () => {
    userStopTyping(socket);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
