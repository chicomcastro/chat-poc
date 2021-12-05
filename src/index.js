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

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.broadcast.emit('user connect');
  socket.emit('set nickname', { nickname: `user-${socket.id}` });
  socket.on('disconnect', () => {
    socket.broadcast.emit('user disconnect');
    console.log('a user disconnected');
  });
  socket.on('chat message', (msgData) => {
    console.log(`message from user ${msgData.user}: ${msgData.msg}`);
    socket.broadcast.emit('chat message', msgData);
  });
  socket.on('user start typing', (data) => {
    const { user } = data;
    usersTyping.add(user);
    socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
  });
  socket.on('user stop typing', (data) => {
    const { user } = data;
    usersTyping.delete(user);
    socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
