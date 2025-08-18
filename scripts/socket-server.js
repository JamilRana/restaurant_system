// socket-server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join room by order ID or customer email
  socket.on("joinOrder", (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`User joined order:${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Function to emit update (call this from /api/orders when status changes)
global.emitOrderUpdate = (orderId, update) => {
  io.to(`order:${orderId}`).emit("orderUpdate", update);
};

server.listen(3001, () => {
  console.log("Socket.IO server running on http://localhost:3001");
});