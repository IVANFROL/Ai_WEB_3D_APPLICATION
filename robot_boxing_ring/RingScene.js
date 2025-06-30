import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import Robot from "./Robot.js";
import AIController from "./AIController.js";

export default class RingScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.robot1 = null;
    this.robot2 = null;
    this.ai1 = null;
    this.ai2 = null;
    this.scoreDiv = null;
    this.healthContainer = null;

    // Система звуковых эффектов
    this.sounds = {};
    this.victorySoundPlayed = false;
    this.winnerAnnounced = false;
    this.initSounds();

    this.initRing();
    this.initRobots();
    this.initScoreboard();
    this.createHealthBars();

    // Привязываем метод animate к контексту
    this.animate = this.animate.bind(this);
    this.animate();
  }

  // Новый метод: инициализация звуковых эффектов
  initSounds() {
    // Создаём аудио контекст
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Функция для создания звукового эффекта
    const createSound = (frequency, duration, type = "sine") => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };

    // Сохраняем функцию создания звуков
    this.createSound = createSound;
  }

  // Новый метод: воспроизведение звука удара
  playHitSound(damage) {
    if (!this.audioContext) return;

    // Разные звуки в зависимости от урона
    if (damage > 30) {
      // Сильный удар
      this.createSound(150, 0.3, "sawtooth");
      this.createSound(200, 0.2, "square");
    } else if (damage > 20) {
      // Средний удар
      this.createSound(200, 0.2, "sine");
      this.createSound(300, 0.1, "triangle");
    } else {
      // Лёгкий удар
      this.createSound(300, 0.1, "sine");
    }
  }

  // Новый метод: воспроизведение звука комбо
  playComboSound(comboCount) {
    if (!this.audioContext) return;

    // Звук комбо зависит от количества ударов
    const frequency = 400 + comboCount * 50;
    this.createSound(frequency, 0.2, "sine");
    this.createSound(frequency * 1.5, 0.1, "square");
  }

  // Новый метод: воспроизведение звука критического удара
  playCriticalSound() {
    if (!this.audioContext) return;

    // Звук критического удара
    this.createSound(100, 0.4, "sawtooth");
    this.createSound(200, 0.3, "square");
    this.createSound(400, 0.2, "sine");
  }

  // Новый метод: воспроизведение звука блокирования
  playBlockSound() {
    if (!this.audioContext) return;

    // Звук блокирования
    this.createSound(600, 0.1, "sine");
    this.createSound(800, 0.1, "triangle");
  }

  // Новый метод: воспроизведение звука уклонения
  playDodgeSound() {
    if (!this.audioContext) return;

    // Звук уклонения
    this.createSound(800, 0.1, "sine");
    this.createSound(1000, 0.1, "sine");
  }

  // Новый метод: воспроизведение звука победы
  playVictorySound() {
    if (!this.audioContext) return;

    // Звук победы - восходящая мелодия
    this.createSound(200, 0.3, "sine");
    setTimeout(() => this.createSound(300, 0.3, "sine"), 300);
    setTimeout(() => this.createSound(400, 0.3, "sine"), 600);
    setTimeout(() => this.createSound(500, 0.5, "sine"), 900);
  }

  initRing() {
    // Основа ринга
    const ringGeometry = new THREE.BoxGeometry(8, 0.3, 8);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xffa040 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.15;
    this.scene.add(ring);

    // Столбики
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const postHeight = 1.5;
    const postRadius = 0.13;
    const postPositions = [
      [3.7, postHeight / 2, 3.7],
      [-3.7, postHeight / 2, 3.7],
      [-3.7, postHeight / 2, -3.7],
      [3.7, postHeight / 2, -3.7],
    ];
    for (const [x, y, z] of postPositions) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16),
        postMaterial
      );
      post.position.set(x, y, z);
      this.scene.add(post);
    }

    // Канаты
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    for (let h = 0.4; h <= 1.2; h += 0.4) {
      this.addRope([-3.7, h, -3.7], [3.7, h, -3.7], ropeMaterial);
      this.addRope([-3.7, h, 3.7], [3.7, h, 3.7], ropeMaterial);
      this.addRope([-3.7, h, -3.7], [-3.7, h, 3.7], ropeMaterial);
      this.addRope([3.7, h, -3.7], [3.7, h, 3.7], ropeMaterial);
    }

    // Трофей
    const trophy = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.7,
        roughness: 0.2,
      })
    );
    trophy.position.set(0, 1.5, 3.2);
    this.scene.add(trophy);

    // Табло
    const scoreboard = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    scoreboard.position.set(0, 2.5, -4.2);
    this.scene.add(scoreboard);

    // Скамейки
    const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.2, 0.5),
      benchMaterial
    );
    bench.position.set(-5, 0.25, 2.5);
    this.scene.add(bench);
    const bench2 = bench.clone();
    bench2.position.set(5, 0.25, -2.5);
    this.scene.add(bench2);

    // Гантели
    const dumbbellMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
    });
    for (let i = 0; i < 2; i++) {
      const dumbbell = new THREE.Group();
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.7, 16),
        dumbbellMaterial
      );
      bar.rotation.z = Math.PI / 2;
      dumbbell.add(bar);
      for (let s = -1; s <= 1; s += 2) {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.18, 16),
          dumbbellMaterial
        );
        plate.position.x = s * 0.35;
        dumbbell.add(plate);
      }
      dumbbell.position.set(-5 + i * 10, 0.4, 3.2);
      this.scene.add(dumbbell);
    }

    // Бутылки
    const bottleMaterial = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
    for (let i = 0; i < 2; i++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16),
        bottleMaterial
      );
      bottle.position.set(-5 + i * 10, 0.65, 2.7);
      this.scene.add(bottle);
    }

    // Свет
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 10, 7);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  }

  addRope(start, end, material) {
    const ropeGeom = new THREE.CylinderGeometry(
      0.06,
      0.06,
      new THREE.Vector3()
        .fromArray(start)
        .distanceTo(new THREE.Vector3().fromArray(end)),
      8
    );
    const rope = new THREE.Mesh(ropeGeom, material);
    rope.position.set(
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2
    );
    // Поворот
    const dir = new THREE.Vector3()
      .fromArray(end)
      .sub(new THREE.Vector3().fromArray(start))
      .normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    const angle = Math.acos(dir.y === 0 ? dir.z : dir.y);
    rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(rope);
  }

  initRobots() {
    this.robot1 = new Robot(
      "Orange",
      0xff8000,
      new THREE.Vector3(-2, 0, 0),
      this.scene
    );
    this.robot2 = new Robot(
      "Blue",
      0x2080ff,
      new THREE.Vector3(2, 0, 0),
      this.scene
    );
    this.ai1 = new AIController(this.robot1, this.robot2);
    this.ai2 = new AIController(this.robot2, this.robot1);
  }

  initScoreboard() {
    this.scoreDiv = document.createElement("div");
    this.scoreDiv.style.position = "absolute";
    this.scoreDiv.style.top = "20px";
    this.scoreDiv.style.left = "50%";
    this.scoreDiv.style.transform = "translateX(-50%)";
    this.scoreDiv.style.fontSize = "2rem";
    this.scoreDiv.style.fontWeight = "bold";
    this.scoreDiv.style.color = "#222";
    this.scoreDiv.style.background = "rgba(255,255,255,0.8)";
    this.scoreDiv.style.padding = "8px 24px";
    this.scoreDiv.style.borderRadius = "12px";
    this.scoreDiv.style.zIndex = "10";
    this.container.appendChild(this.scoreDiv);

    // Шкалы здоровья в стиле Mortal Kombat/UFC
    this.createHealthBars();
  }

  createHealthBars() {
    // Контейнер для шкал здоровья
    this.healthContainer = document.createElement("div");
    this.healthContainer.style.position = "absolute";
    this.healthContainer.style.top = "80px";
    this.healthContainer.style.left = "0";
    this.healthContainer.style.right = "0";
    this.healthContainer.style.display = "flex";
    this.healthContainer.style.justifyContent = "space-between";
    this.healthContainer.style.padding = "0 40px";
    this.healthContainer.style.zIndex = "10";
    this.container.appendChild(this.healthContainer);

    // Шкала здоровья для робота 1 (Orange)
    this.healthBar1 = this.createHealthBar("Orange", "#ff8000", "left");
    this.healthContainer.appendChild(this.healthBar1);

    // Шкала здоровья для робота 2 (Blue)
    this.healthBar2 = this.createHealthBar("Blue", "#2080ff", "right");
    this.healthContainer.appendChild(this.healthBar2);
  }

  createHealthBar(name, color, align) {
    const healthBarContainer = document.createElement("div");
    healthBarContainer.style.display = "flex";
    healthBarContainer.style.flexDirection = "column";
    healthBarContainer.style.alignItems =
      align === "left" ? "flex-start" : "flex-end";
    healthBarContainer.style.width = "300px";

    // Имя робота
    const nameDiv = document.createElement("div");
    nameDiv.textContent = name;
    nameDiv.style.color = color;
    nameDiv.style.fontSize = "1.2rem";
    nameDiv.style.fontWeight = "bold";
    nameDiv.style.marginBottom = "8px";
    nameDiv.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    healthBarContainer.appendChild(nameDiv);

    // Контейнер для шкалы здоровья
    const barContainer = document.createElement("div");
    barContainer.style.width = "250px";
    barContainer.style.height = "25px";
    barContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
    barContainer.style.border = "3px solid #333";
    barContainer.style.borderRadius = "15px";
    barContainer.style.overflow = "hidden";
    barContainer.style.position = "relative";
    barContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    barContainer.style.marginBottom = "8px";

    // Шкала здоровья
    const healthBar = document.createElement("div");
    healthBar.style.width = "100%";
    healthBar.style.height = "100%";
    healthBar.style.backgroundColor = color;
    healthBar.style.transition = "width 0.3s ease";
    healthBar.style.position = "relative";
    healthBar.style.overflow = "hidden";

    // Эффект свечения
    const glow = document.createElement("div");
    glow.style.position = "absolute";
    glow.style.top = "0";
    glow.style.left = "0";
    glow.style.right = "0";
    glow.style.bottom = "0";
    glow.style.background = `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`;
    glow.style.animation = "glow 2s infinite";
    healthBar.appendChild(glow);

    // Добавляем CSS анимацию для свечения
    if (!document.getElementById("healthBarStyles")) {
      const style = document.createElement("style");
      style.id = "healthBarStyles";
      style.textContent = `
        @keyframes glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .health-shake {
          animation: shake 0.1s ease-in-out;
        }
        @keyframes combo-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .combo-active {
          animation: combo-pulse 0.5s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }

    barContainer.appendChild(healthBar);
    healthBarContainer.appendChild(barContainer);

    // Контейнер для шкалы выносливости
    const staminaContainer = document.createElement("div");
    staminaContainer.style.width = "250px";
    staminaContainer.style.height = "15px";
    staminaContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
    staminaContainer.style.border = "2px solid #555";
    staminaContainer.style.borderRadius = "10px";
    staminaContainer.style.overflow = "hidden";
    staminaContainer.style.position = "relative";
    staminaContainer.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
    staminaContainer.style.marginBottom = "8px";

    // Шкала выносливости
    const staminaBar = document.createElement("div");
    staminaBar.style.width = "100%";
    staminaBar.style.height = "100%";
    staminaBar.style.backgroundColor = "#00ff88";
    staminaBar.style.transition = "width 0.3s ease";
    staminaBar.style.position = "relative";
    staminaBar.style.overflow = "hidden";

    // Эффект свечения для выносливости
    const staminaGlow = document.createElement("div");
    staminaGlow.style.position = "absolute";
    staminaGlow.style.top = "0";
    staminaGlow.style.left = "0";
    staminaGlow.style.right = "0";
    staminaGlow.style.bottom = "0";
    staminaGlow.style.background = `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`;
    staminaGlow.style.animation = "glow 3s infinite";
    staminaBar.appendChild(staminaGlow);

    staminaContainer.appendChild(staminaBar);
    healthBarContainer.appendChild(staminaContainer);

    // Контейнер для шкалы адреналина
    const adrenalineContainer = document.createElement("div");
    adrenalineContainer.style.width = "250px";
    adrenalineContainer.style.height = "12px";
    adrenalineContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
    adrenalineContainer.style.border = "2px solid #777";
    adrenalineContainer.style.borderRadius = "8px";
    adrenalineContainer.style.overflow = "hidden";
    adrenalineContainer.style.position = "relative";
    adrenalineContainer.style.boxShadow = "0 0 3px rgba(0,0,0,0.3)";
    adrenalineContainer.style.marginBottom = "8px";

    // Шкала адреналина
    const adrenalineBar = document.createElement("div");
    adrenalineBar.style.width = "100%";
    adrenalineBar.style.height = "100%";
    adrenalineBar.style.backgroundColor = "#ff0088";
    adrenalineBar.style.transition = "width 0.3s ease";
    adrenalineBar.style.position = "relative";
    adrenalineBar.style.overflow = "hidden";

    adrenalineContainer.appendChild(adrenalineBar);
    healthBarContainer.appendChild(adrenalineContainer);

    // Комбо-счётчик
    const comboCounter = document.createElement("div");
    comboCounter.textContent = "";
    comboCounter.style.color = "#ffdd00";
    comboCounter.style.fontSize = "1.1rem";
    comboCounter.style.fontWeight = "bold";
    comboCounter.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    comboCounter.style.marginBottom = "8px";
    comboCounter.style.textAlign = align === "left" ? "left" : "right";
    healthBarContainer.appendChild(comboCounter);

    // Индикатор травм
    const injuryIndicator = document.createElement("div");
    injuryIndicator.style.display = "flex";
    injuryIndicator.style.gap = "4px";
    injuryIndicator.style.justifyContent =
      align === "left" ? "flex-start" : "flex-end";
    injuryIndicator.style.marginBottom = "8px";

    // Создаём индикаторы для головы, тела и рук
    const headInjury = document.createElement("div");
    headInjury.style.width = "20px";
    headInjury.style.height = "20px";
    headInjury.style.borderRadius = "50%";
    headInjury.style.backgroundColor = "#333";
    headInjury.style.border = "2px solid #555";

    const bodyInjury = document.createElement("div");
    bodyInjury.style.width = "20px";
    bodyInjury.style.height = "20px";
    bodyInjury.style.borderRadius = "50%";
    bodyInjury.style.backgroundColor = "#333";
    bodyInjury.style.border = "2px solid #555";

    const armsInjury = document.createElement("div");
    armsInjury.style.width = "20px";
    armsInjury.style.height = "20px";
    armsInjury.style.borderRadius = "50%";
    armsInjury.style.backgroundColor = "#333";
    armsInjury.style.border = "2px solid #555";

    injuryIndicator.appendChild(headInjury);
    injuryIndicator.appendChild(bodyInjury);
    injuryIndicator.appendChild(armsInjury);
    healthBarContainer.appendChild(injuryIndicator);

    // Сохраняем ссылки на шкалы
    if (name === "Orange") {
      this.orangeHealthBar = healthBar;
      this.orangeStaminaBar = staminaBar;
      this.orangeAdrenalineBar = adrenalineBar;
      this.orangeComboCounter = comboCounter;
      this.orangeInjuryIndicator = injuryIndicator;
      this.orangeHeadInjury = headInjury;
      this.orangeBodyInjury = bodyInjury;
      this.orangeArmsInjury = armsInjury;
    } else {
      this.blueHealthBar = healthBar;
      this.blueStaminaBar = staminaBar;
      this.blueAdrenalineBar = adrenalineBar;
      this.blueComboCounter = comboCounter;
      this.blueInjuryIndicator = injuryIndicator;
      this.blueHeadInjury = headInjury;
      this.blueBodyInjury = bodyInjury;
      this.blueArmsInjury = armsInjury;
    }

    return healthBarContainer;
  }

  updateScoreboard() {
    if (!this.winnerAnnounced) {
      this.scoreDiv.textContent = `${this.robot1.name}: ${this.robot1.score}  |  ${this.robot2.name}: ${this.robot2.score}`;
    }

    // Обновляем шкалы здоровья
    this.updateHealthBar(this.orangeHealthBar, this.robot1.health);
    this.updateHealthBar(this.blueHealthBar, this.robot2.health);

    // Обновляем шкалы выносливости
    this.updateStaminaBar(this.orangeStaminaBar, this.robot1.stamina);
    this.updateStaminaBar(this.blueStaminaBar, this.robot2.stamina);

    // Обновляем шкалы адреналина
    this.updateAdrenalineBar(this.orangeAdrenalineBar, this.robot1.adrenaline);
    this.updateAdrenalineBar(this.blueAdrenalineBar, this.robot2.adrenaline);

    // Обновляем комбо-счётчики
    this.updateComboCounter(this.orangeComboCounter, this.robot1.comboCounter);
    this.updateComboCounter(this.blueComboCounter, this.robot2.comboCounter);

    // Обновляем индикаторы травм
    this.updateInjuryIndicators(
      this.orangeHeadInjury,
      this.orangeBodyInjury,
      this.orangeArmsInjury,
      this.robot1.injuries
    );
    this.updateInjuryIndicators(
      this.blueHeadInjury,
      this.blueBodyInjury,
      this.blueArmsInjury,
      this.robot2.injuries
    );
  }

  updateHealthBar(healthBar, health) {
    const percentage = Math.max(0, health / 100);
    healthBar.style.width = `${percentage * 100}%`;

    // Меняем цвет в зависимости от здоровья
    if (percentage > 0.6) {
      healthBar.style.backgroundColor = "#00ff00"; // Зелёный
    } else if (percentage > 0.3) {
      healthBar.style.backgroundColor = "#ffff00"; // Жёлтый
    } else {
      healthBar.style.backgroundColor = "#ff0000"; // Красный
    }

    // Эффект тряски при низком здоровье
    if (percentage < 0.2) {
      healthBar.parentElement.classList.add("health-shake");
    } else {
      healthBar.parentElement.classList.remove("health-shake");
    }
  }

  updateStaminaBar(staminaBar, stamina) {
    const percentage = Math.max(0, stamina / 100);
    staminaBar.style.width = `${percentage * 100}%`;

    // Меняем цвет в зависимости от выносливости
    if (percentage > 0.7) {
      staminaBar.style.backgroundColor = "#00ff88"; // Зелёный
    } else if (percentage > 0.4) {
      staminaBar.style.backgroundColor = "#ffff00"; // Жёлтый
    } else {
      staminaBar.style.backgroundColor = "#ff4444"; // Красный
    }
  }

  updateAdrenalineBar(adrenalineBar, adrenaline) {
    const percentage = Math.max(0, adrenaline / 100);
    adrenalineBar.style.width = `${percentage * 100}%`;

    // Меняем цвет в зависимости от адреналина
    if (percentage > 0.7) {
      adrenalineBar.style.backgroundColor = "#ff0088"; // Розовый
    } else if (percentage > 0.4) {
      adrenalineBar.style.backgroundColor = "#ff4444"; // Красный
    } else {
      adrenalineBar.style.backgroundColor = "#ff8888"; // Светло-красный
    }
  }

  updateComboCounter(comboCounter, combo) {
    if (combo > 1) {
      comboCounter.textContent = `COMBO x${combo}!`;
      comboCounter.classList.add("combo-active");

      // Убираем анимацию через 0.5 секунды
      setTimeout(() => {
        comboCounter.classList.remove("combo-active");
      }, 500);
    } else {
      comboCounter.textContent = "";
      comboCounter.classList.remove("combo-active");
    }
  }

  updateInjuryIndicators(headInjury, bodyInjury, armsInjury, injuries) {
    // Обновляем индикатор травмы головы
    if (injuries.head > 0) {
      headInjury.style.backgroundColor = "#ff4444";
      headInjury.style.border = `2px solid #ff6666`;
    } else {
      headInjury.style.backgroundColor = "#333";
      headInjury.style.border = "2px solid #555";
    }

    // Обновляем индикатор травмы тела
    if (injuries.body > 0) {
      bodyInjury.style.backgroundColor = "#ff4444";
      bodyInjury.style.border = `2px solid #ff6666`;
    } else {
      bodyInjury.style.backgroundColor = "#333";
      bodyInjury.style.border = "2px solid #555";
    }

    // Обновляем индикатор травмы рук
    if (injuries.arms > 0) {
      armsInjury.style.backgroundColor = "#ff4444";
      armsInjury.style.border = `2px solid #ff6666`;
    } else {
      armsInjury.style.backgroundColor = "#333";
      armsInjury.style.border = "2px solid #555";
    }
  }

  checkWinner() {
    if (this.robot1.health <= 0 || this.robot2.health <= 0) {
      if (!this.winnerAnnounced) {
        let winner =
          this.robot1.health > this.robot2.health
            ? this.robot1.name
            : this.robot2.name;
        this.scoreDiv.textContent += `  —  Победитель: ${winner}!`;
        // Запускаем анимации победы/поражения
        if (this.robot1.health > this.robot2.health) {
          this.robot1.startVictoryAnimation();
          this.robot2.startDefeatAnimation();
        } else {
          this.robot2.startVictoryAnimation();
          this.robot1.startDefeatAnimation();
        }
        this.winnerAnnounced = true;
      }
      return true;
    }
    return false;
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    let shake = 0;
    // Усиленная тряска камеры при сильных ударах и комбо
    if (
      this.robot1.animState === "hit" ||
      this.robot2.animState === "hit" ||
      this.robot1.animState === "uppercut" ||
      this.robot2.animState === "uppercut" ||
      this.robot1.animState === "hook" ||
      this.robot2.animState === "hook"
    ) {
      shake = Math.sin(performance.now() * 0.04) * 0.18;
      // Если был недавний сильный удар — усиливаем shake
      if (
        this.robot1.lastHitTime &&
        performance.now() - this.robot1.lastHitTime < 300
      )
        shake *= 2.2;
      if (
        this.robot2.lastHitTime &&
        performance.now() - this.robot2.lastHitTime < 300
      )
        shake *= 2.2;
    }
    // Динамическое освещение: вспышка при попадании
    if (
      this.robot1.lastHitTime &&
      performance.now() - this.robot1.lastHitTime < 120
    ) {
      this.scene.children.forEach((obj) => {
        if (obj.isLight) obj.intensity = 2.5;
      });
    } else if (
      this.robot2.lastHitTime &&
      performance.now() - this.robot2.lastHitTime < 120
    ) {
      this.scene.children.forEach((obj) => {
        if (obj.isLight) obj.intensity = 2.5;
      });
    } else {
      this.scene.children.forEach((obj) => {
        if (obj.isLight) obj.intensity = 1.2;
      });
    }
    // Камера с тряской
    this.camera.position.set(shake, 8 + shake * 0.2, 10 + shake * 0.2);
    this.camera.lookAt(0, 1, 0);
    if (!this.checkWinner()) {
      if (!this.ai1.isThinking) this.ai1.requestDecision();
      if (!this.ai2.isThinking) this.ai2.requestDecision();

      // Обновляем AI контроллеры для активного приближения
      if (this.ai1) this.ai1.update();
      if (this.ai2) this.ai2.update();

      this.robot1.update(this.robot2, delta);
      this.robot2.update(this.robot1, delta);

      // Воспроизводим звуки при событиях
      this.playEventSounds();

      // Принудительная активность роботов
      if (
        !this.ai1.isThinking &&
        !this.robot1.isAttacking &&
        !this.robot1.isDefending &&
        !this.robot1.isDodging &&
        !this.robot1.animState
      ) {
        this.ai1.forceActivity();
      }
      if (
        !this.ai2.isThinking &&
        !this.robot2.isAttacking &&
        !this.robot2.isDefending &&
        !this.robot2.isDodging &&
        !this.robot2.animState
      ) {
        this.ai2.forceActivity();
      }
      this.updateScoreboard();
    } else {
      // Воспроизводим звук победы
      if (!this.victorySoundPlayed) {
        this.playVictorySound();
        this.victorySoundPlayed = true;
      }
    }
    // TODO: визуализация частиц (эффекты попаданий)
    this.renderer.render(this.scene, this.camera);
  }

  // Новый метод: воспроизведение звуков событий
  playEventSounds() {
    // Проверяем комбо
    if (this.robot1.comboCounter > 1 && !this.robot1.comboSoundPlayed) {
      this.playComboSound(this.robot1.comboCounter);
      this.robot1.comboSoundPlayed = true;
      setTimeout(() => (this.robot1.comboSoundPlayed = false), 1000);
    }
    if (this.robot2.comboCounter > 1 && !this.robot2.comboSoundPlayed) {
      this.playComboSound(this.robot2.comboCounter);
      this.robot2.comboSoundPlayed = true;
      setTimeout(() => (this.robot2.comboSoundPlayed = false), 1000);
    }

    // Проверяем критические удары
    if (this.robot1.lastCriticalHit && !this.robot1.criticalSoundPlayed) {
      this.playCriticalSound();
      this.robot1.criticalSoundPlayed = true;
      setTimeout(() => (this.robot1.criticalSoundPlayed = false), 1000);
    }
    if (this.robot2.lastCriticalHit && !this.robot2.criticalSoundPlayed) {
      this.playCriticalSound();
      this.robot2.criticalSoundPlayed = true;
      setTimeout(() => (this.robot2.criticalSoundPlayed = false), 1000);
    }

    // Проверяем блокирования
    if (this.robot1.lastBlock && !this.robot1.blockSoundPlayed) {
      this.playBlockSound();
      this.robot1.blockSoundPlayed = true;
      setTimeout(() => (this.robot1.blockSoundPlayed = false), 500);
    }
    if (this.robot2.lastBlock && !this.robot2.blockSoundPlayed) {
      this.playBlockSound();
      this.robot2.blockSoundPlayed = true;
      setTimeout(() => (this.robot2.blockSoundPlayed = false), 500);
    }

    // Проверяем уклонения
    if (this.robot1.lastDodge && !this.robot1.dodgeSoundPlayed) {
      this.playDodgeSound();
      this.robot1.dodgeSoundPlayed = true;
      setTimeout(() => (this.robot1.dodgeSoundPlayed = false), 500);
    }
    if (this.robot2.lastDodge && !this.robot2.dodgeSoundPlayed) {
      this.playDodgeSound();
      this.robot2.dodgeSoundPlayed = true;
      setTimeout(() => (this.robot2.dodgeSoundPlayed = false), 500);
    }
  }
}
