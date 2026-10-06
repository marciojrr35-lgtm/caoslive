const path = require("path");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", ws => {
  let roomId = null;
  let role = null;

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "join") {
      roomId = String(msg.room || "").trim().toUpperCase();
      role = msg.role;

      if (!roomId) return;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          broadcaster: null,
          viewers: new Set()
        });
      }

      const room = rooms.get(roomId);

      if (role === "broadcaster") {
        if (room.broadcaster) {
          send(ws, {
            type: "error",
            message: "Esta sala já tem uma transmissão ativa."
          });
          return;
        }

        room.broadcaster = ws;
        send(ws, { type: "joined" });

        for (const
