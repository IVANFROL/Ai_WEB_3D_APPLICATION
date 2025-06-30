// === Three.js базовая сцена ===
let scene, camera, renderer;
let field, leftGoal, rightGoal, ball;
let robot1, robot2;
let ballVelocity = new THREE.Vector3();
let robot1Velocity = new THREE.Vector3();
let robot2Velocity = new THREE.Vector3();
let robot1Acceleration = new THREE.Vector3();
let robot2Acceleration = new THREE.Vector3();

const FIELD_WIDTH = 28;
const FIELD_HEIGHT = 18;
const GOAL_WIDTH = 4.5;
const GOAL_HEIGHT = 3;
const BALL_RADIUS = 0.4;
const ROBOT_SIZE = 1;
const GAME_TIME = 60; // секунд

let score1 = 0,
  score2 = 0;
let timeLeft = GAME_TIME;
let lastTime = Date.now();
let gameActive = true;

// Переменные для анимации поломки
let robot1Pieces = [];
let robot2Pieces = [];
let goalScored = false; // Защита от множественного засчитывания гола

function init() {
  // Сцена
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Голубое небо

  // Камера
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 15, 15);
  camera.lookAt(0, 0, 0);

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById("gameContainer").appendChild(renderer.domElement);

  // Освещение
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // Создаём реалистичное футбольное поле
  createFootballField();

  // Мяч
  const ballGeom = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
  });
  ball = new THREE.Mesh(ballGeom, ballMat);
  ball.position.set(0, BALL_RADIUS, 0);
  ball.castShadow = true;
  scene.add(ball);

  // Роботы-кубы
  robot1 = createRobot(-3, ROBOT_SIZE / 2, 0, 0x2080ff, "neutral");
  robot2 = createRobot(3, ROBOT_SIZE / 2, 0, 0xffa040, "neutral");
  robot1.castShadow = true;
  robot2.castShadow = true;
  scene.add(robot1);
  scene.add(robot2);

  updateScoreboard();
  updateTimer();
  animate();
}

function createFootballField() {
  // Основное поле (трава)
  const fieldGeom = new THREE.PlaneGeometry(FIELD_WIDTH + 2, FIELD_HEIGHT + 2);
  const fieldMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27, // Тёмно-зелёная трава
    roughness: 0.8,
  });
  field = new THREE.Mesh(fieldGeom, fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  scene.add(field);

  // Создаём разметку поля
  createFieldMarkings();

  // Загрузка ворот
  loadGoalModel(-FIELD_WIDTH / 2 + 0.5, 0xffa040, true); // Левая (оранжевая)
  loadGoalModel(FIELD_WIDTH / 2 - 0.5, 0x2080ff, false); // Правая (синяя)
}

