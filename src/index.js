const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Express routes
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}\\index.html`);
});

// Socket.io-related logic
const usersTyping = new Set();
const nicknameMap = {};

const updateOnlineUsers = () => {
  io.allSockets().then((socketIds) => io.emit('update online users', {
    users: [...socketIds.keys()]
      .map((socketId) => nicknameMap[socketId])
      .sort(),
  }));
};

const setupNewConnection = (socket) => {
  const userId = socket.id;
  console.log(userId, 'connected');
  const initialNickname = `user-${userId}`;
  nicknameMap[userId] = initialNickname;
  updateOnlineUsers();
  socket.emit('user connect', { user: initialNickname });
  socket.emit('set nickname', { nickname: initialNickname });
};

const userStartTyping = (socket) => {
  const userId = socket.id;
  const user = nicknameMap[userId];
  usersTyping.add(user);
  socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
};

const userStopTyping = (socket) => {
  const userId = socket.id;
  const user = nicknameMap[userId];
  if (usersTyping.has(user)) {
    usersTyping.delete(user);
  }
  socket.broadcast.emit('users typing', { users: [...usersTyping.keys()] });
};

const getKeyByValue = (obj, searchValue) => Object.keys(obj).find(
  (key) => obj[key] === searchValue,
);

const setNickname = (socket, newNickname) => {
  const userId = socket.id;
  console.log('Nickname change for userId', userId, '->', newNickname);
  nicknameMap[userId] = newNickname;
  updateOnlineUsers();
};

const disconnect = (socket) => {
  const userId = socket.id;
  userStopTyping(socket);
  updateOnlineUsers();
  socket.broadcast.emit('user disconnect', { user: nicknameMap[userId] });
  console.log(userId, 'disconnected');
};

const handleChatMessage = (socket, msgData) => {
  console.log(
    `message from user ${msgData.user} to ${msgData.toUser || 'all'}: ${
      msgData.msg
    }`,
  );
  if (msgData.user === msgData.toUser) {
    return;
  }
  const isPrivateMessage = msgData.toUser;
  if (isPrivateMessage) {
    const targetSocketId = getKeyByValue(nicknameMap, msgData.toUser);
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('chat message', msgData);
    } else {
      socket.emit('chat message', { ...msgData, msg: 'User not found' });
    }
    return;
  }
  socket.broadcast.emit('chat message', msgData);
};

io.on('connection', (socket) => {
  setupNewConnection(socket);
  socket.on('set nickname', (newNickname) => setNickname(socket, newNickname));
  socket.on('disconnect', () => disconnect(socket));
  socket.on('chat message', (msgData) => handleChatMessage(socket, msgData));
  socket.on('user start typing', () => userStartTyping(socket));
  socket.on('user stop typing', () => userStopTyping(socket));
});

// Launching of our express server
server.listen(3000, () => {
  console.log('listening on *:3000');
});
