# Pulse Chat — WebSocket em tempo real

Aplicação de chat bidirecional construída no padrão cliente-servidor orientado a eventos, usando **Node.js**, **Express** e **Socket.IO**.

## Funcionalidades

- troca instantânea de mensagens entre vários clientes;
- entrada por nome e identificação das próprias mensagens;
- lista e quantidade de usuários conectados;
- indicador de digitação;
- avisos de entrada e saída;
- reconexão automática;
- interface responsiva para computador e celular;
- validação básica de nomes e mensagens;
- endpoint de saúde em `/health`;
- teste automatizado com dois clientes WebSocket.

## Como executar

Requisito: Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra `http://localhost:3000` em duas abas ou dispositivos e use nomes diferentes.

Para executar o teste automatizado:

```bash
npm test
```

## Arquitetura

1. O navegador abre uma conexão persistente com o servidor Socket.IO.
2. Cliente e servidor emitem e escutam eventos, como `user:join`, `chat:message` e `typing:start`.
3. Ao receber uma mensagem, o servidor valida os dados e usa `io.emit` para transmiti-la a todos os clientes conectados.
4. Em caso de desconexão, o servidor remove o usuário e atualiza a presença da sala.

## Principais eventos

| Evento | Direção | Finalidade |
| --- | --- | --- |
| `user:join` | Cliente → servidor | Registrar o participante |
| `chat:message` | Bidirecional | Enviar e distribuir mensagens |
| `typing:start` | Cliente → servidor → clientes | Indicar que alguém começou a digitar |
| `typing:stop` | Cliente → servidor → clientes | Remover o indicador de digitação |
| `presence:update` | Servidor → clientes | Atualizar usuários online |
| `system:message` | Servidor → clientes | Informar entradas e saídas |

## Estrutura

```text
chat-websocket/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── client.js
├── test/
│   └── chat.test.js
├── package.json
├── server.js
└── README.md
```

## Conceitos aplicados

- arquitetura cliente-servidor;
- comunicação full-duplex em tempo real;
- programação orientada a eventos;
- broadcast de eventos;
- ciclo de conexão e desconexão;
- acknowledgements para confirmar operações;
- atualização do DOM com `textContent`, evitando injeção de HTML nas mensagens.
