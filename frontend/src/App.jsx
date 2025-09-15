import React, { useEffect, useState, useRef, useCallback } from "react";
import io from "socket.io-client";
import './App.css'
import logo from './photos/logo.png'
import { facts } from "./Facts";

const socket = io("https://quicklink-9c7g.onrender.com", {
  transports: ['websocket'],
  upgrade: true,
  rememberUpgrade: true,
  timeout: 5000,
  forceNew: false
});

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [lastActivity, setLastActivity] = useState(null);
  const textAreaRef = useRef(null);
  const skipEmit = useRef(false);
  const [error, setError] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState(0);
  const [messageQueue, setMessageQueue] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimer = useRef(null);

  const [factIndex, setFactIndex] = useState(0);
    useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prevIndex) => (prevIndex + 1) % facts.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);


  const debouncedSend = useCallback((roomId, message) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      if (isConnected) {
        socket.emit("send", { 
          roomId, 
          message,
        });
      } else {
        setMessageQueue(prev => [...prev, { roomId, message }]);
      }
    }, 50); 
  }, [isConnected]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      
      if (messageQueue.length > 0) {
        messageQueue.forEach(({ roomId, message }) => {
          socket.emit("send", { roomId, message, timestamp: Date.now() });
        });
        setMessageQueue([]);
      }
    });


    // Message handling
    socket.on("receive", (messageData) => {
      skipEmit.current = true;
      if (typeof messageData === 'string') {
        setText(messageData);
      } else {
        setText(messageData.message || messageData);
      }
    });

    socket.on("room-users-count", (count) => {
      setUsersInRoom(count);
    });


    const pingInterval = setInterval(() => {
      if (isConnected) {
        socket.emit('ping');
      }
    }, 30000);


    return () => {
      clearInterval(pingInterval);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("receive");
      socket.off("room-users-count");
      socket.off("joined-room");
      socket.off("left-room");
      socket.off("message-sent");
      socket.off("error");
    };
  }, [messageQueue]);

  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleJoin = () => {
    if (roomId.trim() && isConnected) {
      socket.emit("join-room", roomId.trim());
      setJoined(true);
      setError(false);
    } else if (!isConnected) {
      setError("Not connected to server. Please wait...");
    }
  };

  const handleCreateRoom = () => {
    if (isConnected) {
      const newRoomId = generateRoomId();
      setRoomId(newRoomId);
      socket.emit("join-room", newRoomId);
      setJoined(true);
      setError(false);
    } else {
      setError("Not connected to server. Please wait...");
    }
  };

  const leaveRoom = () => {
    if (isConnected) {
      socket.emit("leave-room", roomId);
    }
    setJoined(false);
    setRoomId("");
    setText("");
    setUsersInRoom(0);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    if (!skipEmit.current && joined && roomId) {
      debouncedSend(roomId, newText);
    }
    skipEmit.current = false;
  };

  function handleChangeRoomId(e) {
    setRoomId(e.target.value);

    const validate = /^\d+$/.test(e.target.value);
    if (!validate && e.target.value !== "") {
      setError("Room ID can only contain numbers");
    } else {
      setError(false);
    }
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      console.log("Room ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy room ID:", err);
    }
  };

  return (
    <div className="container">
      <div className="wrapper">
        <div className="header">
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="" height={"30px"} />
              <h1 className="title">QuickLink</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            {joined && (
              <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
                <div 
                  className="room-title" 
                  style={{ cursor: "pointer" }}
                  onClick={copyRoomId}
                  title="Click to copy room ID"
                >
                  Room: <span className="room-id">{roomId}</span>
                </div>
                
                <div className="users-count">
                  <span className="users-icon">👥</span>
                  <span className="users-text">
                    {usersInRoom} user{usersInRoom !== 1 ? 's' : ''}
                  </span>
                </div>
                <button 
                  className="leaveBtn" 
                  disabled={!joined} 
                  onClick={leaveRoom}
                >
                  Leave
                </button>
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
                  placeholder="Enter Room ID (6-digit number)"
                  value={roomId}
                  onChange={handleChangeRoomId}
                  onKeyPress={(e) => e.key === 'Enter' && roomId.trim() && !error && isConnected && handleJoin()}
                  disabled={!isConnected}
                />
                <button 
                  className="button" 
                  onClick={handleJoin} 
                  disabled={error || !roomId.trim() || !isConnected}
                >
                  {isConnected ? "Join Room" : "Connecting..."}
                </button>
              </div>
              
              <div className="divider">
                <span className="divider-text">OR</span>
              </div>
              
              <div className="create-room-container">
                <button 
                  className="button create-button" 
                  onClick={handleCreateRoom}
                  disabled={!isConnected}
                >
                  {isConnected ? "Create New Room" : "Connecting..."}
                </button>
              </div>

              {error && (
                <div style={{ 
                  color: "#ef4444", 
                  marginTop: "10px", 
                  padding: "10px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  border: "1px solid #fecaca"
                }}>
                  {typeof error === 'string' ? error : 'An error occurred'}
                </div>
              )}


              <p className="facts">Do You Know : {facts[factIndex]}</p>

              {messageQueue.length > 0 && (
                <div style={{
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "6px",
                  border: "1px solid #fde68a",
                  fontSize: "14px"
                }}>
                  ⏳ {messageQueue.length} message(s) queued. Will send when connected.
                </div>
              )}
            </div>
          ) : (
            <div className="editor-card">
              <textarea
                ref={textAreaRef}
                className="textarea"
                value={text}
                onChange={handleTextChange}
                placeholder="Start typing your message here... Changes are synced in real-time!"
                style={{
                  minHeight: "400px",
                  resize: "vertical",
                  border: isConnected ? "2px solid #e5e7eb" : "2px solid #f59e0b"
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}