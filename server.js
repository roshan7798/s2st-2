const WebSocket = require('ws');
const http = require('http');

// سرور HTTP ساده برای اتصال WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = {}; // ساختار: { roomId1: Set([ws1, ws2]), ... }

wss.on('connection', function connection(ws) {
  console.log('🔗 Client connected');

  ws.on('message', function incoming(message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      console.error('❌ Invalid JSON received:', message);
      return;
    }

    // کاربر به Room متصل شود
    if (msg.type === 'join') {
      const roomId = msg.roomId;
    
      if (!rooms[roomId]) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room does not exist' }));
        return;
      }

    
      rooms[roomId].add(ws);
      ws.roomId = roomId;
      ws.send(JSON.stringify({ type: 'room_status',status: 'joined' ,roomId: `${roomId}`}));
      console.log(`👥 Client joined room: ${roomId}`);
    }
    
    else if (msg.type === 'create') {
      const roomId = msg.roomId;
    
      if (rooms[roomId]) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room already exists' }));
        return;
      }
    
      rooms[roomId] = new Set();
      rooms[roomId].add(ws);
      ws.roomId = roomId;
      ws.send(JSON.stringify({ type: 'room_status',status: 'created' ,roomId: `${roomId}`}));

      console.log(`🚪 Room created and client joined: ${roomId}`);
    }
    
    // ارسال پیام گفتاری به سایر کاربران در همان Room
    else if (msg.type === 'speech') {
      const roomId = msg.roomId;
      const roomClients = rooms[roomId];
      if (roomClients) {
        for (const client of roomClients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'speech',
              text: msg.text,
              translated: msg.translated || '',
            }));
          }
        }
      }
    }
  });

  // هنگام قطع اتصال کاربر
  ws.on('close', () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId].delete(ws);
      if (rooms[roomId].size === 0) delete rooms[roomId];
      console.log(`❌ Client disconnected from room: ${roomId}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ WebSocket Server is running on ws://localhost:${PORT}`);
});

// npm init -y
// npm install ws
// node server.js