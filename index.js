const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["https://quicklink101.netlify.app", "http://localhost:5173"]
    }
});


const getUserCountInRoom = (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
};

const emitUserCountToRoom = (roomId) => {
    const count = getUserCountInRoom(roomId);
    io.to(roomId).emit("room-users-count", count);
};

io.on("connection", (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        emitUserCountToRoom(roomId);
    });

    socket.on("send", ({ roomId, message }) => {
        io.to(roomId).emit("receive", message);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
        
        emitUserCountToRoom(roomId);
    });

    socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                emitUserCountToRoom(roomId);
            }
        });
    });
});

app.use(express.json());
app.use(cors());

server.listen(5000, () => {
    console.log("Server running on port 5000");
});