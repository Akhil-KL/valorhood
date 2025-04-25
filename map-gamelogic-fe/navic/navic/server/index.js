
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },

  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});


app.get('/', (req, res) => {
  res.send('Server is running!');
});

let players = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
 
  socket.emit("playersUpdate", players);

  socket.on("updatePosition", (data) => {
    console.log("Position update from", socket.id, data);
    players[socket.id] = data;
    io.emit("playersUpdate", players);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete players[socket.id];
    io.emit("playersUpdate", players);
  });
  
  socket.on("error", (error) => {
    console.log("Socket error:", error);
  });
});


server.listen(3000, '0.0.0.0', () => {
  console.log("✅ Server running on all interfaces, port 3000");
  console.log("Local access: http://localhost:3000");

  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Network access: http://${net.address}:3000`);
      }
    }
  }
});