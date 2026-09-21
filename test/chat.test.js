const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { io: Client } = require('socket.io-client');
const { server, io, users } = require('../server');

let baseUrl;

function createClient() {
  return Client(baseUrl, { transports: ['websocket'], forceNew: true });
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  users.clear();
  await io.close();
});

test('dois clientes entram e trocam uma mensagem em tempo real', async () => {
  const felipe = createClient();
  const melissa = createClient();
  await Promise.all([once(felipe, 'connect'), once(melissa, 'connect')]);

  const join = (socket, name) => new Promise((resolve) => {
    socket.emit('user:join', name, resolve);
  });

  assert.equal((await join(felipe, 'Felipe')).ok, true);
  assert.equal((await join(melissa, 'Melissa')).ok, true);

  const received = once(melissa, 'chat:message');
  const sent = await new Promise((resolve) => {
    felipe.emit('chat:message', 'Olá em tempo real!', resolve);
  });

  assert.equal(sent.ok, true);
  assert.deepEqual(
    Object.fromEntries(Object.entries(await received).filter(([key]) => ['sender', 'text'].includes(key))),
    { sender: 'Felipe', text: 'Olá em tempo real!' },
  );

  felipe.disconnect();
  melissa.disconnect();
});
