// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const users = new Map(); // Map of username => WebSocket

wss.on('connection', (ws) => {
    let username = '';

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);

        if (data.type === 'login') {
            if (users.has(data.username)) {
                ws.send(JSON.stringify({ type: 'login_error', message: 'Username already exists' }));
            } else {
                username = data.username;
                users.set(username, ws);

                ws.send(JSON.stringify({ type: 'login_success', username, participants: [...users.keys()] }));
                broadcast({
                    type: 'system',
                    message: `${username} has joined the chat.`,
                    participants: [...users.keys()]
                });
            }
        }

        else if (data.type === 'message') {
            broadcast({ type: 'message', username, message: data.message });
        }

        else if (data.type === 'private_message') {
            const recipientSocket = users.get(data.to);
            if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
                recipientSocket.send(JSON.stringify({
                    type: 'private_message',
                    from: username,
                    message: data.message
                }));
            }
        }

        else if (data.type === 'typing') {
            broadcast({ type: 'typing', username }, ws);
        }
    });

    ws.on('close', () => {
        if (username) {
            users.delete(username);
            broadcast({
                type: 'system',
                message: `${username} has left the chat.`,
                participants: [...users.keys()]
            });
        }
    });

    function broadcast(message, exclude = null) {
        for (const [_, client] of users) {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        }
    }
});

console.log('✅ Server running on ws://localhost:8080');
