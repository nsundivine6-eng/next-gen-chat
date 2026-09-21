const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', ({ username, room }) => {
    socket.join(room);

    activeUsers.set(socket.id, {
      username,
      room
    });

    socket.to(room).emit('system_message', {
      text: `${username} joined the chat.`,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('send_message', (data) => {
    const payload = {
      id: Date.now(),
      sender: data.sender,
      message: data.message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    io.in(data.room).emit('receive_message', payload);
  });

  socket.on('typing', ({ room, username, isTyping }) => {
    socket.to(room).emit('user_typing', {
      username,
      isTyping
    });
  });

  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);

    if (user) {
      socket.to(user.room).emit('system_message', {
        text: `${user.username} left the chat.`,
        timestamp: new Date().toLocaleTimeString()
      });

      activeUsers.delete(socket.id);
    }

    console.log(`User Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
