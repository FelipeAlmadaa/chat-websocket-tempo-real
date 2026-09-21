const socket = io({ autoConnect: true });

const elements = {
  dialog: document.querySelector('#join-dialog'),
  joinForm: document.querySelector('#join-form'),
  nameInput: document.querySelector('#name-input'),
  joinError: document.querySelector('#join-error'),
  messageForm: document.querySelector('#message-form'),
  messageInput: document.querySelector('#message-input'),
  sendButton: document.querySelector('#send-button'),
  messageList: document.querySelector('#message-list'),
  typingStatus: document.querySelector('#typing-status'),
  userList: document.querySelector('#user-list'),
  onlineCount: document.querySelector('#online-count'),
  connectionDot: document.querySelector('#connection-dot'),
  connectionLabel: document.querySelector('#connection-label'),
};

let currentUser = null;
let desiredName = '';
let typingTimer;
let isTyping = false;
const typingUsers = new Map();

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  }).format(timestamp);
}

function scrollToLatest() {
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function addChatMessage(message) {
  const item = document.createElement('li');
  const mine = message.senderId === socket.id;
  item.className = `message${mine ? ' mine' : ''}`;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const sender = document.createElement('strong');
  sender.textContent = mine ? 'Você' : message.sender;
  const time = document.createElement('time');
  time.dateTime = new Date(message.timestamp).toISOString();
  time.textContent = formatTime(message.timestamp);
  meta.append(sender, time);

  const bubble = document.createElement('p');
  bubble.className = 'message-bubble';
  bubble.textContent = message.text;
  item.append(meta, bubble);
  elements.messageList.append(item);
  scrollToLatest();
}

function addSystemMessage(message) {
  const item = document.createElement('li');
  item.className = 'system-message';
  item.textContent = `${message.text} · ${formatTime(message.timestamp)}`;
  elements.messageList.append(item);
  scrollToLatest();
}

function updateTypingLabel() {
  const names = [...typingUsers.values()];
  if (!names.length) elements.typingStatus.textContent = '';
  else if (names.length === 1) elements.typingStatus.textContent = `${names[0]} está digitando…`;
  else elements.typingStatus.textContent = `${names.slice(0, 2).join(' e ')} estão digitando…`;
}

function stopTyping() {
  clearTimeout(typingTimer);
  if (isTyping) socket.emit('typing:stop');
  isTyping = false;
}

function join(name) {
  socket.emit('user:join', name, (result) => {
    if (!result.ok) {
      elements.joinError.textContent = result.error;
      return;
    }

    desiredName = name;
    currentUser = result.user;
    elements.dialog.close();
    elements.messageInput.disabled = false;
    elements.sendButton.disabled = false;
    elements.messageInput.focus();
  });
}

elements.joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  elements.joinError.textContent = '';
  join(elements.nameInput.value.trim());
});

elements.messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = elements.messageInput.value.trim();
  if (!text) return;

  elements.sendButton.disabled = true;
  socket.emit('chat:message', text, (result) => {
    elements.sendButton.disabled = false;
    if (result.ok) {
      elements.messageInput.value = '';
      stopTyping();
    }
    elements.messageInput.focus();
  });
});

elements.messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing:start');
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 900);
});

socket.on('connect', () => {
  elements.connectionDot.className = 'connection-dot connected';
  elements.connectionLabel.textContent = 'Conectado';
  if (desiredName && !currentUser) join(desiredName);
});

socket.on('disconnect', () => {
  currentUser = null;
  elements.connectionDot.className = 'connection-dot disconnected';
  elements.connectionLabel.textContent = 'Reconectando…';
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  typingUsers.clear();
  updateTypingLabel();
});

socket.on('chat:message', addChatMessage);
socket.on('system:message', addSystemMessage);

socket.on('presence:update', ({ count, users }) => {
  elements.onlineCount.textContent = count;
  elements.userList.replaceChildren(...users.map((user) => {
    const item = document.createElement('li');
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = user.name.slice(0, 2).toUpperCase();
    const name = document.createElement('span');
    name.textContent = user.id === socket.id ? `${user.name} (você)` : user.name;
    const dot = document.createElement('span');
    dot.className = 'online-dot';
    item.append(avatar, name, dot);
    return item;
  }));
});

socket.on('typing:start', (user) => {
  typingUsers.set(user.id, user.name);
  updateTypingLabel();
});

socket.on('typing:stop', (user) => {
  typingUsers.delete(user.id);
  updateTypingLabel();
});

elements.dialog.showModal();
