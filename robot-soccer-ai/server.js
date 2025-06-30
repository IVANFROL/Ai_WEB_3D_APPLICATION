const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Ollama API configuration
const OLLAMA_BASE_URL = "http://localhost:11434";
const MODEL_NAME = "llama3.1:latest"; // Используем доступную модель

// AI Learning System
class AILearningSystem {
  constructor() {
    this.learningData = {
      attempts: 0,
      successfulMoves: 0,
      failedMoves: 0,
      currentStrategy: "exploration",
      terrainMemory: new Map(),
      obstacleMemory: new Map(),
    };

    this.learningRate = 0.1;
    this.explorationRate = 0.3;
  }

  async getAIDecision(situation) {
    try {
      const prompt = this.buildPrompt(situation);
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
      });

      return this.parseAIResponse(response.data.response);
    } catch (error) {
      console.error("Ошибка при обращении к Ollama:", error.message);
      return this.getFallbackDecision(situation);
    }
  }

  buildPrompt(situation) {
    return `Ты - ИИ, управляющий 3D персонажем в обучающейся системе. 
    
Текущая ситуация:
- Позиция персонажа: ${JSON.stringify(situation.position)}
- Окружающие препятствия: ${JSON.stringify(situation.obstacles)}
- Тип поверхности: ${situation.surfaceType}
- История попыток: ${this.learningData.attempts}
- Успешные движения: ${this.learningData.successfulMoves}

Доступные действия: move_forward, move_backward, move_left, move_right, jump, crouch, wait

Выбери лучшее действие для данной ситуации. Ответь только названием действия без дополнительного текста.`;
  }

  parseAIResponse(response) {
    const actions = [
      "move_forward",
      "move_backward",
      "move_left",
      "move_right",
      "jump",
      "crouch",
      "wait",
    ];
    const cleanResponse = response.trim().toLowerCase();

    for (const action of actions) {
      if (cleanResponse.includes(action)) {
        return action;
      }
    }

    return "wait"; // fallback
  }

  getFallbackDecision(situation) {
    // Простая логика без AI
    const actions = ["move_forward", "move_left", "move_right", "jump"];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  updateLearningData(action, success, situation) {
    this.learningData.attempts++;

    if (success) {
      this.learningData.successfulMoves++;
      this.learningData.terrainMemory.set(
        situation.surfaceType,
        (this.learningData.terrainMemory.get(situation.surfaceType) || 0) + 1
      );
    } else {
      this.learningData.failedMoves++;
      this.learningData.obstacleMemory.set(
        JSON.stringify(situation.obstacles),
        (this.learningData.obstacleMemory.get(
          JSON.stringify(situation.obstacles)
        ) || 0) + 1
      );
    }

    // Адаптация стратегии
    const successRate =
      this.learningData.successfulMoves / this.learningData.attempts;
    if (successRate > 0.7) {
      this.learningData.currentStrategy = "exploitation";
      this.explorationRate = Math.max(0.1, this.explorationRate - 0.05);
    } else {
      this.learningData.currentStrategy = "exploration";
      this.explorationRate = Math.min(0.5, this.explorationRate + 0.05);
    }
  }

  getLearningStats() {
    return {
      ...this.learningData,
      successRate:
        this.learningData.attempts > 0
          ? (
              (this.learningData.successfulMoves / this.learningData.attempts) *
              100
            ).toFixed(2)
          : 0,
      explorationRate: this.explorationRate,
    };
  }
}

const aiSystem = new AILearningSystem();

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("Клиент подключен:", socket.id);

  socket.on("request_ai_decision", async (situation) => {
    try {
      const decision = await aiSystem.getAIDecision(situation);
      socket.emit("ai_decision", { action: decision, situation });
    } catch (error) {
      console.error("Ошибка при получении решения AI:", error);
      socket.emit("ai_decision", { action: "wait", situation });
    }
  });

  socket.on("update_learning", (data) => {
    aiSystem.updateLearningData(data.action, data.success, data.situation);
    socket.emit("learning_updated", aiSystem.getLearningStats());
  });

  socket.on("get_learning_stats", () => {
    socket.emit("learning_stats", aiSystem.getLearningStats());
  });

  socket.on("disconnect", () => {
    console.log("Клиент отключен:", socket.id);
  });
});

// API routes
app.get("/api/learning-stats", (req, res) => {
  res.json(aiSystem.getLearningStats());
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", ollama: "connected" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});
