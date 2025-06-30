// === Three.js базовая сцена ===
let scene, camera, renderer;
let field, leftGoal, rightGoal, ball;
let robot1, robot2;
let ballVelocity = new THREE.Vector3();
let robot1Velocity = new THREE.Vector3();
let robot2Velocity = new THREE.Vector3();
let robot1Acceleration = new THREE.Vector3();
let robot2Acceleration = new THREE.Vector3();

const FIELD_WIDTH = 16;
const FIELD_HEIGHT = 10;
const GOAL_WIDTH = 3;
const GOAL_HEIGHT = 2.5;
const BALL_RADIUS = 0.4;
const ROBOT_SIZE = 1;
const GAME_TIME = 60; // секунд

let score1 = 0,
  score2 = 0;
let timeLeft = GAME_TIME;
let lastTime = Date.now();
let gameActive = true;

function init() {
  // Сцена
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f3f3);

  // Камера
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 13, 13);
  camera.lookAt(0, 0, 0);

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("game-container").appendChild(renderer.domElement);

  // Свет
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Поле (серый прямоугольник)
  const fieldGeom = new THREE.PlaneGeometry(FIELD_WIDTH, FIELD_HEIGHT);
  const fieldMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  field = new THREE.Mesh(fieldGeom, fieldMat);
  field.rotation.x = -Math.PI / 2;
  scene.add(field);

  // Сетка поля (белые линии)
  const grid = new THREE.GridHelper(
    FIELD_WIDTH,
    FIELD_WIDTH,
    0xffffff,
    0xffffff
  );
  grid.position.y = 0.01;
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // Ворота (левая - оранжевая, правая - синяя)
  leftGoal = createGoal(-FIELD_WIDTH / 2 + 0.5, 0xffa040);
  rightGoal = createGoal(FIELD_WIDTH / 2 - 0.5, 0x2080ff);
  scene.add(leftGoal);
  scene.add(rightGoal);

  // Мяч
  const ballGeom = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  ball = new THREE.Mesh(ballGeom, ballMat);
  ball.position.set(0, BALL_RADIUS, 0);
  scene.add(ball);

  // Роботы-кубы
  robot1 = createRobot(-3, ROBOT_SIZE / 2, 0, 0x2080ff, "neutral");
  robot2 = createRobot(3, ROBOT_SIZE / 2, 0, 0xffa040, "neutral");
  scene.add(robot1);
  scene.add(robot2);

  updateScoreboard();
  updateTimer();
  animate();
}

function createGoal(x, color) {
  const group = new THREE.Group();
  // Стойки
  const postGeom = new THREE.BoxGeometry(0.2, GOAL_HEIGHT, 0.2);
  const postMat = new THREE.MeshStandardMaterial({ color });
  const leftPost = new THREE.Mesh(postGeom, postMat);
  leftPost.position.set(x, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
  const rightPost = new THREE.Mesh(postGeom, postMat);
  rightPost.position.set(x, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
  // Перекладина
  const barGeom = new THREE.BoxGeometry(0.2, 0.2, GOAL_WIDTH + 0.2);
  const bar = new THREE.Mesh(barGeom, postMat);
  bar.position.set(x, GOAL_HEIGHT, 0);
  group.add(leftPost, rightPost, bar);
  return group;
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
  document.getElementById("scoreboard").textContent = `${score1} : ${score2}`;
}

function updateTimer() {
  document.getElementById("timer").textContent = `${String(
    Math.floor(timeLeft / 60)
  ).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
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
      document.getElementById("scoreboard").textContent += "  GAME OVER";
    }
  }
  if (gameActive) {
    aiStep();
    physicsStep();
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
  // Левая сторона (гол синий)
  if (
    ball.position.x < -FIELD_WIDTH / 2 + 0.5 &&
    Math.abs(ball.position.z) < GOAL_WIDTH / 2
  ) {
    score2++;
    updateScoreboard();
    setRobotEmotion(robot2, "happy");
    setRobotEmotion(robot1, "sad");
    setTimeout(() => resetPositions(), 1200);
    return;
  }
  // Правая сторона (гол оранжевый)
  if (
    ball.position.x > FIELD_WIDTH / 2 - 0.5 &&
    Math.abs(ball.position.z) < GOAL_WIDTH / 2
  ) {
    score1++;
    updateScoreboard();
    setRobotEmotion(robot1, "happy");
    setRobotEmotion(robot2, "sad");
    setTimeout(() => resetPositions(), 1200);
    return;
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
