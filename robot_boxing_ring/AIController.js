import io from "https://cdn.socket.io/4.7.4/socket.io.esm.min.js";

export default class AIController {
  constructor(robot, opponent) {
    this.robot = robot;
    this.opponent = opponent;
    this.socket = io("http://localhost:4001");
    this.isThinking = false;
    this.lastDecision = null;
    this.socket.on("llama_response", (response) => {
      this.handleLlamaResponse(response);
    });
  }

  requestDecision() {
    if (this.isThinking) return;
    this.isThinking = true;
    const prompt = this.buildPrompt();
    this.socket.emit("llama_decision", { prompt });
  }

  buildPrompt() {
    // Формируем промпт для LLaMA на основе состояния боя
    return (
      `Ты управляешь роботом-боксером. Твои действия: attack (атака), defend (защита), dodge (уклонение).\n` +
      `Твое здоровье: ${this.robot.health}, очки: ${this.robot.score}.\n` +
      `Противник: здоровье ${this.opponent.health}, очки: ${this.opponent.score}.\n` +
      `Последнее действие противника: ${
        this.opponent.lastAction || "none"
      }.\n` +
      `Выбери следующее действие (attack/defend/dodge):`
    );
  }

  handleLlamaResponse(response) {
    this.isThinking = false;
    const action = this.parseAction(response);
    if (action) {
      if (action === "attack") this.robot.attack(this.opponent);
      if (action === "defend") this.robot.defend();
      if (action === "dodge") this.robot.dodge();
      this.lastDecision = action;
    } else {
      // Fallback: случайное действие, если LLaMA не ответила нормально
      this.robot.decideAction(this.opponent);
    }
  }

  parseAction(response) {
    if (!response || typeof response !== "string") return null;
    const text = response.toLowerCase();
    if (text.includes("attack")) return "attack";
    if (text.includes("defend")) return "defend";
    if (text.includes("dodge")) return "dodge";
    return null;
  }
}