function createFieldMarkings() {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 2,
  });

  // Центральная линия
  const centerLineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.01, -FIELD_HEIGHT / 2),
    new THREE.Vector3(0, 0.01, FIELD_HEIGHT / 2),
  ]);
  const centerLine = new THREE.Line(centerLineGeom, lineMaterial);
  scene.add(centerLine);

  // Центральный круг
  const centerCirclePoints = [];
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    centerCirclePoints.push(
      new THREE.Vector3(Math.cos(angle) * 2, 0.01, Math.sin(angle) * 2)
    );
  }
  const centerCircleGeom = new THREE.BufferGeometry().setFromPoints(
    centerCirclePoints
  );
  const centerCircle = new THREE.LineLoop(centerCircleGeom, lineMaterial);
  scene.add(centerCircle);

  // Центральная точка
  const centerPointPoints = [];
  for (let i = 0; i <= 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    centerPointPoints.push(
      new THREE.Vector3(Math.cos(angle) * 0.2, 0.01, Math.sin(angle) * 0.2)
    );
  }
  const centerPointGeom = new THREE.BufferGeometry().setFromPoints(
    centerPointPoints
  );
  const centerPoint = new THREE.LineLoop(centerPointGeom, lineMaterial);
  scene.add(centerPoint);

  // Штрафные площади
  const penaltyAreaWidth = 6;
  const penaltyAreaDepth = 3;

  // Левая штрафная площадь
  const leftPenaltyGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, -penaltyAreaWidth / 2),
    new THREE.Vector3(
      -FIELD_WIDTH / 2 + penaltyAreaDepth,
      0.01,
      -penaltyAreaWidth / 2
    ),
    new THREE.Vector3(
      -FIELD_WIDTH / 2 + penaltyAreaDepth,
      0.01,
      penaltyAreaWidth / 2
    ),
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, penaltyAreaWidth / 2),
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, -penaltyAreaWidth / 2),
  ]);
  const leftPenalty = new THREE.Line(leftPenaltyGeom, lineMaterial);
  scene.add(leftPenalty);

  // Правая штрафная площадь
  const rightPenaltyGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, -penaltyAreaWidth / 2),
    new THREE.Vector3(
      FIELD_WIDTH / 2 - penaltyAreaDepth,
      0.01,
      -penaltyAreaWidth / 2
    ),
    new THREE.Vector3(
      FIELD_WIDTH / 2 - penaltyAreaDepth,
      0.01,
      penaltyAreaWidth / 2
    ),
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, penaltyAreaWidth / 2),
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, -penaltyAreaWidth / 2),
  ]);
  const rightPenalty = new THREE.Line(rightPenaltyGeom, lineMaterial);
  scene.add(rightPenalty);

  // Вратарские площади
  const goalAreaWidth = 3;
  const goalAreaDepth = 1;

  // Левая вратарская площадь
  const leftGoalAreaGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, -goalAreaWidth / 2),
    new THREE.Vector3(
      -FIELD_WIDTH / 2 + goalAreaDepth,
      0.01,
      -goalAreaWidth / 2
    ),
    new THREE.Vector3(
      -FIELD_WIDTH / 2 + goalAreaDepth,
      0.01,
      goalAreaWidth / 2
    ),
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, goalAreaWidth / 2),
    new THREE.Vector3(-FIELD_WIDTH / 2, 0.01, -goalAreaWidth / 2),
  ]);
  const leftGoalArea = new THREE.Line(leftGoalAreaGeom, lineMaterial);
  scene.add(leftGoalArea);

  // Правая вратарская площадь
  const rightGoalAreaGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, -goalAreaWidth / 2),
    new THREE.Vector3(
      FIELD_WIDTH / 2 - goalAreaDepth,
      0.01,
      -goalAreaWidth / 2
    ),
    new THREE.Vector3(FIELD_WIDTH / 2 - goalAreaDepth, 0.01, goalAreaWidth / 2),
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, goalAreaWidth / 2),
    new THREE.Vector3(FIELD_WIDTH / 2, 0.01, -goalAreaWidth / 2),
  ]);
  const rightGoalArea = new THREE.Line(rightGoalAreaGeom, lineMaterial);
  scene.add(rightGoalArea);
}

function loadGoalModel(x, color, isLeft) {
  const loader = new GLTFLoader();
  loader.load(
    "football_goal.glb",
    function (gltf) {
      const goal = gltf.scene;
      // Точный масштаб
      goal.scale.set(1.0, 1.0, 1.0);
      // Сдвиг по X: чуть ближе к краю поля
      // Для левых ворот: x + 0.2, для правых: x - 0.2
      goal.position.set(isLeft ? x + 0.2 : x - 0.2, 0, 0);
      // Разворот
      goal.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      scene.add(goal);
    },
    undefined,
    function (error) {
      console.error("Ошибка загрузки ворот:", error);
    }
  );
}

function createFaceTexture(emotion = "neutral", color = "#222") {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // Глаза
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-28, -10, 18, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(28, -10, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Зрачки
  ctx.fillStyle = "#222";
  let dx = 0,
    dy = 0;
  if (emotion === "happy") dy = 4;
  if (emotion === "sad") dy = -4;
  ctx.beginPath();
  ctx.arc(-28 + dx, -10 + dy, 7, 0, Math.PI * 2);
  ctx.arc(28 + dx, -10 + dy, 7, 0, Math.PI * 2);
  ctx.fill();
  // Брови/рот
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  if (emotion === "happy") {
    ctx.beginPath();
    ctx.arc(0, 18, 24, 0, Math.PI, false);
    ctx.stroke();
  } else if (emotion === "sad") {
    ctx.beginPath();
    ctx.arc(0, 38, 24, Math.PI, 2 * Math.PI, false);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-18, 24);
    ctx.lineTo(18, 24);
    ctx.stroke();
  }
  ctx.restore();
  return new THREE.CanvasTexture(canvas);
}

