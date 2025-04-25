const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");


const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});


const players = {};


io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  
  socket.on("updatePosition", (data) => {
    console.log("🚀 Player position updated:", data);  
    players[socket.id] = { ...data, id: socket.id };
    io.emit("playersUpdate", players); 
  });

  
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playersUpdate", players); 
    console.log("Player disconnected:", socket.id);
  });
});


if (process.env.NODE_ENV === "development") {
  
  app.use(express.static(path.join(__dirname, "../public")));

 
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
} else {

}


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
