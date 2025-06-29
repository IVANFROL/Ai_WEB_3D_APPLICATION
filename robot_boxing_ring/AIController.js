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
    setTimeout(() => {
      this.socket.emit("llama_decision", { prompt });
    }, 100 + Math.random() * 200);
  }

  buildPrompt() {
    let strategy = "";
    if (this.opponent.lastAction === "attack") {
      strategy = "Противник часто атакует — чаще уклоняйся или блокируй.";
    } else if (this.opponent.lastAction === "defend") {
      strategy = "Противник защищается — попробуй атаковать.";
    } else if (this.robot.health < 40) {
      strategy = "У тебя мало здоровья — чаще защищайся или уклоняйся.";
    }
    return (
      `Ты управляешь роботом-боксером. Твои действия: attack (атака), defend (защита), dodge (уклонение).\n` +
      `Твое здоровье: ${this.robot.health}, очки: ${this.robot.score}.\n` +
      `Противник: здоровье ${this.opponent.health}, очки: ${this.opponent.score}.\n` +
      `Последнее действие противника: ${
        this.opponent.lastAction || "none"
      }.\n` +
      `${strategy}\n` +
      `Выбери следующее действие (attack/defend/dodge):`
    );
  }

  analyzeOpponent() {
    if (!this.opponent.actionHistory) this.opponent.actionHistory = [];
    this.opponent.actionHistory.push(this.opponent.lastAction);
    if (this.opponent.actionHistory.length > 10)
      this.opponent.actionHistory.shift();
    const attacks = this.opponent.actionHistory.filter(
      (a) => a === "attack"
    ).length;
    const defends = this.opponent.actionHistory.filter(
      (a) => a === "defend"
    ).length;
    const dodges = this.opponent.actionHistory.filter(
      (a) => a === "dodge"
    ).length;
    return { attacks, defends, dodges };
  }

  chooseCombo() {
    const combos = [
      ["attack", "attack", "attack"],
      ["attack", "attack", "defend"],
      ["attack", "dodge", "attack"],
      ["attack", "attack", "attack", "defend"],
      ["attack", "defend", "attack"],
    ];
    return combos[Math.floor(Math.random() * combos.length)];
  }

  forceActivity() {
    if (
      !this.robot.isAttacking &&
      !this.robot.isDefending &&
      !this.robot.isDodging &&
      !this.robot.animState
    ) {
      this.robot.forceActivity();
    }
  }

  handleLlamaResponse(response) {
    this.isThinking = false;
    const action = this.parseAction(response);
    const oppStats = this.analyzeOpponent();

    if (oppStats.defends > 3 && Math.random() > 0.2) {
      this.robot.startCombo(this.chooseCombo(), this.opponent);
      this.lastDecision = "combo";
      return;
    }
    if (oppStats.attacks > 3 && Math.random() > 0.4) {
      this.robot.dodge();
      this.lastDecision = "dodge";
      return;
    }

    if (
      !this.opponent.isAttacking &&
      !this.opponent.isDefending &&
      !this.opponent.isDodging &&
      Math.random() > 0.3
    ) {
      if (Math.random() > 0.5) {
        this.robot.startCombo(this.chooseCombo(), this.opponent);
        this.lastDecision = "combo";
      } else {
        this.robot.attack(this.opponent);
        this.lastDecision = "attack";
      }
      return;
    }

    if (action) {
      if (action === "attack") {
        if (Math.random() > 0.4) {
          this.robot.startCombo(this.chooseCombo(), this.opponent);
          this.lastDecision = "combo";
        } else {
          this.robot.attack(this.opponent);
          this.lastDecision = "attack";
        }
      }
      if (action === "defend") {
        this.robot.defend();
        this.lastDecision = "defend";
      }
      if (action === "dodge") {
        this.robot.dodge();
        this.lastDecision = "dodge";
      }
    } else {
      const actions = ["attack", "attack", "attack", "defend", "dodge"];
      const action = actions[Math.floor(Math.random() * actions.length)];
      if (action === "attack") {
        if (Math.random() > 0.3) {
          this.robot.startCombo(this.chooseCombo(), this.opponent);
          this.lastDecision = "combo";
        } else {
          this.robot.attack(this.opponent);
          this.lastDecision = "attack";
        }
      } else if (action === "defend") {
        this.robot.defend();
        this.lastDecision = "defend";
      } else {
        this.robot.dodge();
        this.lastDecision = "dodge";
      }
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
