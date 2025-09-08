const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["https://quicklink101.netlify.app", "http://localhost:5173"]
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling']
});

const getUserCountInRoom = (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
};

const emitUserCountToRoom = (roomId) => {
    const count = getUserCountInRoom(roomId);
    io.to(roomId).emit("room-users-count", count);
};

const debouncedUpdates = new Map();
const debouncedEmitUserCount = (roomId, delay = 100) => {
    if (debouncedUpdates.has(roomId)) {
        clearTimeout(debouncedUpdates.get(roomId));
    }
    
    const timeoutId = setTimeout(() => {
        emitUserCountToRoom(roomId);
        debouncedUpdates.delete(roomId);
    }, delay);
    
    debouncedUpdates.set(roomId, timeoutId);
};

io.on("connection", (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        if (!roomId || typeof roomId !== 'string') {
            socket.emit('error', 'Invalid room ID');
            return;
        }
        
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
                debouncedEmitUserCount(room, 50);
            }
        });
        
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        debouncedEmitUserCount(roomId, 50);
        
        socket.emit('joined-room', roomId);
        // console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send", ({ roomId, message, timestamp }) => {
        if (!roomId || message === undefined) {
            return;
        }
        
        const messageData = {
            message,
            senderId: socket.id
        };
        
        socket.to(roomId).emit("receive", messageData);
        socket.emit("message-sent", { success: true, timestamp: messageData.timestamp });
    });

    socket.on('leave-room', (roomId) => {
        if (!roomId) return;
        
        socket.leave(roomId);
        
        if (socket.currentRoom === roomId) {
            socket.currentRoom = null;
        }
        
        debouncedEmitUserCount(roomId, 50);
        
        socket.emit('left-room', roomId);
        // console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on('disconnect', (reason) => {
        // console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
        
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                setTimeout(() => {
                    emitUserCountToRoom(roomId);
                }, 100);
            }
        });
        
        if (socket.currentRoom && debouncedUpdates.has(socket.currentRoom)) {
            clearTimeout(debouncedUpdates.get(socket.currentRoom));
            debouncedUpdates.delete(socket.currentRoom);
            emitUserCountToRoom(socket.currentRoom);
        }
    });
});

app.use(cors({
    origin: ["https://quicklink101.netlify.app", "http://localhost:5173"],
    credentials: true
}));
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => {
    res.json({ 
        status: 'SUCCESS', 
        timestamp: Date.now(),
        connectedClients: io.engine.clientsCount,
        uptime: process.uptime()
    });
});

app.get('/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const userCount = getUserCountInRoom(roomId);
    res.json({
        roomId,
        userCount,
        exists: userCount > 0
    });
});

setInterval(() => {
    const currentTime = Date.now();
    for (const [roomId, timeoutId] of debouncedUpdates.entries()) {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room || room.size === 0) {
            clearTimeout(timeoutId);
            debouncedUpdates.delete(roomId);
        }
    }
}, 60000); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});