function createRobot(x, y, z, color, face = "neutral") {
  const geom = new THREE.BoxGeometry(ROBOT_SIZE, ROBOT_SIZE, ROBOT_SIZE);
  const matArray = [];
  for (let i = 0; i < 6; i++) {
    if (i === 4) {
      // Лицо (front)
      matArray.push(
        new THREE.MeshStandardMaterial({
          map: createFaceTexture(face, color === 0x2080ff ? "#3af" : "#fa4"),
        })
      );
    } else {
      matArray.push(new THREE.MeshStandardMaterial({ color }));
    }
  }
  const mesh = new THREE.Mesh(geom, matArray);
  mesh.position.set(x, y, z);
  mesh.userData.face = face;
  return mesh;
}

function setRobotEmotion(robot, emotion) {
  // Меняем текстуру лица
  const color = robot.material[0].color.getStyle();
  robot.material[4].map = createFaceTexture(emotion, color);
  robot.material[4].map.needsUpdate = true;
  robot.userData.face = emotion;
}

function resetPositions() {
  ball.position.set(0, BALL_RADIUS, 0);
  ballVelocity.set(0, 0, 0);
  robot1.position.set(-3, ROBOT_SIZE / 2, 0);
  robot2.position.set(3, ROBOT_SIZE / 2, 0);
  robot1Velocity.set(0, 0, 0);
  robot2Velocity.set(0, 0, 0);
  robot1Acceleration.set(0, 0, 0);
  robot2Acceleration.set(0, 0, 0);

  // Сбрасываем поворот роботов
  robot1.rotation.y = 0;
  robot2.rotation.y = Math.PI;

  setRobotEmotion(robot1, "neutral");
  setRobotEmotion(robot2, "neutral");
}

