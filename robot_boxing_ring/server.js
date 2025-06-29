const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const OLLAMA_API_URL = "http://localhost:11434/api/generate"; // Порт Ollama Serve

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "robot_boxing_ring.html"));
});

io.on("connection", (socket) => {
  console.log("Клиент подключен к рингу:", socket.id);

  socket.on("llama_decision", async (data) => {
    try {
      const response = await axios.post(OLLAMA_API_URL, {
        model: "llama3.1:latest",
        prompt: data.prompt,
        stream: false,
      });
      console.log("LLaMA ответ:", response.data.response);
      socket.emit("llama_response", response.data.response);
    } catch (err) {
      console.error("Ошибка LLaMA:", err.message);
      socket.emit("llama_response", "error");
    }
  });

  socket.on("disconnect", () => {
    console.log("Клиент отключен от ринга:", socket.id);
  });
});

const PORT = 4001;
server.listen(PORT, () => {
  console.log(`Boxing ring server running on port ${PORT}`);
});
