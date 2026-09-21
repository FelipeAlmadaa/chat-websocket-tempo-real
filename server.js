const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false },
  maxHttpBufferSize: 10_000,
});

const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', onlineUsers: users.size });
});

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function publicUsers() {
  return [...users.values()].map(({ id, name }) => ({ id, name }));
}

function broadcastPresence() {
  io.emit('presence:update', {
    count: users.size,
    users: publicUsers(),
  });
}

io.on('connection', (socket) => {
  socket.on('user:join', (rawName, acknowledge = () => {}) => {
    if (users.has(socket.id)) return;

    const name = cleanText(rawName, 24);
    if (name.length < 2) {
      acknowledge({ ok: false, error: 'Informe um nome com pelo menos 2 caracteres.' });
      return;
    }

    const user = { id: socket.id, name };
    users.set(socket.id, user);
    acknowledge({ ok: true, user });

    socket.broadcast.emit('system:message', {
      text: `${name} entrou na conversa.`,
      timestamp: Date.now(),
    });
    broadcastPresence();
  });

  socket.on('chat:message', (rawText, acknowledge = () => {}) => {
    const user = users.get(socket.id);
    const text = cleanText(rawText, 500);

    if (!user || !text) {
      acknowledge({ ok: false, error: 'Mensagem inválida.' });
      return;
    }

    const message = {
      id: `${socket.id}-${Date.now()}`,
      senderId: socket.id,
      sender: user.name,
      text,
      timestamp: Date.now(),
    };

    io.emit('chat:message', message);
    acknowledge({ ok: true, id: message.id });
  });

  socket.on('typing:start', () => {
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit('typing:start', user);
  });

  socket.on('typing:stop', () => {
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit('typing:stop', user);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;

    users.delete(socket.id);
    socket.broadcast.emit('typing:stop', user);
    socket.broadcast.emit('system:message', {
      text: `${user.name} saiu da conversa.`,
      timestamp: Date.now(),
    });
    broadcastPresence();
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Chat disponível em http://localhost:${PORT}`);
  });
}

module.exports = { app, server, io, users };
