import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import './App.css'
import logo from './photos/logo.png'
const socket = io("http://localhost:5000"); // Change to your backend URL if deployed

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const textAreaRef = useRef(null);
  const skipEmit = useRef(false);

  const [error,setError]=useState(false);

  useEffect(() => {
    socket.on("receive", (incomingText) => {
      skipEmit.current = true;
      setText(incomingText);
    });

    return () => {
      socket.off("receive");
    };
  }, []);

  const handleJoin = () => {
    if (roomId.trim()) {
      socket.emit("join-room", roomId);
      setJoined(true);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    if (!skipEmit.current) {
      socket.emit("send", { roomId, message: newText });
    }

    skipEmit.current = false;
  };


  function handleChangeRoomId(e){
    setRoomId(e.target.value);

    const validate = /^\d+$/.test(e.target.value);
    console.log(validate);
    if(!validate){
      setError(true);
    }
    else{
      setError(false);
    }
  }


  return (
  <div className="container">
    <div className="wrapper">
      <div className="header">
        <div>
        <div style={{display:"flex",alignItems:"center"}}>
          <img src={logo} alt="" height={"60px"} />
          <h1 className="title">QuickLink</h1>
        </div>
        <p className="subtitle">Real Time text sharing Platform</p>
        </div>
        <div style={{display:"flex",gap:"20px"}}>
        <button className="leaveBtn">Leave</button>
        <p className="room-title">
            Room :<span className="room-id">{roomId}</span>
        </p>
        </div>
      </div>

      <div className="content">

      {!joined ? (
        <div className="join-card">
          <div className="join-header">
            <h2 className="join-title">Join a Room</h2>
            <p className="join-subtitle">Enter a room ID to start collaborating</p>
          </div>

          <div className="input-container">
            <input
              className="input"
              placeholder="Enter Room ID "
              value={roomId}
              onChange={handleChangeRoomId}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button className="button" onClick={handleJoin}>Join Room</button>
          </div>
          {(error) && <p style={{color:"#fd1a1a",marginLeft:"10px"}}>Room id can only be numbers</p>}
        </div>
      ) : (
        <div className="editor-card">
          <textarea
            ref={textAreaRef}
            className="textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Start typing your message here..."
          />
        </div>
      )}
    </div>
  </div>
  </div>

);

}