function updateScoreboard() {
  const scoreboard = document.getElementById("scoreboard");
  if (scoreboard) {
    scoreboard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div style="color: #2080ff; font-weight: bold; font-size: 24px;">${score1}</div>
        <div style="color: #fff; font-size: 18px;">VS</div>
        <div style="color: #ffa040; font-weight: bold; font-size: 24px;">${score2}</div>
      </div>
    `;

    // Анимация при обновлении счёта
    scoreboard.classList.add("goal-animation");
    setTimeout(() => {
      scoreboard.classList.remove("goal-animation");
    }, 500);
  }
}

function updateTimer() {
  const timer = document.getElementById("timer");
  if (timer) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timer.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  if (gameActive && now - lastTime >= 1000) {
    timeLeft--;
    updateTimer();
    lastTime = now;
    if (timeLeft <= 0) {
      gameActive = false;
      const winner =
        score1 > score2 ? "СИНИЙ" : score2 > score1 ? "ОРАНЖЕВЫЙ" : "НИЧЬЯ";
      document.getElementById("scoreboard").innerHTML = `
        <div style="text-align: center; color: #fff; font-size: 24px; font-weight: bold;">
          ИГРА ОКОНЧЕНА!<br>
          ${winner === "НИЧЬЯ" ? "НИЧЬЯ!" : `ПОБЕДИТЕЛЬ: ${winner}`}
        </div>
      `;
    }
  }

  if (gameActive) {
    aiStep();
    physicsStep();

    // Анимация разбитых роботов
    if (robot1Pieces.length > 0) {
      animateBrokenRobot(robot1Pieces);
    }
    if (robot2Pieces.length > 0) {
      animateBrokenRobot(robot2Pieces);
    }
  }

  renderer.render(scene, camera);
}

// === AI ===
function aiStep() {
  // Для каждого робота: простая стратегия - двигаться к мячу, если близко к мячу и мяч между ним и воротами соперника - пинать
  aiRobot(
    robot1,
    robot1Velocity,
    robot1Acceleration,
    ball,
    -FIELD_WIDTH / 2 + 0.5,
    0x2080ff,
    1
  );
  aiRobot(
    robot2,
    robot2Velocity,
    robot2Acceleration,
    ball,
    FIELD_WIDTH / 2 - 0.5,
    0xffa040,
    -1
  );
}

function updateRobotLookDirection(robot, targetPosition) {
  // Вычисляем направление от робота к цели
  const direction = new THREE.Vector3().subVectors(
    targetPosition,
    robot.position
  );
  direction.y = 0; // Игнорируем вертикальную составляющую

  if (direction.length() > 0.1) {
    direction.normalize();

    // Поворачиваем робота в направлении цели
    const angle = Math.atan2(direction.x, direction.z);
    robot.rotation.y = angle;
  }
}

function aiRobot(robot, robotVel, robotAcc, ball, goalX, color, direction) {
  const toBall = new THREE.Vector3().subVectors(ball.position, robot.position);
  toBall.y = 0;
  const dist = toBall.length();
  toBall.normalize();

  // Обновляем направление взгляда робота
  updateRobotLookDirection(robot, ball.position);

  // Ограничиваем скорость роботов
  const maxRobotSpeed = 0.2;
  const acceleration = 0.1; // Ускорение робота
  const friction = 0.92; // Трение робота

  // Вычисляем желаемое направление движения
  let desiredVelocity = new THREE.Vector3();

  // Если далеко от мяча - двигаться к мячу
  if (dist > BALL_RADIUS + ROBOT_SIZE / 2 + 0.2) {
    desiredVelocity.copy(toBall).multiplyScalar(maxRobotSpeed);
  } else {
    // Если между роботом и чужими воротами мяч - пинать
    const toGoal = new THREE.Vector3(goalX - robot.position.x, 0, 0);
    const ballToGoal = new THREE.Vector3(goalX - ball.position.x, 0, 0);
    if (Math.sign(toGoal.x) === Math.sign(ballToGoal.x)) {
      // Реалистичный удар по мячу
      const kickDirection = new THREE.Vector3()
        .subVectors(ball.position, robot.position)
        .normalize();

      // Добавляем случайность в удар
      kickDirection.x += (Math.random() - 0.5) * 0.08;
      kickDirection.z += (Math.random() - 0.5) * 0.08;
      kickDirection.normalize();

      const kickForce = 0.12 + Math.random() * 0.04; // Ещё более контролируемая сила
      ballVelocity.add(kickDirection.multiplyScalar(kickForce));

      // Небольшой откат после удара
      desiredVelocity.copy(kickDirection).multiplyScalar(-maxRobotSpeed * 0.3);
    } else {
      // Если не можем бить - отходим назад
      desiredVelocity.copy(toBall).multiplyScalar(-maxRobotSpeed * 0.5);
    }
  }

  // Плавное ускорение к желаемой скорости
  const velocityDiff = new THREE.Vector3().subVectors(
    desiredVelocity,
    robotVel
  );
  robotAcc.copy(velocityDiff).multiplyScalar(acceleration);

  // Применяем ускорение
  robotVel.add(robotAcc);

  // Применяем трение
  robotVel.multiplyScalar(friction);

  // Ограничиваем максимальную скорость
  if (robotVel.length() > maxRobotSpeed) {
    robotVel.normalize().multiplyScalar(maxRobotSpeed);
  }

  // Держим робота в пределах поля с мягкими границами
  const next = new THREE.Vector3().addVectors(robot.position, robotVel);
  const margin = ROBOT_SIZE / 2;

  if (Math.abs(next.x) > FIELD_WIDTH / 2 - margin) {
    robotVel.x *= 0.5; // Замедляем при приближении к границе
    if (Math.abs(next.x) > FIELD_WIDTH / 2 - margin * 0.5) {
      robotVel.x = 0; // Останавливаем у самой границы
    }
  }
  if (Math.abs(next.z) > FIELD_HEIGHT / 2 - margin) {
    robotVel.z *= 0.5;
    if (Math.abs(next.z) > FIELD_HEIGHT / 2 - margin * 0.5) {
      robotVel.z = 0;
    }
  }

  // Обновляем позицию
  robot.position.add(robotVel);
}

// === Физика ===
function physicsStep() {
  // Движение мяча
  ball.position.add(ballVelocity);

  // Реалистичная гравитация
  ballVelocity.y -= 0.015; // Увеличиваем гравитацию

  // Ограничиваем максимальную скорость мяча
  const maxSpeed = 0.8;
  if (ballVelocity.length() > maxSpeed) {
    ballVelocity.normalize().multiplyScalar(maxSpeed);
  }

  // Сопротивление воздуха (более реалистичное)
  ballVelocity.multiplyScalar(0.98);

  // Столкновение с полом
  if (ball.position.y < BALL_RADIUS) {
    ball.position.y = BALL_RADIUS;
    ballVelocity.y = Math.abs(ballVelocity.y) * 0.6; // Меньший отскок от пола

    // Трение о пол
    ballVelocity.x *= 0.95;
    ballVelocity.z *= 0.95;
  }

  // Столкновения с границами поля (более мягкие)
  if (Math.abs(ball.position.x) > FIELD_WIDTH / 2 - BALL_RADIUS) {
    ball.position.x =
      Math.sign(ball.position.x) * (FIELD_WIDTH / 2 - BALL_RADIUS);
    ballVelocity.x *= -0.5; // Меньший отскок от стен
  }
  if (Math.abs(ball.position.z) > FIELD_HEIGHT / 2 - BALL_RADIUS) {
    ball.position.z =
      Math.sign(ball.position.z) * (FIELD_HEIGHT / 2 - BALL_RADIUS);
    ballVelocity.z *= -0.5; // Меньший отскок от стен
  }

  // Дополнительная защита: если мяч застрял в воротах, выталкиваем его
  if (goalScored) {
    // Если гол уже засчитан, выталкиваем мяч из ворот
    if (
      ball.position.x < -FIELD_WIDTH / 2 + 0.5 &&
      Math.abs(ball.position.z) < GOAL_WIDTH / 2
    ) {
      ball.position.x = -FIELD_WIDTH / 2 + 0.5;
      ballVelocity.x = Math.abs(ballVelocity.x) * 0.3; // Выталкиваем мяч
    }
    if (
      ball.position.x > FIELD_WIDTH / 2 - 0.5 &&
      Math.abs(ball.position.z) < GOAL_WIDTH / 2
    ) {
      ball.position.x = FIELD_WIDTH / 2 - 0.5;
      ballVelocity.x = -Math.abs(ballVelocity.x) * 0.3; // Выталкиваем мяч
    }
  }

  // Столкновения с роботами
  collideRobot(ball, robot1);
  collideRobot(ball, robot2);

  // Голы
  checkGoal();
}

function collideRobot(ball, robot) {
  const r = ROBOT_SIZE / 2 + BALL_RADIUS;
  const d = new THREE.Vector3().subVectors(ball.position, robot.position);

  // Проверяем столкновение в горизонтальной плоскости
  const dHorizontal = new THREE.Vector3(d.x, 0, d.z);
  const distance = dHorizontal.length();

  if (distance < r) {
    dHorizontal.normalize();

    // Корректируем позицию мяча (мягко)
    const overlap = r - distance;
    ball.position.x += dHorizontal.x * overlap * 0.8;
    ball.position.z += dHorizontal.z * overlap * 0.8;

    // Реалистичный импульс от столкновения
    const impactForce = 0.08; // Уменьшаем силу удара
    ballVelocity.x += dHorizontal.x * impactForce;
    ballVelocity.z += dHorizontal.z * impactForce;

    // Ограничиваем вертикальную скорость при столкновении
    if (ballVelocity.y > 0.3) {
      ballVelocity.y = 0.3;
    }

    // Небольшой отскок вверх только если мяч ниже робота
    if (ball.position.y < robot.position.y + ROBOT_SIZE / 2 - 0.2) {
      ballVelocity.y = Math.min(Math.abs(ballVelocity.y) + 0.02, 0.2);
    }
  }
}

function checkGoal() {
  // Если гол уже засчитан, не проверяем снова
  if (goalScored) return;

  // Левая сторона (гол синий)
  if (
    ball.position.x < -FIELD_WIDTH / 2 + 0.5 &&
    Math.abs(ball.position.z) < GOAL_WIDTH / 2
  ) {
    goalScored = true; // Отмечаем, что гол засчитан
    score2++;
    updateScoreboard();

    // Анимация поломки проигравшего робота (robot1)
    if (robot1.visible) {
      robot1.visible = false;
      robot1Pieces = createBrokenRobotPieces(robot1, 0x2080ff);
    }

    setRobotEmotion(robot2, "happy");

    // Показываем сообщение о голе
    showGoalMessage("ГОЛ! ОРАНЖЕВЫЙ ЗАБИЛ!");

    // Сброс позиций через 2 секунды
    setTimeout(() => {
      resetPositions();
      clearBrokenRobot(robot1Pieces);
      robot1.visible = true;
      goalScored = false; // Сбрасываем флаг после сброса позиций
    }, 2000);

    return;
  }

  // Правая сторона (гол оранжевый)
  if (
    ball.position.x > FIELD_WIDTH / 2 - 0.5 &&
    Math.abs(ball.position.z) < GOAL_WIDTH / 2
  ) {
    goalScored = true; // Отмечаем, что гол засчитан
    score1++;
    updateScoreboard();

    // Анимация поломки проигравшего робота (robot2)
    if (robot2.visible) {
      robot2.visible = false;
      robot2Pieces = createBrokenRobotPieces(robot2, 0xffa040);
    }

    setRobotEmotion(robot1, "happy");

    // Показываем сообщение о голе
    showGoalMessage("ГОЛ! СИНИЙ ЗАБИЛ!");

    // Сброс позиций через 2 секунды
    setTimeout(() => {
      resetPositions();
      clearBrokenRobot(robot2Pieces);
      robot2.visible = true;
      goalScored = false; // Сбрасываем флаг после сброса позиций
    }, 2000);

    return;
  }
}

function showGoalMessage(message) {
  // Создаём временное сообщение о голе
  const goalMessage = document.createElement("div");
  goalMessage.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 0, 0.9);
    color: #000;
    padding: 20px 40px;
    border-radius: 15px;
    font-size: 32px;
    font-weight: bold;
    z-index: 2000;
    animation: goalMessage 2s ease-in-out;
  `;
  goalMessage.textContent = message;

  // Добавляем CSS анимацию
  const style = document.createElement("style");
  style.textContent = `
    @keyframes goalMessage {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(goalMessage);

  // Удаляем сообщение через 2 секунды
  setTimeout(() => {
    document.body.removeChild(goalMessage);
  }, 2000);
}

function createBrokenRobotPieces(robot, color) {
  const pieces = [];
  const pieceCount = 8;

  for (let i = 0; i < pieceCount; i++) {
    const pieceSize = ROBOT_SIZE * (0.3 + Math.random() * 0.4);
    const geom = new THREE.BoxGeometry(pieceSize, pieceSize, pieceSize);
    const mat = new THREE.MeshStandardMaterial({ color });
    const piece = new THREE.Mesh(geom, mat);

    // Позиция относительно центра робота
    piece.position.copy(robot.position);
    piece.position.x += (Math.random() - 0.5) * 2;
    piece.position.y += Math.random() * 1.5;
    piece.position.z += (Math.random() - 0.5) * 2;

    // Случайная скорость разлёта
    piece.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.2 + 0.1,
      (Math.random() - 0.5) * 0.3
    );

    piece.rotation.x = Math.random() * Math.PI * 2;
    piece.rotation.y = Math.random() * Math.PI * 2;
    piece.rotation.z = Math.random() * Math.PI * 2;

    pieces.push(piece);
    scene.add(piece);
  }

  return pieces;
}

function animateBrokenRobot(pieces) {
  pieces.forEach((piece) => {
    // Гравитация для кусков
    piece.velocity.y -= 0.01;

    // Движение кусков
    piece.position.add(piece.velocity);

    // Вращение кусков
    piece.rotation.x += 0.1;
    piece.rotation.y += 0.1;
    piece.rotation.z += 0.05;

    // Столкновение с полом
    if (piece.position.y < 0.2) {
      piece.position.y = 0.2;
      piece.velocity.y = Math.abs(piece.velocity.y) * 0.3;
      piece.velocity.x *= 0.8;
      piece.velocity.z *= 0.8;
    }
  });
}

function clearBrokenRobot(pieces) {
  pieces.forEach((piece) => {
    scene.remove(piece);
  });
  pieces.length = 0;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
