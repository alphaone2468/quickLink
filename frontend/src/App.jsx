import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import './App.css'
import logo from './photos/logo.png'

const socket = io("http://localhost:5000");

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const textAreaRef = useRef(null);
  const skipEmit = useRef(false);
  const [error, setError] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState(0);

  useEffect(() => {
    socket.on("receive", (incomingText) => {
      skipEmit.current = true;
      setText(incomingText);
    });

    socket.on("room-users-count", (count) => {
      setUsersInRoom(count);
    });

    return () => {
      socket.off("receive");
      socket.off("room-users-count");
    };
  }, []);

  // Generate random room ID
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random number
  };

  const handleJoin = () => {
    if (roomId.trim()) {
      socket.emit("join-room", roomId);
      setJoined(true);
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    socket.emit("join-room", newRoomId);
    setJoined(true);
  };

  const leaveRoom = () => {
    socket.emit("leave-room", roomId);
    setJoined(false);
    setRoomId("");
    setText("");
    setUsersInRoom(0);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    if (!skipEmit.current) {
      socket.emit("send", { roomId, message: newText });
    }
    skipEmit.current = false;
  };

  function handleChangeRoomId(e) {
    setRoomId(e.target.value);

    const validate = /^\d+$/.test(e.target.value);
    console.log(validate);
    if (!validate && e.target.value !== "") {
      setError(true);
    } else {
      setError(false);
    }
  }

  return (
    <div className="container">
      <div className="wrapper">
        <div className="header">
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="" height={"30px"} />
              <h1 className="title">QuickLink</h1>
            </div>
            <p className="subtitle">Real Time text sharing Platform</p>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            {joined && (
              <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                <p className="room-title">
                  RoomId: <span className="room-id">{roomId}</span>
                </p>
                <div className="users-count">
                  <span className="users-icon">👥</span>
                  <span className="users-text">{usersInRoom} user{usersInRoom !== 1 ? 's' : ''}</span>
                </div>
                <button className="leaveBtn" disabled={!joined} onClick={leaveRoom}>Leave</button>
              </div>
            )}
          </div>
        </div>

        <div className="content">
          {!joined ? (
            <div className="join-card">
              <div className="join-header">
                <h2 className="join-title">Join or Create a Room</h2>
                <p className="join-subtitle">Enter a room ID to join or create a new room</p>
              </div>

              <div className="input-container">
                <input
                  className="input"
                  placeholder="Enter Room ID (optional)"
                  value={roomId}
                  onChange={handleChangeRoomId}
                  onKeyPress={(e) => e.key === 'Enter' && roomId.trim() && handleJoin()}
                />
                <button 
                  className="button" 
                  onClick={handleJoin} 
                  disabled={error || !roomId.trim()}
                >
                  Join Room
                </button>
              </div>
              
              <div className="divider">
                <span className="divider-text">OR</span>
              </div>
              
              <div className="create-room-container">
                <button 
                  className="button create-button" 
                  onClick={handleCreateRoom}
                >
                  Create New Room
                </button>
              </div>

              {(error) && <p style={{ color: "#fd1a1a", marginLeft: "10px" }}>Room id can only be numbers</p>}
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