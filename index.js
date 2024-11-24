const express = require("express");
const cors=require("cors");
const app=express();
const http=require("http");
const {Server}=require("socket.io");
const server=http.createServer(app);

const io = new Server(server,{
    cors:{
        origin:["https://quicklink101.netlify.app", "http://localhost:5173"]
    }

});

io.on("connection",(socket)=>{
    socket.on('join-room',(roomId)=>{
        socket.join(roomId);
    })
    socket.on("send",({roomId,message})=>{
        io.to(roomId).emit("receive",message);
    })
})

app.use(express.json());
app.use(cors());


server.listen(5000);
