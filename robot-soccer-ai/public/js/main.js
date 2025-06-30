// Основной класс приложения
class App {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.character = null;
    this.environment = null;
    this.animationSystem = null;
    this.aiController = null;
    this.socket = null;

    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.keys = {};

    this.init();
  }

  async init() {
    try {
      // Инициализация Socket.IO
      await this.initSocket();

      // Инициализация Three.js
      this.initThreeJS();

      // Создание сцены
      this.createScene();

      // Создание персонажа
      this.createCharacter();

      // Создание среды
      this.createEnvironment();

      // Создание системы анимаций
      this.createAnimationSystem();

      // Создание AI контроллера
      this.createAIController();

      // Настройка управления
      this.setupControls();

      // Настройка UI
      this.setupUI();

      // Запуск рендера
      this.start();

      // Скрытие экрана загрузки
      this.hideLoadingScreen();
    } catch (error) {
      console.error("Ошибка инициализации:", error);
      this.showError("Ошибка инициализации приложения");
    }
  }

  async initSocket() {
    try {
      this.socket = io();

      this.socket.on("connect", () => {
        console.log("Подключен к серверу");
        this.updateConnectionStatus(true);
      });

      this.socket.on("disconnect", () => {
        console.log("Отключен от сервера");
        this.updateConnectionStatus(false);
      });

      this.socket.on("connect_error", (error) => {
        console.error("Ошибка подключения:", error);
        this.updateConnectionStatus(false);
      });
    } catch (error) {
      console.warn(
        "Не удалось подключиться к серверу, работаем в автономном режиме"
      );
      this.socket = null;
    }
  }

  initThreeJS() {
    // Создание сцены
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Голубое небо

    // Создание камеры
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);

    // Создание рендерера
    const canvas = document.getElementById("sceneCanvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Обработка изменения размера окна
    window.addEventListener("resize", () => this.onWindowResize());
  }

  createScene() {
    // Добавление тумана для глубины
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

    // Создание неба
    this.createSky();
  }

  createSky() {
    // Простое небо с градиентом
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  createCharacter() {
    this.character = new Character(this.scene, { x: 0, y: 1, z: 0 });
  }

  createEnvironment() {
    this.environment = new Environment(this.scene);
  }

  createAnimationSystem() {
    this.animationSystem = new AnimationSystem(this.character);
    this.character.animationSystem = this.animationSystem;
  }

  createAIController() {
    this.aiController = new AIController(
      this.character,
      this.environment,
      this.socket
    );
  }

  setupControls() {
    // Обработка нажатий клавиш
    document.addEventListener("keydown", (event) => {
      this.keys[event.code] = true;
      this.handleKeyDown(event);
    });

    document.addEventListener("keyup", (event) => {
      this.keys[event.code] = false;
    });

    // Обработка мыши
    const canvas = document.getElementById("sceneCanvas");
    canvas.addEventListener("mousedown", (event) => this.onMouseDown(event));
    canvas.addEventListener("mousemove", (event) => this.onMouseMove(event));
    canvas.addEventListener("wheel", (event) => this.onMouseWheel(event));
  }

  setupUI() {
    // Кнопка включения/выключения AI
    const toggleAIButton = document.getElementById("toggleAI");
    if (toggleAIButton) {
      toggleAIButton.addEventListener("click", () => this.toggleAI());
    }

    // Кнопка сброса обучения
    const resetLearningButton = document.getElementById("resetLearning");
    if (resetLearningButton) {
      resetLearningButton.addEventListener("click", () => this.resetLearning());
    }

    // Селектор типа поверхности
    const surfaceTypeSelect = document.getElementById("surfaceType");
    if (surfaceTypeSelect) {
      surfaceTypeSelect.addEventListener("change", (event) => {
        this.environment.setSurfaceType(event.target.value);
      });
    }

    // Слайдер сложности
    const difficultySlider = document.getElementById("difficulty");
    const difficultyValue = document.getElementById("difficultyValue");
    if (difficultySlider && difficultyValue) {
      difficultySlider.addEventListener("input", (event) => {
        const value = event.target.value;
        difficultyValue.textContent = value;
        this.environment.setDifficulty(parseInt(value));
      });
    }

    // Кнопка генерации среды
    const generateEnvironmentButton = document.getElementById(
      "generateEnvironment"
    );
    if (generateEnvironmentButton) {
      generateEnvironmentButton.addEventListener("click", () => {
        this.environment.generateObstacles();
      });
    }
  }

  handleKeyDown(event) {
    if (this.aiController.isAIActive()) {
      // Если AI активен, отключаем ручное управление
      return;
    }

    switch (event.code) {
      case "KeyW":
        this.character.move("forward");
        break;
      case "KeyS":
        this.character.move("backward");
        break;
      case "KeyA":
        this.character.move("left");
        break;
      case "KeyD":
        this.character.move("right");
        break;
      case "Space":
        this.character.jump();
        break;
      case "ShiftLeft":
        if (!this.character.isCrouching) {
          this.character.crouch();
        } else {
          this.character.stand();
        }
        break;
      case "KeyR":
        this.character.resetPosition();
        break;
    }
  }

  onMouseDown(event) {
    // Обработка клика мыши для создания цели
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.environment.createTarget(point);
    }
  }

  onMouseMove(event) {
    // Обработка движения мыши для вращения камеры
    if (event.buttons === 1) {
      // Левая кнопка мыши
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      // Вращение камеры вокруг персонажа
      const distance = this.camera.position.distanceTo(this.character.position);
      const angleX = movementY * 0.01;
      const angleY = movementX * 0.01;

      // Ограничение вертикального вращения
      const currentAngleX = Math.asin(this.camera.position.y / distance);
      const newAngleX = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, currentAngleX - angleX)
      );

      this.camera.position.y = distance * Math.sin(newAngleX);
      this.camera.position.x =
        distance * Math.cos(newAngleX) * Math.sin(angleY);
      this.camera.position.z =
        distance * Math.cos(newAngleX) * Math.cos(angleY);

      this.camera.lookAt(this.character.position);
    }
  }

  onMouseWheel(event) {
    // Зум камеры
    const zoomSpeed = 0.1;
    const distance = this.camera.position.distanceTo(this.character.position);
    const newDistance = Math.max(
      5,
      Math.min(50, distance + event.deltaY * zoomSpeed)
    );

    const direction = this.camera.position
      .clone()
      .sub(this.character.position)
      .normalize();
    this.camera.position.copy(
      this.character.position.clone().add(direction.multiplyScalar(newDistance))
    );
  }

  toggleAI() {
    const toggleButton = document.getElementById("toggleAI");
    const aiStatus = document.getElementById("aiStatus");

    if (this.aiController.isAIActive()) {
      this.aiController.deactivate();
      if (toggleButton) toggleButton.textContent = "Включить AI";
      if (aiStatus) aiStatus.textContent = "Отключен";
    } else {
      this.aiController.activate();
      if (toggleButton) toggleButton.textContent = "Отключить AI";
      if (aiStatus) aiStatus.textContent = "Активен";
    }
  }

  resetLearning() {
    this.aiController.resetLearning();

    // Запрос статистики с сервера
    if (this.socket) {
      this.socket.emit("get_learning_stats");
    }
  }

  updateConnectionStatus(connected) {
    const statusDot = document.querySelector(".status-dot");
    const statusText = document.querySelector(".status-text");

    if (statusDot) {
      statusDot.classList.toggle("connected", connected);
    }

    if (statusText) {
      statusText.textContent = connected ? "Подключен" : "Отключен";
    }
  }

  onWindowResize() {
    const canvas = document.getElementById("sceneCanvas");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update() {
    const deltaTime = this.clock.getDelta();

    // Обновление персонажа
    if (this.character) {
      this.character.update(deltaTime, this.environment);
    }

    // Обновление среды
    if (this.environment) {
      this.environment.update(deltaTime);
      this.environment.updateTargets(deltaTime);
    }

    // Обновление системы анимаций
    if (this.animationSystem) {
      this.animationSystem.update(deltaTime);
    }

    // Обновление AI контроллера
    if (this.aiController) {
      this.aiController.update(deltaTime);
    }

    // Обновление камеры для следования за персонажем
    this.updateCamera();

    // Обновление UI
    this.updateUI();
  }

  updateCamera() {
    if (!this.character) return;

    // Плавное следование камеры за персонажем
    const targetPosition = this.character.position
      .clone()
      .add(new THREE.Vector3(0, 5, 10));
    this.camera.position.lerp(targetPosition, 0.05);
    this.camera.lookAt(this.character.position);
  }

  updateUI() {
    // Обновление информации о последнем действии
    const lastActionElement = document.getElementById("lastAction");
    if (lastActionElement && this.aiController) {
      const lastAction = this.aiController.getLastAction();
      if (lastAction) {
        lastActionElement.textContent = this.translateAction(lastAction);
      }
    }
  }

  translateAction(action) {
    const translations = {
      move_forward: "Вперед",
      move_backward: "Назад",
      move_left: "Влево",
      move_right: "Вправо",
      jump: "Прыжок",
      crouch: "Присесть",
      wait: "Ожидание",
    };

    return translations[action] || action;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    this.update();
    this.render();
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }
  }

  showError(message) {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      const content = loadingScreen.querySelector(".loading-content");
      if (content) {
        content.innerHTML = `
                    <h2 style="color: #e74c3c;">Ошибка</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Перезагрузить
                    </button>
                `;
      }
    }
  }
}

// Инициализация приложения при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  // Проверка поддержки WebGL
  if (!window.WebGLRenderingContext) {
    alert("Ваш браузер не поддерживает WebGL. Пожалуйста, обновите браузер.");
    return;
  }

  // Создание и запуск приложения
  window.app = new App();
});

// Обработка ошибок
window.addEventListener("error", (event) => {
  console.error("Глобальная ошибка:", event.error);
  if (window.app) {
    window.app.showError("Произошла ошибка в приложении");
  }
});

// Обработка необработанных промисов
window.addEventListener("unhandledrejection", (event) => {
  console.error("Необработанная ошибка промиса:", event.reason);
  if (window.app) {
    window.app.showError("Произошла ошибка в приложении");
  }
});
