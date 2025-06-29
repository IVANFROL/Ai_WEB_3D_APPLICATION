class AIController {
  constructor(character, environment, socket) {
    this.character = character;
    this.environment = environment;
    this.socket = socket;

    this.isActive = false;
    this.learningMode = true;
    this.decisionInterval = 1000; // мс
    this.lastDecisionTime = 0;
    this.currentTarget = null;
    this.actionQueue = [];

    // Параметры обучения
    this.learningRate = 0.1;
    this.explorationRate = 0.3;
    this.memorySize = 100;
    this.actionMemory = [];

    // Состояние AI
    this.currentState = "idle";
    this.lastAction = null;
    this.lastSituation = null;
    this.successCount = 0;
    this.failureCount = 0;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on("ai_decision", (data) => {
      this.handleAIDecision(data);
    });

    this.socket.on("learning_updated", (stats) => {
      this.updateLearningStats(stats);
    });

    this.socket.on("learning_stats", (stats) => {
      this.updateLearningStats(stats);
    });
  }

  activate() {
    this.isActive = true;
    this.currentState = "active";
    console.log("AI контроллер активирован");

    // Создание первой цели
    this.createNewTarget();
  }

  deactivate() {
    this.isActive = false;
    this.currentState = "idle";
    this.clearTarget();
    console.log("AI контроллер деактивирован");
  }

  update(deltaTime) {
    if (!this.isActive) return;

    const currentTime = Date.now();

    // Принятие решений с интервалом
    if (currentTime - this.lastDecisionTime > this.decisionInterval) {
      this.makeDecision();
      this.lastDecisionTime = currentTime;
    }

    // Обновление движения к цели
    if (this.currentTarget) {
      this.updateTargetSeeking();
    }

    // Обработка очереди действий
    this.processActionQueue();
  }

  makeDecision() {
    const situation = this.character.getCurrentSituation(this.environment);
    this.lastSituation = situation;

    // Проверка, нужно ли использовать AI или случайное действие
    if (Math.random() < this.explorationRate) {
      // Исследование - случайное действие
      this.performRandomAction();
    } else {
      // Эксплуатация - запрос к AI
      this.requestAIDecision(situation);
    }
  }

  requestAIDecision(situation) {
    if (this.socket) {
      this.socket.emit("request_ai_decision", situation);
    } else {
      // Fallback без AI
      this.performRandomAction();
    }
  }

  handleAIDecision(data) {
    const { action, situation } = data;
    this.lastAction = action;

    console.log(`AI решил: ${action}`);

    // Выполнение действия
    this.performAction(action);

    // Оценка результата через некоторое время
    setTimeout(() => {
      this.evaluateAction(action, situation);
    }, 2000);
  }

  performAction(action) {
    switch (action) {
      case "move_forward":
        this.character.move("forward");
        break;
      case "move_backward":
        this.character.move("backward");
        break;
      case "move_left":
        this.character.move("left");
        break;
      case "move_right":
        this.character.move("right");
        break;
      case "jump":
        this.character.jump();
        break;
      case "crouch":
        this.character.crouch();
        break;
      case "wait":
        // Ничего не делаем
        break;
      default:
        console.warn(`Неизвестное действие: ${action}`);
    }

    // Добавление в память
    this.addToMemory(action);
  }

  performRandomAction() {
    const actions = ["move_forward", "move_left", "move_right", "jump", "wait"];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    this.lastAction = randomAction;
    this.performAction(randomAction);

    // Оценка результата
    setTimeout(() => {
      this.evaluateAction(randomAction, this.lastSituation);
    }, 2000);
  }

  evaluateAction(action, situation) {
    const currentSituation = this.character.getCurrentSituation(
      this.environment
    );
    let success = false;

    // Критерии успеха
    if (this.currentTarget) {
      const distanceToTarget = this.character.position.distanceTo(
        this.currentTarget.position
      );
      success = distanceToTarget < 2; // Достигнута цель
    } else {
      // Проверка других критериев
      success = this.checkActionSuccess(action, situation, currentSituation);
    }

    // Обновление статистики
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }

    // Отправка данных на сервер
    if (this.socket) {
      this.socket.emit("update_learning", {
        action: action,
        success: success,
        situation: situation,
      });
    }

    // Локальное обучение
    this.learnFromAction(action, success, situation);

    // Анимация результата
    if (success) {
      this.character.animationSystem.playSuccessAnimation();
    } else {
      this.character.animationSystem.playFailureAnimation();
    }

    console.log(`Действие ${action}: ${success ? "успешно" : "неудачно"}`);
  }

  checkActionSuccess(action, oldSituation, newSituation) {
    // Проверка различных критериев успеха
    const positionChanged =
      Math.abs(newSituation.position.x - oldSituation.position.x) > 0.1 ||
      Math.abs(newSituation.position.z - oldSituation.position.z) > 0.1;

    const noCollision = !this.environment.checkCollision(
      this.character.position
    );
    const onGround = newSituation.isOnGround;

    switch (action) {
      case "move_forward":
      case "move_left":
      case "move_right":
        return positionChanged && noCollision;
      case "jump":
        return !onGround && noCollision;
      case "crouch":
        return newSituation.isCrouching;
      case "wait":
        return noCollision; // Ожидание успешно, если нет столкновений
      default:
        return noCollision;
    }
  }

  learnFromAction(action, success, situation) {
    // Добавление в память
    const memoryEntry = {
      action: action,
      success: success,
      situation: situation,
      timestamp: Date.now(),
    };

    this.actionMemory.push(memoryEntry);

    // Ограничение размера памяти
    if (this.actionMemory.length > this.memorySize) {
      this.actionMemory.shift();
    }

    // Адаптация параметров обучения
    if (success) {
      this.explorationRate = Math.max(0.1, this.explorationRate - 0.01);
    } else {
      this.explorationRate = Math.min(0.5, this.explorationRate + 0.02);
    }
  }

  addToMemory(action) {
    const memoryEntry = {
      action: action,
      timestamp: Date.now(),
      position: this.character.position.clone(),
      situation: this.character.getCurrentSituation(this.environment),
    };

    this.actionMemory.push(memoryEntry);

    if (this.actionMemory.length > this.memorySize) {
      this.actionMemory.shift();
    }
  }

  createNewTarget() {
    const targetPosition = this.environment.getRandomTargetPosition();
    this.currentTarget = this.environment.createTarget(targetPosition);

    console.log(
      `Создана новая цель в позиции: ${targetPosition.x}, ${targetPosition.z}`
    );
  }

  updateTargetSeeking() {
    if (!this.currentTarget) return;

    const distance = this.character.position.distanceTo(
      this.currentTarget.position
    );

    if (distance < 2) {
      // Цель достигнута
      this.onTargetReached();
    } else {
      // Движение к цели
      this.moveTowardsTarget();
    }
  }

  moveTowardsTarget() {
    if (!this.currentTarget) return;

    const direction = this.character.getDirectionToTarget(
      this.currentTarget.position
    );
    const obstacles = this.environment.getNearbyObstacles(
      this.character.position
    );

    // Проверка препятствий на пути
    const canMoveDirectly = this.checkPathClear(direction, obstacles);

    if (canMoveDirectly) {
      // Прямое движение к цели
      if (Math.abs(direction.x) > Math.abs(direction.z)) {
        this.character.move(direction.x > 0 ? "right" : "left");
      } else {
        this.character.move(direction.z > 0 ? "backward" : "forward");
      }
    } else {
      // Обход препятствий
      this.avoidObstacles(obstacles);
    }
  }

  checkPathClear(direction, obstacles) {
    const rayStart = this.character.position.clone();
    const rayEnd = rayStart.clone().add(direction.clone().multiplyScalar(3));

    for (const obstacle of obstacles) {
      const obstaclePos = obstacle.position;
      const distanceToObstacle = rayStart.distanceTo(obstaclePos);

      if (distanceToObstacle < 3) {
        return false;
      }
    }

    return true;
  }

  avoidObstacles(obstacles) {
    let avoidDirection = new THREE.Vector3();

    for (const obstacle of obstacles) {
      const toObstacle = new THREE.Vector3().subVectors(
        obstacle.position,
        this.character.position
      );
      const distance = toObstacle.length();

      if (distance < 3) {
        const avoid = toObstacle.clone().normalize().multiplyScalar(-1);
        avoidDirection.add(avoid);
      }
    }

    if (avoidDirection.length() > 0) {
      avoidDirection.normalize();

      if (Math.abs(avoidDirection.x) > Math.abs(avoidDirection.z)) {
        this.character.move(avoidDirection.x > 0 ? "right" : "left");
      } else {
        this.character.move(avoidDirection.z > 0 ? "backward" : "forward");
      }
    }
  }

  onTargetReached() {
    console.log("Цель достигнута!");

    // Удаление текущей цели
    this.environment.scene.remove(this.currentTarget);
    this.currentTarget = null;

    // Создание новой цели
    setTimeout(() => {
      this.createNewTarget();
    }, 1000);

    // Анимация успеха
    this.character.animationSystem.playSuccessAnimation();
  }

  clearTarget() {
    if (this.currentTarget) {
      this.environment.scene.remove(this.currentTarget);
      this.currentTarget = null;
    }
  }

  processActionQueue() {
    if (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();
      this.performAction(action);
    }
  }

  addToActionQueue(action) {
    this.actionQueue.push(action);
  }

  updateLearningStats(stats) {
    // Обновление UI статистики
    const successRateElement = document.getElementById("successRate");
    const attemptsElement = document.getElementById("attemptsCount");
    const successfulElement = document.getElementById("successfulMoves");
    const failedElement = document.getElementById("failedMoves");
    const strategyElement = document.getElementById("currentStrategy");
    const progressElement = document.getElementById("learningProgress");

    if (successRateElement)
      successRateElement.textContent = `${stats.successRate}%`;
    if (attemptsElement) attemptsElement.textContent = stats.attempts;
    if (successfulElement)
      successfulElement.textContent = stats.successfulMoves;
    if (failedElement) failedElement.textContent = stats.failedMoves;
    if (strategyElement) {
      strategyElement.textContent =
        stats.currentStrategy === "exploration"
          ? "Исследование"
          : "Эксплуатация";
    }
    if (progressElement) {
      progressElement.style.width = `${stats.successRate}%`;
    }
  }

  // Получение статистики обучения
  getLearningStats() {
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate:
        this.successCount + this.failureCount > 0
          ? (
              (this.successCount / (this.successCount + this.failureCount)) *
              100
            ).toFixed(2)
          : 0,
      explorationRate: this.explorationRate,
      memorySize: this.actionMemory.length,
      currentState: this.currentState,
    };
  }

  // Сброс обучения
  resetLearning() {
    this.actionMemory = [];
    this.successCount = 0;
    this.failureCount = 0;
    this.explorationRate = 0.3;
    this.currentState = "idle";

    console.log("Обучение сброшено");
  }

  // Установка параметров обучения
  setLearningParameters(params) {
    if (params.learningRate !== undefined) {
      this.learningRate = Math.max(0, Math.min(1, params.learningRate));
    }
    if (params.explorationRate !== undefined) {
      this.explorationRate = Math.max(0, Math.min(1, params.explorationRate));
    }
    if (params.decisionInterval !== undefined) {
      this.decisionInterval = Math.max(
        100,
        Math.min(5000, params.decisionInterval)
      );
    }
  }

  // Получение последнего действия
  getLastAction() {
    return this.lastAction;
  }

  // Получение текущего состояния
  getCurrentState() {
    return this.currentState;
  }

  // Проверка активности
  isAIActive() {
    return this.isActive;
  }
}
