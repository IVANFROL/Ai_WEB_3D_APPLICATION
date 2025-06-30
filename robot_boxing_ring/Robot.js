import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default class Robot {
  constructor(name, color, position, scene) {
    this.name = name;
    this.color = color;
    this.position = position.clone();
    this.scene = scene;
    this.health = 100;
    this.score = 0;
    this.isAttacking = false;
    this.isDefending = false;
    this.isDodging = false;
    this.lastAction = null;
    this.targetOffset = new THREE.Vector3(0, 0, 0);
    this.animTime = 0;
    this.animDuration = 0.35;
    this.armAnim = null;
    this.armAnimTime = 0;
    this.armAnimDuration = 0.35;
    this.basePosition = this.position.clone();
    this.animState = null;
    this.animStateTime = 0;
    this.mesh = this.createMesh();
    this.scene.add(this.mesh);
    this.hits = 0; // Счётчик успешных попаданий
    this.actionQueue = [];
    this.comboActive = false;
    this.fatigue = 0; // уровень усталости
    this.lastHitTime = 0;
    this.particleGroup = null; // для эффектов попаданий
    this.idleState = "breathing"; // breathing, warming_up, taunting, aggressive_stance
    this.idleTimer = 0;
    this.reactionToOpponent = null;
    this.microMovements = true;
    this.aggressionLevel = 0;
    this.preferredDistance = 1.2; // уменьшаем предпочтительную дистанцию
    this.minDistance = 0.6; // уменьшаем минимальную дистанцию
    this.maxDistance = 2.5; // уменьшаем максимальную дистанцию
    this.positioningTimer = 0;
    this.lastPositioningAction = null;
    this.healthBar = null; // для шкалы здоровья
    this.boxingStyle = this.name === "Orange" ? "orthodox" : "southpaw"; // стиль бокса
    this.guardPosition = "high"; // high, low, mixed
    this.guardTimer = 0;
    this.stanceVariation = 0;
    this.approachTimer = 0;

    // Новые свойства для специальных ударов
    this.specialMoves = {
      uppercut: { cooldown: 0, maxCooldown: 8000 },
      hook: { cooldown: 0, maxCooldown: 6000 },
      bodyShot: { cooldown: 0, maxCooldown: 5000 },
    };

    // Система усталости
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaRegenRate = 0.1;

    // Эффекты частиц
    this.particleSystem = null;
    this.initParticleSystem();

    // Новая система комбо
    this.comboCounter = 0;
    this.maxCombo = 5;
    this.comboDamage = 1.2; // множитель урона за комбо
    this.lastComboTime = 0;
    this.comboWindow = 2000; // окно для комбо в миллисекундах

    // Система критических ударов
    this.criticalChance = 0.15; // 15% шанс критического удара
    this.criticalMultiplier = 2.0; // двойной урон

    // Система блокирования
    this.blockChance = 0.3; // 30% шанс заблокировать удар
    this.blockDamageReduction = 0.7; // блокированный удар наносит 70% урона

    // Система уклонения
    this.dodgeChance = 0.25; // 25% шанс уклониться от удара

    // Анимации победы/поражения
    this.victoryAnimation = false;
    this.defeatAnimation = false;
    this.celebrationTimer = 0;

    // Система стимуляции
    this.adrenaline = 0; // уровень адреналина
    this.maxAdrenaline = 100;
    this.adrenalineDecay = 0.5;

    // Система травм
    this.injuries = {
      head: 0,
      body: 0,
      arms: 0,
    };
    this.maxInjuryLevel = 3;

    // Свойства для звуковых эффектов
    this.comboSoundPlayed = false;
    this.criticalSoundPlayed = false;
    this.blockSoundPlayed = false;
    this.dodgeSoundPlayed = false;
    this.lastCriticalHit = false;
    this.lastBlock = false;
    this.lastDodge = false;
  }

  createMesh() {
    const group = new THREE.Group();

    // Основная группа для всего робота
    this.robotRoot = new THREE.Group();
    this.robotRoot.position.copy(this.position);
    this.robotRoot.position.y = 0; // Будем регулировать высоту через ноги

    // Таз (центральная точка для ног и туловища)
    this.hips = new THREE.Group();
    this.hips.position.y = 0.3; // Высота таза от земли

    // Левая нога (бедро -> колено -> голень -> лодыжка -> стопа)
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.22, -0.3, 0);
    this.leftThigh = new THREE.Group();
    const leftThighBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.38, 0.18),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftThighBox.position.y = 0.19;
    this.leftThigh.add(leftThighBox);
    // Колено (сфера, утоплена на 0.04)
    this.leftKnee = new THREE.Group();
    this.leftKnee.position.y = 0.38 - 0.04;
    const leftKneeJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    leftKneeJoint.position.y = 0.04;
    this.leftKnee.add(leftKneeJoint);
    // Голень
    this.leftShin = new THREE.Group();
    this.leftShin.position.y = 0.09;
    const leftShinBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.28, 0.15),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftShinBox.position.y = 0.14;
    this.leftShin.add(leftShinBox);
    // Лодыжка (сфера, утоплена на 0.03)
    this.leftAnkle = new THREE.Group();
    this.leftAnkle.position.y = 0.28 - 0.03;
    const leftAnkleJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    leftAnkleJoint.position.y = 0.03;
    this.leftAnkle.add(leftAnkleJoint);
    // Стопа
    this.leftFoot = new THREE.Group();
    this.leftFoot.position.y = 0.07;
    const leftFootBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.09, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    leftFootBox.position.z = 0.06;
    this.leftFoot.add(leftFootBox);
    for (let i = -1; i <= 1; i++) {
      const toe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.07, 8),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      toe.rotation.x = Math.PI / 2;
      toe.position.set(i * 0.04, -0.025, 0.13);
      this.leftFoot.add(toe);
    }
    this.leftAnkle.add(this.leftFoot);
    this.leftShin.add(this.leftAnkle);
    this.leftKnee.add(this.leftShin);
    this.leftThigh.add(this.leftKnee);
    this.leftHip.add(this.leftThigh);
    this.hips.add(this.leftHip);

    // Правая нога (аналогично)
    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.22, -0.3, 0);
    this.rightThigh = new THREE.Group();
    const rightThighBox = leftThighBox.clone();
    rightThighBox.position.y = 0.19;
    this.rightThigh.add(rightThighBox);
    this.rightKnee = new THREE.Group();
    this.rightKnee.position.y = 0.38 - 0.04;
    const rightKneeJoint = leftKneeJoint.clone();
    rightKneeJoint.position.y = 0.04;
    this.rightKnee.add(rightKneeJoint);
    this.rightShin = new THREE.Group();
    this.rightShin.position.y = 0.09;
    const rightShinBox = leftShinBox.clone();
    rightShinBox.position.y = 0.14;
    this.rightShin.add(rightShinBox);
    this.rightAnkle = new THREE.Group();
    this.rightAnkle.position.y = 0.28 - 0.03;
    const rightAnkleJoint = leftAnkleJoint.clone();
    rightAnkleJoint.position.y = 0.03;
    this.rightAnkle.add(rightAnkleJoint);
    this.rightFoot = new THREE.Group();
    this.rightFoot.position.y = 0.07;
    const rightFootBox = leftFootBox.clone();
    rightFootBox.position.z = 0.06;
    this.rightFoot.add(rightFootBox);
    for (let i = -1; i <= 1; i++) {
      const toe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.07, 8),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      toe.rotation.x = Math.PI / 2;
      toe.position.set(i * 0.04, -0.025, 0.13);
      this.rightFoot.add(toe);
    }
    this.rightAnkle.add(this.rightFoot);
    this.rightShin.add(this.rightAnkle);
    this.rightKnee.add(this.rightShin);
    this.rightThigh.add(this.rightKnee);
    this.rightHip.add(this.rightThigh);
    this.hips.add(this.rightHip);

    // Поясница (отдельный сегмент)
    this.waist = new THREE.Group();
    this.waist.position.y = 0.65;
    const waistBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    waistBox.position.y = 0.09;
    this.waist.add(waistBox);
    this.hips.add(this.waist);

    // Грудная клетка (основное туловище)
    this.chest = new THREE.Group();
    this.chest.position.y = 0.83;
    const chestBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.7, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    chestBox.position.y = 0.35;
    this.chest.add(chestBox);
    this.waist.add(this.chest);
    // Шея (сфера, плотно к грудной клетке)
    this.neck = new THREE.Group();
    this.neck.position.y = 0.7;
    const neckJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    neckJoint.position.y = 0.0;
    this.neck.add(neckJoint);
    this.chest.add(this.neck);
    // Голова (один куб, аккуратно на шее)
    this.head = new THREE.Group();
    this.head.position.y = 0; // плотно к шейному суставу
    const headBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    headBox.position.y = 0.25;
    this.head.add(headBox);
    // Подбородок
    const chin = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    chin.position.y = -0.18;
    this.head.add(chin);
    // Визор
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0x00bfff,
        metalness: 0.7,
        roughness: 0.1,
      })
    );
    visor.position.set(0, 0.08, 0.26);
    this.head.add(visor);
    // Антенна
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    antenna.position.set(0.18, 0.32, 0);
    this.head.add(antenna);
    this.neck.add(this.head);

    // Левая рука (плечо -> локоть -> кисть с пальцами)
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.5, 0.45, 0);
    const leftShoulderJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    this.leftShoulder.add(leftShoulderJoint);
    this.leftUpperArm = new THREE.Group();
    this.leftUpperArm.position.y = -0.18;
    const leftUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.36, 0.16),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftUpper.position.y = -0.18;
    this.leftUpperArm.add(leftUpper);
    this.leftElbow = new THREE.Group();
    this.leftElbow.position.y = -0.36;
    const leftElbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    this.leftElbow.add(leftElbowJoint);
    const leftLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.32, 0.13),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftLower.position.y = -0.16;
    this.leftElbow.add(leftLower);
    // Кисть с боксёрской перчаткой
    this.leftHand = new THREE.Group();
    this.leftHand.position.y = -0.22;
    // Основание перчатки
    const leftGloveBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    this.leftHand.add(leftGloveBase);
    // Пальцы перчатки (3 цилиндра)
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0xcc0000 })
      );
      finger.rotation.x = Math.PI / 2;
      finger.position.set(i * 0.04, -0.02, 0.08);
      this.leftHand.add(finger);
    }
    // Бинты на запястье
    const leftWraps = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    leftWraps.rotation.x = Math.PI / 2;
    leftWraps.position.y = 0.06;
    this.leftHand.add(leftWraps);
    this.leftElbow.add(this.leftHand);
    this.leftUpperArm.add(this.leftElbow);
    this.leftShoulder.add(this.leftUpperArm);
    this.chest.add(this.leftShoulder);

    // Правая рука (аналогично)
    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.5, 0.45, 0);
    const rightShoulderJoint = leftShoulderJoint.clone();
    this.rightShoulder.add(rightShoulderJoint);
    this.rightUpperArm = new THREE.Group();
    this.rightUpperArm.position.y = -0.18;
    const rightUpper = leftUpper.clone();
    rightUpper.position.y = -0.18;
    this.rightUpperArm.add(rightUpper);
    this.rightElbow = new THREE.Group();
    this.rightElbow.position.y = -0.36;
    const rightElbowJoint = leftElbowJoint.clone();
    this.rightElbow.add(rightElbowJoint);
    const rightLower = leftLower.clone();
    rightLower.position.y = -0.16;
    this.rightElbow.add(rightLower);
    // Кисть с боксёрской перчаткой
    this.rightHand = new THREE.Group();
    this.rightHand.position.y = -0.22;
    // Основание перчатки
    const rightGloveBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    this.rightHand.add(rightGloveBase);
    // Пальцы перчатки (3 цилиндра)
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0xcc0000 })
      );
      finger.rotation.x = Math.PI / 2;
      finger.position.set(i * 0.04, -0.02, 0.08);
      this.rightHand.add(finger);
    }
    // Бинты на запястье
    const rightWraps = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    rightWraps.rotation.x = Math.PI / 2;
    rightWraps.position.y = 0.06;
    this.rightHand.add(rightWraps);
    this.rightElbow.add(this.rightHand);
    this.rightUpperArm.add(this.rightElbow);
    this.rightShoulder.add(this.rightUpperArm);
    this.chest.add(this.rightShoulder);

    // Собираем робота
    this.hips.add(this.chest); // Туловище крепится к тазу
    this.robotRoot.add(this.hips); // Таз - корневой элемент
    group.add(this.robotRoot);

    return group;
  }

  // Остальные методы остаются без изменений
  clampToRingBounds(pos) {
    pos.x = Math.max(-3.5, Math.min(3.5, pos.x));
    pos.z = Math.max(-3.5, Math.min(3.5, pos.z));
    return pos;
  }

  // Новый метод: анализ дистанции до противника
  analyzeDistance(opponent) {
    const distance = this.position.distanceTo(opponent.position);
    if (distance < this.minDistance) return "too_close";
    if (distance < this.preferredDistance) return "close";
    if (distance < this.maxDistance) return "optimal";
    return "too_far";
  }

  // Новый метод: выбор удара в зависимости от дистанции
  choosePunchByDistance(opponent) {
    const distance = this.analyzeDistance(opponent);
    switch (distance) {
      case "too_close":
        // Слишком близко - удар в корпус или апперкот
        return ["body", "uppercut"][Math.floor(Math.random() * 2)];
      case "close":
        // Близко - хуки и апперкоты
        return ["hook", "uppercut", "body"][Math.floor(Math.random() * 3)];
      case "optimal":
        // Оптимальная дистанция - все удары
        return ["jab", "hook", "uppercut", "cross", "body"][
          Math.floor(Math.random() * 5)
        ];
      case "too_far":
        // Слишком далеко - джабы и кроссы
        return ["jab", "cross"][Math.floor(Math.random() * 2)];
      default:
        return "jab";
    }
  }

  // Новый метод: тактическое позиционирование
  tacticalPositioning(opponent) {
    const distance = this.analyzeDistance(opponent);
    const dir = opponent.position.clone().sub(this.position).normalize();

    if (distance === "too_close") {
      // Слишком близко - отступаем назад
      const moveVec = dir.clone().multiplyScalar(-0.8);
      this.startAnimation(moveVec);
      this.setAnimState("backstep");
      return "backstep";
    } else if (distance === "too_far") {
      // Слишком далеко - подходим ближе
      const moveVec = dir.clone().multiplyScalar(0.6);
      this.startAnimation(moveVec);
      this.setAnimState("approach");
      return "approach";
    } else if (distance === "optimal") {
      // Оптимальная дистанция - небольшое движение в сторону
      const side = Math.random() > 0.5 ? 1 : -1;
      const sideVec = new THREE.Vector3(side * 0.3, 0, 0);
      this.startAnimation(sideVec);
      this.setAnimState("sidestep");
      return "sidestep";
    }
    return null;
  }

  // Модифицируем attack для использования тактики
  attack(opponent, fromCombo = false) {
    this.isAttacking = true;
    this.lastAction = "attack";

    // Проверяем дистанцию перед атакой, но очень редко отступаем
    const distance = this.analyzeDistance(opponent);
    if (distance === "too_close" && Math.random() > 0.95) {
      // только 5% вероятность отступления
      // Слишком близко - сначала отступаем
      this.tacticalPositioning(opponent);
      setTimeout(() => {
        this.isAttacking = false;
        this.attack(opponent, fromCombo);
      }, 300);
      return;
    }

    const dir = opponent.position.clone().sub(this.position).normalize();
    const moveVec = dir.multiplyScalar(0.7);

    // Выбираем удар в зависимости от дистанции
    this.currentPunch = this.choosePunchByDistance(opponent);

    this.startAnimation(moveVec);
    this.setAnimState(this.currentPunch);

    if (Math.random() > 0.5 && !opponent.isDefending) {
      opponent.takeHit();
      this.score++;
      this.hits++;
      this.lastHitTime = performance.now();
      this.spawnHitParticles();
    }

    setTimeout(() => {
      this.isAttacking = false;
      this.position.add(moveVec);
      this.position = this.clampToRingBounds(this.position);
      this.basePosition.copy(this.position);
      if (fromCombo && this.actionQueue.length > 0) {
        // Следующее действие будет взято из очереди в update
      } else {
        this.comboActive = false;
      }
    }, 400);
  }

  defend(fromCombo = false) {
    this.isDefending = true;
    this.lastAction = "defend";
    const moveVec = this.position
      .clone()
      .sub(new THREE.Vector3(0, 0, 0))
      .normalize()
      .multiplyScalar(0.5);
    this.startAnimation(moveVec);
    this.setAnimState("block");
    setTimeout(() => {
      this.isDefending = false;
      this.position.add(moveVec);
      this.position = this.clampToRingBounds(this.position);
      this.basePosition.copy(this.position);
      // Если комбо ещё не закончено — продолжаем
      if (fromCombo && this.actionQueue.length > 0) {
        // Следующее действие будет взято из очереди в update
      } else {
        this.comboActive = false;
      }
    }, 400);
  }

  dodge(fromCombo = false) {
    this.isDodging = true;
    this.lastAction = "dodge";
    const side = this.name === "Orange" ? 1 : -1;
    const moveVec = new THREE.Vector3(0, 0, side * 0.7);
    this.startAnimation(moveVec);
    this.setAnimState("dodge");
    setTimeout(() => {
      this.isDodging = false;
      this.position.add(moveVec);
      this.position = this.clampToRingBounds(this.position);
      this.basePosition.copy(this.position);
      // Если комбо ещё не закончено — продолжаем
      if (fromCombo && this.actionQueue.length > 0) {
        // Следующее действие будет взято из очереди в update
      } else {
        this.comboActive = false;
      }
    }, 400);
  }

  startAnimation(offset) {
    this.targetOffset.copy(offset);
    this.animTime = 0;
  }

  setAnimState(state) {
    this.animState = state;
    this.animStateTime = 0;
  }

  takeHit() {
    this.setAnimState("hit");
    this.health -= 10;
    if (this.health < 0) this.health = 0;
  }

  decideAction(opponent) {
    const actions = ["attack", "defend", "dodge"];
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (action === "attack") this.attack(opponent);
    if (action === "defend") this.defend();
    if (action === "dodge") this.dodge();
  }

  update(opponent, delta = 0.016) {
    // Ограничение по рингу: таз не выходит за пределы
    const ringLimit = 3.5;
    this.position.x = Math.max(
      -ringLimit,
      Math.min(ringLimit, this.position.x)
    );
    this.position.z = Math.max(
      -ringLimit,
      Math.min(ringLimit, this.position.z)
    );
    this.robotRoot.position.x = this.position.x;
    this.robotRoot.position.z = this.position.z;
    // Анимация движения
    if (this.targetOffset.lengthSq() > 0) {
      this.animTime += delta;
      let t = Math.min(this.animTime / this.animDuration, 1);
      let animVec = this.targetOffset
        .clone()
        .multiplyScalar(Math.sin(Math.PI * t));
      this.robotRoot.position.x = this.basePosition.x + animVec.x;
      this.robotRoot.position.z = this.basePosition.z + animVec.z;
      if (t >= 1) {
        this.targetOffset.set(0, 0, 0);
        this.robotRoot.position.x = this.basePosition.x;
        this.robotRoot.position.z = this.basePosition.z;
      }
    }
    // Анимация боя: ноги и таз
    if (this.animState) {
      this.animStateTime += delta;
      let t = Math.min(this.animStateTime / this.animDuration, 1);
      // --- Анимации ударов ---
      if (this.animState === "jab") {
        // Прямой удар: правая рука вперёд, корпус чуть поворачивается, шаг правой ногой
        this.chest.rotation.y = lerp(
          0,
          this.name === "Orange" ? -0.18 : 0.18,
          t
        );
        this.rightShoulder.rotation.x = lerp(0, -1.3, t);
        this.rightUpperArm.rotation.x = lerp(0, -0.7, t);
        this.rightElbow.rotation.x = lerp(0, 1.1, t);
        this.rightHand.position.z = lerp(0, 0.32, t);
        this.rightHip.position.z = lerp(0, 0.12, t);
        this.leftHip.position.z = lerp(0, -0.08, t);
        this.chest.position.x = lerp(0, 0.08, t);
        // Движение ног как у боксёра
        this.leftThigh.rotation.x = lerp(0, 0.1, t);
        this.rightThigh.rotation.x = lerp(0, -0.05, t);
      } else if (this.animState === "hook") {
        // Боковой удар: корпус и рука вбок, замах, разворот корпуса, шаг левой ногой
        const side = this.name === "Orange" ? -1 : 1;
        this.chest.rotation.y = lerp(0, side * 0.45, t);
        this.rightShoulder.rotation.z = lerp(0, side * 1.1, t);
        this.rightUpperArm.rotation.x = lerp(0, -0.3, t);
        this.rightElbow.rotation.x = lerp(0, 0.7, t);
        this.rightHand.position.x = lerp(0, side * 0.22, t);
        this.rightHand.position.z = lerp(0, 0.18, t);
        this.leftHip.position.x = lerp(-0.22, -0.32, t);
        this.chest.position.x = lerp(0, side * 0.12, t);
        // Поворот ног для удара
        this.leftThigh.rotation.y = lerp(0, side * 0.2, t);
        this.rightThigh.rotation.y = lerp(0, side * 0.1, t);
      } else if (this.animState === "uppercut") {
        // Апперкот: рука снизу вверх, корпус чуть назад, шаг правой ногой
        this.chest.rotation.x = lerp(0, -0.18, t);
        this.rightShoulder.rotation.x = lerp(0, -0.7, t);
        this.rightUpperArm.rotation.x = lerp(0, 0.8, t);
        this.rightElbow.rotation.x = lerp(0, 1.2, t);
        this.rightHand.position.y = lerp(0, 0.25, t);
        this.rightHand.position.z = lerp(0, 0.18, t);
        this.rightHip.position.z = lerp(0, 0.18, t);
        this.chest.position.x = lerp(0, 0.05, t);
        // Приседание для апперкота
        this.robotRoot.position.y = lerp(0, -0.1, t);
        this.leftThigh.rotation.x = lerp(0, 0.15, t);
      } else if (this.animState === "cross") {
        // Кросс: мощный прямой удар с разворотом корпуса
        const side = this.name === "Orange" ? -1 : 1;
        this.chest.rotation.y = lerp(0, side * 0.6, t);
        this.rightShoulder.rotation.x = lerp(0, -1.5, t);
        this.rightUpperArm.rotation.x = lerp(0, -0.9, t);
        this.rightElbow.rotation.x = lerp(0, 1.3, t);
        this.rightHand.position.z = lerp(0, 0.45, t);
        this.chest.position.x = lerp(0, side * 0.15, t);
        // Мощный шаг вперёд
        this.rightHip.position.z = lerp(0, 0.2, t);
        this.leftHip.position.z = lerp(0, -0.1, t);
        this.robotRoot.position.y = lerp(0, 0.05, t);
      } else if (this.animState === "body") {
        // Удар в корпус: наклон вперёд, удар снизу
        this.chest.rotation.x = lerp(0, 0.3, t);
        this.rightShoulder.rotation.x = lerp(0, -0.5, t);
        this.rightUpperArm.rotation.x = lerp(0, 0.4, t);
        this.rightElbow.rotation.x = lerp(0, 0.8, t);
        this.rightHand.position.y = lerp(0, -0.2, t);
        this.rightHand.position.z = lerp(0, 0.15, t);
        // Приседание для удара в корпус
        this.robotRoot.position.y = lerp(0, -0.15, t);
        this.leftThigh.rotation.x = lerp(0, 0.2, t);
        this.rightThigh.rotation.x = lerp(0, 0.1, t);
      } else if (this.animState === "block") {
        // Блок: обе руки вверх, корпус назад, ноги ближе
        this.chest.rotation.y = 0;
        this.leftShoulder.rotation.x = lerp(0, -0.7, t);
        this.rightShoulder.rotation.x = lerp(0, -0.7, t);
        this.leftUpperArm.rotation.x = lerp(0, -0.5, t);
        this.rightUpperArm.rotation.x = lerp(0, -0.5, t);
        this.leftElbow.rotation.x = lerp(0, 0.7, t);
        this.rightElbow.rotation.x = lerp(0, 0.7, t);
        this.chest.position.z = lerp(0, -0.2, t);
        this.leftHip.position.x = lerp(-0.22, -0.15, t);
        this.rightHip.position.x = lerp(0.22, 0.15, t);
        // Подпрыгивание при блоке
        this.robotRoot.position.y = lerp(0, 0.03, t);
      } else if (this.animState === "dodge") {
        // Уклон: корпус и голова вбок, руки в стороны, шаг вбок
        const side = this.name === "Orange" ? 1 : -1;
        this.chest.position.x = lerp(0, side * 0.3, t);
        this.head.position.x = lerp(0, side * 0.15, t);
        this.leftShoulder.rotation.z = lerp(0, side * 0.5, t);
        this.rightShoulder.rotation.z = lerp(0, -side * 0.5, t);
        this.leftUpperArm.rotation.x = lerp(0, 0.2 * side, t);
        this.rightUpperArm.rotation.x = lerp(0, -0.2 * side, t);
        this.leftHip.position.x = lerp(-0.22, -0.22 + side * 0.12, t);
        this.rightHip.position.x = lerp(0.22, 0.22 + side * 0.12, t);
        // Приседание при уклоне
        this.robotRoot.position.y = lerp(0, -0.08, t);
        this.leftThigh.rotation.x = lerp(0, 0.1, t);
        this.rightThigh.rotation.x = lerp(0, 0.1, t);
      } else if (this.animState === "hit") {
        // Получение удара: корпус и голова назад, тряска, руки вверх
        this.chest.position.z = lerp(0, -0.3, t);
        this.head.position.z = lerp(0, -0.15, t) + Math.sin(t * 20) * 0.03;
        this.leftShoulder.rotation.x = lerp(0, -0.3, t);
        this.rightShoulder.rotation.x = lerp(0, -0.3, t);
        this.leftUpperArm.rotation.x = lerp(0, 0.2, t);
        this.rightUpperArm.rotation.x = lerp(0, 0.2, t);
        // Отдача назад
        this.robotRoot.position.y = lerp(0, -0.05, t);
        this.leftThigh.rotation.x = lerp(0, -0.1, t);
        this.rightThigh.rotation.x = lerp(0, -0.1, t);
      } else if (this.animState === "backstep") {
        // Отступ назад: корпус назад, руки в защите
        this.chest.position.z = lerp(0, -0.2, t);
        this.leftShoulder.rotation.x = lerp(0, -0.3, t);
        this.rightShoulder.rotation.x = lerp(0, -0.3, t);
        this.head.position.z = lerp(0, -0.1, t);
        this.robotRoot.position.y = lerp(0, 0.02, t);
      } else if (this.animState === "approach") {
        // Подход: корпус вперёд, готовность к атаке
        this.chest.position.z = lerp(0, 0.1, t);
        this.leftShoulder.rotation.x = lerp(0, -0.1, t);
        this.rightShoulder.rotation.x = lerp(0, -0.1, t);
        this.robotRoot.position.y = lerp(0, 0.03, t);
      } else if (this.animState === "sidestep") {
        // Шаг в сторону: корпус в сторону, баланс
        this.chest.position.x = lerp(0, Math.sin(t * Math.PI) * 0.1, t);
        this.head.position.x = lerp(0, Math.sin(t * Math.PI) * 0.05, t);
        this.robotRoot.position.y = lerp(0, 0.02, t);
      }
      if (t >= 1) {
        // Плавный возврат в стойку
        this.chest.rotation.set(0, 0, 0);
        this.chest.position.set(0, 0.4, 0);
        this.head.position.set(0, 0, 0);
        this.leftShoulder.rotation.set(0, 0, 0);
        this.rightShoulder.rotation.set(0, 0, 0);
        this.leftUpperArm.rotation.set(0, 0, 0);
        this.rightUpperArm.rotation.set(0, 0, 0);
        this.leftElbow.rotation.set(0, 0, 0);
        this.rightElbow.rotation.set(0, 0, 0);
        this.rightHand.position.set(0, 0, 0.0);
        this.leftHand.position.set(0, 0, 0.0);
        this.leftHip.position.set(-0.22, -0.3, 0);
        this.rightHip.position.set(0.22, -0.3, 0);
        this.robotRoot.position.y = 0;
        this.leftThigh.rotation.set(0, 0, 0);
        this.rightThigh.rotation.set(0, 0, 0);
        this.animState = null;
      }
    }
    // Выполнение очереди действий (комбо)
    if (
      this.actionQueue.length > 0 &&
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      const next = this.actionQueue.shift();
      if (next.action === "attack") this.attack(next.opponent, true);
      if (next.action === "defend") this.defend(true);
      if (next.action === "dodge") this.dodge(true);
    }
    // Тактическое позиционирование (более активное для приближения)
    this.positioningTimer += delta;
    if (
      this.positioningTimer > 3 &&
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      // уменьшаем интервал до 3 секунд
      const distance = this.analyzeDistance(opponent);
      if (distance === "too_far") {
        // Если слишком далеко - обязательно подходим
        this.tacticalPositioning(opponent);
        this.positioningTimer = 0;
      } else if (distance === "too_close" && Math.random() > 0.8) {
        // только 20% вероятность отступления
        this.tacticalPositioning(opponent);
        this.positioningTimer = 0;
      } else if (distance === "optimal" && Math.random() > 0.7) {
        // При оптимальной дистанции иногда делаем боковые движения
        this.tacticalPositioning(opponent);
        this.positioningTimer = 0;
      }
    }
    // Реакция на противника
    this.reactToOpponent(opponent);
    // Расширенная idle-анимация с множеством состояний
    if (
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      this.idleTimer += delta;
      this.guardTimer += delta;
      const t = performance.now() * 0.001 + (this.name === "Orange" ? 0 : 1);

      // Смена состояния каждые 3-5 секунд
      if (this.idleTimer > 3 + Math.random() * 2) {
        this.changeIdleState();
      }

      // Смена защитной стойки каждые 2-4 секунды
      if (this.guardTimer > 2 + Math.random() * 2) {
        this.changeGuardPosition();
      }

      // Базовое дыхание всегда присутствует
      const breath = Math.sin(t * 1.1) * 0.06 * (1 - this.fatigue * 0.5);
      this.chest.position.y = 0.4 + breath;
      this.head.position.y = breath * 0.5;

      // Различные idle-состояния
      if (this.idleState === "breathing") {
        // Спокойное дыхание + микродвижения
        this.chest.position.x = Math.sin(t) * 0.04;
        this.chest.position.z = Math.cos(t) * 0.03;
        this.chest.rotation.y = Math.sin(t * 0.7) * 0.07;
        this.head.position.x = Math.sin(t * 1.2) * 0.03;
        this.leftShoulder.rotation.z = Math.sin(t * 1.5) * 0.08;
        this.rightShoulder.rotation.z = -Math.sin(t * 1.5) * 0.08;
        this.leftThigh.rotation.x = Math.sin(t * 1.1) * 0.04;
        this.rightThigh.rotation.x = -Math.sin(t * 1.1) * 0.04;
        this.leftHand.position.y = Math.sin(t * 2.1) * 0.03;
        this.rightHand.position.y = -Math.sin(t * 2.1) * 0.03;
        this.leftFoot.position.x = Math.sin(t * 1.7) * 0.02;
        this.rightFoot.position.x = -Math.sin(t * 1.7) * 0.02;
        // Лёгкое покачивание корпуса
        this.robotRoot.position.y = Math.sin(t * 0.8) * 0.02;
        // Анимация защитной стойки
        this.animateGuardStance(t);
        // Анимация стиля бокса
        this.animateBoxingStyle(t);
      } else if (this.idleState === "warming_up") {
        // Разминка: более активные движения
        this.chest.rotation.y = Math.sin(t * 2) * 0.15;
        this.leftShoulder.rotation.x = Math.sin(t * 3) * 0.2;
        this.rightShoulder.rotation.x = Math.sin(t * 3 + 1) * 0.2;
        this.leftUpperArm.rotation.x = Math.sin(t * 4) * 0.3;
        this.rightUpperArm.rotation.x = Math.sin(t * 4 + 1) * 0.3;
        this.head.rotation.y = Math.sin(t * 1.5) * 0.1;
        this.chest.position.x = Math.sin(t * 2.5) * 0.08;
        this.chest.position.z = Math.cos(t * 2.5) * 0.06;
        // Активные движения ног
        this.leftThigh.rotation.x = Math.sin(t * 2.2) * 0.08;
        this.rightThigh.rotation.x = -Math.sin(t * 2.2) * 0.08;
        this.leftThigh.rotation.y = Math.sin(t * 1.8) * 0.05;
        this.rightThigh.rotation.y = -Math.sin(t * 1.8) * 0.05;
        // Подпрыгивания
        this.robotRoot.position.y = Math.sin(t * 3) * 0.04;
        // Движения рук
        this.leftHand.position.x = Math.sin(t * 3.5) * 0.06;
        this.rightHand.position.x = -Math.sin(t * 3.5) * 0.06;
        // Анимация стиля бокса
        this.animateBoxingStyle(t);
      } else if (this.idleState === "taunting") {
        // Провокации: покачивание головой, движения рук
        this.head.rotation.y = Math.sin(t * 2.5) * 0.2;
        this.head.rotation.z = Math.sin(t * 1.8) * 0.1;
        this.leftShoulder.rotation.z = Math.sin(t * 3) * 0.3;
        this.rightShoulder.rotation.z = -Math.sin(t * 3) * 0.3;
        this.leftHand.position.x = Math.sin(t * 4) * 0.1;
        this.rightHand.position.x = -Math.sin(t * 4) * 0.1;
        this.chest.rotation.y = Math.sin(t * 1.2) * 0.12;
        // Покачивание корпуса
        this.chest.position.x = Math.sin(t * 1.5) * 0.06;
        this.chest.position.z = Math.cos(t * 1.5) * 0.04;
        // Движения ног
        this.leftThigh.rotation.x = Math.sin(t * 2.8) * 0.06;
        this.rightThigh.rotation.x = -Math.sin(t * 2.8) * 0.06;
        // Подпрыгивания
        this.robotRoot.position.y = Math.sin(t * 2.2) * 0.03;
        // Анимация защитной стойки
        this.animateGuardStance(t);
      } else if (this.idleState === "aggressive_stance") {
        // Агрессивная стойка: напряжённая поза, покачивание
        this.chest.rotation.x = -0.05;
        this.head.position.y = 0.02;
        this.leftShoulder.rotation.x = -0.1;
        this.rightShoulder.rotation.x = -0.1;
        this.chest.position.z = -0.05;
        this.chest.rotation.y = Math.sin(t * 1.8) * 0.08;
        this.head.rotation.y = Math.sin(t * 2.2) * 0.15;
        this.leftHand.position.y = -0.05;
        this.rightHand.position.y = -0.05;
        // Агрессивные движения ног
        this.leftThigh.rotation.x = Math.sin(t * 2.5) * 0.1;
        this.rightThigh.rotation.x = -Math.sin(t * 2.5) * 0.1;
        this.leftThigh.rotation.y = Math.sin(t * 1.6) * 0.08;
        this.rightThigh.rotation.y = -Math.sin(t * 1.6) * 0.08;
        // Покачивание вперёд-назад
        this.robotRoot.position.y = Math.sin(t * 1.4) * 0.02;
        this.chest.position.x = Math.sin(t * 1.9) * 0.05;
        // Движения рук
        this.leftHand.position.x = Math.sin(t * 3.2) * 0.04;
        this.rightHand.position.x = -Math.sin(t * 3.2) * 0.04;
        // Анимация защитной стойки
        this.animateGuardStance(t);
        // Анимация стиля бокса
        this.animateBoxingStyle(t);
      }

      // Реакции на противника
      if (this.reactionToOpponent === "defensive_ready") {
        // Готовность к защите
        this.chest.position.z = -0.1;
        this.leftShoulder.rotation.x = -0.2;
        this.rightShoulder.rotation.x = -0.2;
        this.head.position.y = 0.03;
        // Движения ног в защитной стойке
        this.leftThigh.rotation.x = Math.sin(t * 1.8) * 0.06;
        this.rightThigh.rotation.x = -Math.sin(t * 1.8) * 0.06;
        this.robotRoot.position.y = Math.sin(t * 2.1) * 0.02;
        // Анимация защитной стойки
        this.animateGuardStance(t);
      } else if (this.reactionToOpponent === "frustrated") {
        // Раздражение
        this.head.rotation.y = Math.sin(t * 5) * 0.1;
        this.chest.rotation.y = Math.sin(t * 3) * 0.1;
        this.leftHand.position.y = Math.sin(t * 6) * 0.05;
        this.rightHand.position.y = Math.sin(t * 6) * 0.05;
        // Агрессивные движения ног
        this.leftThigh.rotation.x = Math.sin(t * 3.5) * 0.08;
        this.rightThigh.rotation.x = -Math.sin(t * 3.5) * 0.08;
        this.robotRoot.position.y = Math.sin(t * 2.8) * 0.03;
        // Покачивание корпуса
        this.chest.position.x = Math.sin(t * 2.4) * 0.04;
        // Анимация защитной стойки
        this.animateGuardStance(t);
      } else if (this.reactionToOpponent === "tired") {
        // Усталость
        this.chest.position.y = 0.35;
        this.head.position.y = -0.02;
        this.chest.rotation.x = -0.08;
        this.leftShoulder.rotation.x = -0.05;
        this.rightShoulder.rotation.x = -0.05;
        // Медленные движения ног
        this.leftThigh.rotation.x = Math.sin(t * 0.8) * 0.03;
        this.rightThigh.rotation.x = -Math.sin(t * 0.8) * 0.03;
        this.robotRoot.position.y = Math.sin(t * 0.6) * 0.01;
        // Анимация защитной стойки
        this.animateGuardStance(t);
      }

      // Микродвижения ног (всегда активны)
      this.leftThigh.rotation.x = Math.sin(t * 1.1) * 0.04;
      this.rightThigh.rotation.x = -Math.sin(t * 1.1) * 0.04;
      this.leftFoot.position.x = Math.sin(t * 1.7) * 0.02;
      this.rightFoot.position.x = -Math.sin(t * 1.7) * 0.02;
      // Дополнительные микродвижения
      this.leftKnee.rotation.x = Math.sin(t * 1.3) * 0.02;
      this.rightKnee.rotation.x = -Math.sin(t * 1.3) * 0.02;
      this.leftAnkle.rotation.x = Math.sin(t * 1.9) * 0.01;
      this.rightAnkle.rotation.x = -Math.sin(t * 1.9) * 0.01;
    }
    // Усталость накапливается при ударах
    if (this.isAttacking || this.isDefending || this.isDodging) {
      this.fatigue = Math.min(1, this.fatigue + delta * 0.12);
    } else {
      this.fatigue = Math.max(0, this.fatigue - delta * 0.05);
    }

    // Проверка слишком близкого контакта и умное отступление
    const currentDistance = this.position.distanceTo(opponent.position);
    if (
      currentDistance < 2.0 &&
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      this.smartRetreat(opponent);
    }

    // Активное приближение к противнику (каждые 2 секунды)
    this.approachTimer = (this.approachTimer || 0) + delta;
    if (
      this.approachTimer > 2 &&
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      const distance = this.analyzeDistance(opponent);
      if (distance === "too_far") {
        this.approachOpponent(opponent);
        this.approachTimer = 0;
      }
    }

    // Обновление кулдаунов специальных ударов
    Object.keys(this.specialMoves).forEach((move) => {
      if (this.specialMoves[move].cooldown > 0) {
        this.specialMoves[move].cooldown -= delta * 1000;
      }
    });

    // Восстановление выносливости
    if (this.stamina < this.maxStamina) {
      this.stamina += this.staminaRegenRate;
      this.stamina = Math.min(this.stamina, this.maxStamina);
    }

    // Обновление адреналина
    if (this.adrenaline > 0) {
      this.adrenaline -= this.adrenalineDecay * delta;
      this.adrenaline = Math.max(0, this.adrenaline);
    }

    // Сброс комбо если прошло слишком много времени
    const currentTime = performance.now();
    if (currentTime - this.lastComboTime > this.comboWindow) {
      this.comboCounter = 0;
    }

    // Обновление анимаций победы/поражения
    if (this.victoryAnimation || this.defeatAnimation) {
      this.celebrationTimer += delta;

      // Анимация покачивания при победе
      if (this.victoryAnimation) {
        const sway = Math.sin(this.celebrationTimer * 3) * 0.1;
        this.mesh.rotation.y = sway;
      }

      // Анимация дрожания при поражении
      if (this.defeatAnimation) {
        const shake = Math.sin(this.celebrationTimer * 10) * 0.05;
        this.mesh.rotation.z = shake;
      }
    }

    // Обновление системы частиц
    if (this.particleSystem && this.particleSystem.visible) {
      const positions = this.particleSystem.geometry.attributes.position.array;
      const velocities = this.particleSystem.geometry.attributes.velocity.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Затухание скорости
        velocities[i] *= 0.98;
        velocities[i + 1] *= 0.98;
        velocities[i + 2] *= 0.98;
      }

      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Новый метод: добавить действие в очередь
  queueAction(action, opponent) {
    this.actionQueue.push({ action, opponent });
  }

  // Новый метод: запуск комбо
  startCombo(combo, opponent) {
    this.comboActive = true;
    combo.forEach((action) => this.queueAction(action, opponent));
  }

  // Эффект частиц при попадании
  spawnHitParticles() {
    if (!this.particleGroup) {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      for (let i = 0; i < 20; i++) {
        positions.push(
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.3,
          (Math.random() - 0.5) * 0.3
        );
      }
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      const material = new THREE.PointsMaterial({
        color: 0xffe066,
        size: 0.08,
      });
      this.particleGroup = new THREE.Points(geometry, material);
      this.head.add(this.particleGroup);
      setTimeout(() => {
        if (this.particleGroup) {
          this.head.remove(this.particleGroup);
          this.particleGroup = null;
        }
      }, 250);
    }
  }

  // Новый метод: смена idle-состояния
  changeIdleState() {
    const states = ["breathing", "warming_up", "taunting", "aggressive_stance"];
    this.idleState = states[Math.floor(Math.random() * states.length)];
    this.idleTimer = 0;
  }

  // Новый метод: реакция на действия противника
  reactToOpponent(opponent) {
    if (
      opponent.isAttacking &&
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging
    ) {
      // Противник атакует — показываем готовность к защите
      this.reactionToOpponent = "defensive_ready";
      this.aggressionLevel = Math.min(1, this.aggressionLevel + 0.1);
    } else if (opponent.lastAction === "attack" && opponent.hits > this.hits) {
      // Противник успешно атакует — показываем раздражение
      this.reactionToOpponent = "frustrated";
      this.aggressionLevel = Math.min(1, this.aggressionLevel + 0.15);
    } else if (this.health < 50) {
      // Мало здоровья — показываем усталость
      this.reactionToOpponent = "tired";
    } else {
      this.reactionToOpponent = null;
    }
  }

  // Новый метод: принудительная активность
  forceActivity() {
    if (
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      !this.animState
    ) {
      const activities = ["warming_up", "taunting", "aggressive_stance"];
      this.idleState =
        activities[Math.floor(Math.random() * activities.length)];
      this.idleTimer = 0;
    }
  }

  // Новый метод: тактическое решение (более агрессивное)
  tacticalDecision(opponent) {
    const distance = this.analyzeDistance(opponent);
    const timeSinceLastPositioning =
      performance.now() - (this.lastPositioningAction || 0);

    // Если слишком далеко - обязательно подходим
    if (distance === "too_far") {
      return "approach";
    }

    // Если слишком близко - иногда отступаем, но редко
    if (
      distance === "too_close" &&
      timeSinceLastPositioning > 5000 &&
      Math.random() > 0.8
    ) {
      const positioningAction = this.tacticalPositioning(opponent);
      if (positioningAction) {
        this.lastPositioningAction = performance.now();
        return positioningAction;
      }
    }

    // Приоритет атаке при любой дистанции
    if (
      distance === "optimal" ||
      distance === "close" ||
      distance === "too_close"
    ) {
      return "attack";
    }

    // Иначе - защищаемся или уклоняемся, но редко
    return Math.random() > 0.8
      ? "attack"
      : Math.random() > 0.5
      ? "defend"
      : "dodge";
  }

  // Новый метод: смена защитной стойки
  changeGuardPosition() {
    const guards = ["high", "low", "mixed"];
    this.guardPosition = guards[Math.floor(Math.random() * guards.length)];
    this.guardTimer = 0;
  }

  // Новый метод: анимация защитной стойки
  animateGuardStance(t) {
    const baseTime = t * 0.8;

    switch (this.guardPosition) {
      case "high":
        // Высокая защита: руки подняты, голова защищена
        this.leftShoulder.rotation.x = -0.4 + Math.sin(baseTime * 2) * 0.1;
        this.rightShoulder.rotation.x = -0.4 + Math.sin(baseTime * 2 + 1) * 0.1;
        this.leftUpperArm.rotation.x = -0.3 + Math.sin(baseTime * 3) * 0.05;
        this.rightUpperArm.rotation.x =
          -0.3 + Math.sin(baseTime * 3 + 1) * 0.05;
        this.leftElbow.rotation.x = 0.6 + Math.sin(baseTime * 2.5) * 0.1;
        this.rightElbow.rotation.x = 0.6 + Math.sin(baseTime * 2.5 + 1) * 0.1;
        this.leftHand.position.y = 0.1 + Math.sin(baseTime * 4) * 0.02;
        this.rightHand.position.y = 0.1 + Math.sin(baseTime * 4 + 1) * 0.02;
        this.leftHand.position.z = 0.05 + Math.sin(baseTime * 3.5) * 0.03;
        this.rightHand.position.z = 0.05 + Math.sin(baseTime * 3.5 + 1) * 0.03;
        break;

      case "low":
        // Низкая защита: руки опущены, корпус защищён
        this.leftShoulder.rotation.x = -0.2 + Math.sin(baseTime * 1.5) * 0.08;
        this.rightShoulder.rotation.x =
          -0.2 + Math.sin(baseTime * 1.5 + 1) * 0.08;
        this.leftUpperArm.rotation.x = 0.1 + Math.sin(baseTime * 2.2) * 0.06;
        this.rightUpperArm.rotation.x =
          0.1 + Math.sin(baseTime * 2.2 + 1) * 0.06;
        this.leftElbow.rotation.x = 0.3 + Math.sin(baseTime * 1.8) * 0.08;
        this.rightElbow.rotation.x = 0.3 + Math.sin(baseTime * 1.8 + 1) * 0.08;
        this.leftHand.position.y = -0.1 + Math.sin(baseTime * 3.2) * 0.03;
        this.rightHand.position.y = -0.1 + Math.sin(baseTime * 3.2 + 1) * 0.03;
        this.leftHand.position.z = 0.08 + Math.sin(baseTime * 2.8) * 0.04;
        this.rightHand.position.z = 0.08 + Math.sin(baseTime * 2.8 + 1) * 0.04;
        break;

      case "mixed":
        // Смешанная защита: одна рука высоко, другая низко
        const isLeftHigh = Math.sin(baseTime * 0.5) > 0;
        if (isLeftHigh) {
          this.leftShoulder.rotation.x = -0.5 + Math.sin(baseTime * 2.5) * 0.1;
          this.rightShoulder.rotation.x =
            -0.1 + Math.sin(baseTime * 1.8) * 0.08;
          this.leftUpperArm.rotation.x = -0.4 + Math.sin(baseTime * 3.2) * 0.06;
          this.rightUpperArm.rotation.x = 0.2 + Math.sin(baseTime * 2.1) * 0.05;
          this.leftHand.position.y = 0.15 + Math.sin(baseTime * 4.1) * 0.03;
          this.rightHand.position.y = -0.08 + Math.sin(baseTime * 2.9) * 0.02;
        } else {
          this.leftShoulder.rotation.x = -0.1 + Math.sin(baseTime * 1.8) * 0.08;
          this.rightShoulder.rotation.x = -0.5 + Math.sin(baseTime * 2.5) * 0.1;
          this.leftUpperArm.rotation.x = 0.2 + Math.sin(baseTime * 2.1) * 0.05;
          this.rightUpperArm.rotation.x =
            -0.4 + Math.sin(baseTime * 3.2) * 0.06;
          this.leftHand.position.y = -0.08 + Math.sin(baseTime * 2.9) * 0.02;
          this.rightHand.position.y = 0.15 + Math.sin(baseTime * 4.1) * 0.03;
        }
        break;
    }
  }

  // Новый метод: анимация стиля бокса
  animateBoxingStyle(t) {
    const styleTime = t * 1.2;

    switch (this.boxingStyle) {
      case "orthodox":
        // Ортодокс: левая нога вперёд, правая рука сильная
        this.leftHip.position.z = 0.05 + Math.sin(styleTime * 1.5) * 0.03;
        this.rightHip.position.z = -0.05 + Math.sin(styleTime * 1.5 + 1) * 0.03;
        this.chest.rotation.y = Math.sin(styleTime * 0.8) * 0.05;
        this.head.rotation.y = Math.sin(styleTime * 1.1) * 0.03;
        break;

      case "southpaw":
        // Саутпоу: правая нога вперёд, левая рука сильная
        this.rightHip.position.z = 0.05 + Math.sin(styleTime * 1.5) * 0.03;
        this.leftHip.position.z = -0.05 + Math.sin(styleTime * 1.5 + 1) * 0.03;
        this.chest.rotation.y = -Math.sin(styleTime * 0.8) * 0.05;
        this.head.rotation.y = -Math.sin(styleTime * 1.1) * 0.03;
        break;
    }
  }

  // Новый метод: активное приближение к противнику
  approachOpponent(opponent) {
    const distance = this.analyzeDistance(opponent);
    if (distance === "too_far") {
      // Проверяем текущую дистанцию перед движением
      const currentDistance = this.position.distanceTo(opponent.position);
      const minDistance = 2.5; // Минимальная безопасная дистанция

      if (currentDistance > minDistance) {
        // Быстрое приближение, но не слишком близко
        const direction = new THREE.Vector3()
          .subVectors(opponent.position, this.position)
          .normalize();
        const moveSpeed = 0.03; // Уменьшаем скорость для более плавного движения
        this.position.add(direction.multiplyScalar(moveSpeed));

        // Анимация движения
        this.animateMovement();

        // Если подошли достаточно близко - атакуем, но не слишком близко
        const newDistance = this.position.distanceTo(opponent.position);
        if (newDistance <= 4.0 && newDistance >= minDistance) {
          setTimeout(() => {
            if (!this.isAttacking && !this.isDefending && !this.isDodging) {
              this.attack(opponent);
            }
          }, 300);
        }
      }
    }
  }

  // Новый метод: умное отступление при слишком близком контакте
  smartRetreat(opponent) {
    const currentDistance = this.position.distanceTo(opponent.position);
    const minDistance = 2.0; // Минимальная дистанция

    if (currentDistance < minDistance) {
      // Отступаем назад
      const direction = new THREE.Vector3()
        .subVectors(this.position, opponent.position)
        .normalize();
      const moveSpeed = 0.04;
      this.position.add(direction.multiplyScalar(moveSpeed));

      // Анимация отступления
      this.animateMovement();

      // После отступления сразу атакуем
      setTimeout(() => {
        if (!this.isAttacking && !this.isDefending && !this.isDodging) {
          this.attack(opponent);
        }
      }, 200);
    }
  }

  // Новый метод: инициализация системы частиц
  initParticleSystem() {
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = 0;
      positions[i + 1] = 0;
      positions[i + 2] = 0;

      velocities[i] = (Math.random() - 0.5) * 0.1;
      velocities[i + 1] = Math.random() * 0.1;
      velocities[i + 2] = (Math.random() - 0.5) * 0.1;
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute(
      "velocity",
      new THREE.BufferAttribute(velocities, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff4444,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    this.particleSystem = new THREE.Points(particles, particleMaterial);
    this.particleSystem.visible = false;
    this.scene.add(this.particleSystem);
  }

  // Новый метод: специальный удар - апперкот
  specialUppercut(opponent) {
    if (this.specialMoves.uppercut.cooldown > 0 || this.stamina < 30)
      return false;

    this.specialMoves.uppercut.cooldown =
      this.specialMoves.uppercut.maxCooldown;
    this.stamina -= 30;

    // Анимация апперкота
    this.animState = "uppercut";
    this.animTimer = 0;

    // Специальная анимация руки
    if (this.rightArm) {
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.z = Math.PI / 4;
    }

    // Проверка попадания
    setTimeout(() => {
      if (this.checkHit(opponent, 3.5)) {
        let damage = 25 + Math.random() * 15;

        // Применяем комбо множитель
        if (this.comboCounter > 1) {
          damage *= this.comboDamage;
        }

        // Проверяем критический удар
        if (this.isCriticalHit()) {
          damage *= this.criticalMultiplier;
          this.createCriticalEffect(opponent.position);
          this.lastCriticalHit = true;
        } else {
          this.lastCriticalHit = false;
        }

        opponent.takeDamage(damage, "head");
        this.createHitEffect(opponent.position);
        this.score += 2;
        this.addCombo();
      }

      // Возвращаем руку в исходное положение
      if (this.rightArm) {
        this.rightArm.rotation.x = 0;
        this.rightArm.rotation.z = 0;
      }
      this.animState = null;
    }, 400);

    return true;
  }

  // Новый метод: специальный удар - хук
  specialHook(opponent) {
    if (this.specialMoves.hook.cooldown > 0 || this.stamina < 25) return false;

    this.specialMoves.hook.cooldown = this.specialMoves.hook.maxCooldown;
    this.stamina -= 25;

    // Анимация хука
    this.animState = "hook";
    this.animTimer = 0;

    // Специальная анимация руки
    if (this.rightArm) {
      this.rightArm.rotation.y = Math.PI / 2;
      this.rightArm.rotation.z = Math.PI / 3;
    }

    // Проверка попадания
    setTimeout(() => {
      if (this.checkHit(opponent, 3.0)) {
        let damage = 20 + Math.random() * 10;

        // Применяем комбо множитель
        if (this.comboCounter > 1) {
          damage *= this.comboDamage;
        }

        // Проверяем критический удар
        if (this.isCriticalHit()) {
          damage *= this.criticalMultiplier;
          this.createCriticalEffect(opponent.position);
          this.lastCriticalHit = true;
        } else {
          this.lastCriticalHit = false;
        }

        opponent.takeDamage(damage, "head");
        this.createHitEffect(opponent.position);
        this.score += 1;
        this.addCombo();
      }

      // Возвращаем руку в исходное положение
      if (this.rightArm) {
        this.rightArm.rotation.y = 0;
        this.rightArm.rotation.z = 0;
      }
      this.animState = null;
    }, 350);

    return true;
  }

  // Новый метод: удар в корпус
  bodyShot(opponent) {
    if (this.specialMoves.bodyShot.cooldown > 0 || this.stamina < 20)
      return false;

    this.specialMoves.bodyShot.cooldown =
      this.specialMoves.bodyShot.maxCooldown;
    this.stamina -= 20;

    // Анимация удара в корпус
    this.animState = "bodyShot";
    this.animTimer = 0;

    // Специальная анимация руки
    if (this.rightArm) {
      this.rightArm.rotation.x = Math.PI / 3;
    }

    // Проверка попадания
    setTimeout(() => {
      if (this.checkHit(opponent, 2.8)) {
        let damage = 15 + Math.random() * 8;

        // Применяем комбо множитель
        if (this.comboCounter > 1) {
          damage *= this.comboDamage;
        }

        // Проверяем критический удар
        if (this.isCriticalHit()) {
          damage *= this.criticalMultiplier;
          this.createCriticalEffect(opponent.position);
          this.lastCriticalHit = true;
        } else {
          this.lastCriticalHit = false;
        }

        opponent.takeDamage(damage, "body");
        this.createHitEffect(opponent.position);
        this.score += 1;
        this.addCombo();
      }

      // Возвращаем руку в исходное положение
      if (this.rightArm) {
        this.rightArm.rotation.x = 0;
      }
      this.animState = null;
    }, 300);

    return true;
  }

  // Новый метод: эффект критического удара
  createCriticalEffect(position) {
    if (!this.particleSystem) return;

    // Создаём фиолетовые частицы для критического удара
    this.particleSystem.material.color.setHex(0xff00ff);
    this.particleSystem.position.copy(position);
    this.particleSystem.visible = true;

    // Анимация частиц критического удара
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.8;
      positions[i + 1] = Math.random() * 0.8;
      positions[i + 2] = (Math.random() - 0.5) * 0.8;

      velocities[i] = (Math.random() - 0.5) * 0.3;
      velocities[i + 1] = Math.random() * 0.3;
      velocities[i + 2] = (Math.random() - 0.5) * 0.3;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Возвращаем красный цвет и скрываем через 1.5 секунды
    setTimeout(() => {
      this.particleSystem.material.color.setHex(0xff4444);
      this.particleSystem.visible = false;
    }, 1500);
  }

  // Новый метод: создание эффекта попадания
  createHitEffect(position) {
    if (!this.particleSystem) return;

    this.particleSystem.position.copy(position);
    this.particleSystem.visible = true;

    // Анимация частиц
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.5;
      positions[i + 1] = (Math.random() - 0.5) * 0.5;
      positions[i + 2] = (Math.random() - 0.5) * 0.5;

      velocities[i] = (Math.random() - 0.5) * 0.2;
      velocities[i + 1] = Math.random() * 0.2;
      velocities[i + 2] = (Math.random() - 0.5) * 0.2;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Скрываем через 1 секунду
    setTimeout(() => {
      this.particleSystem.visible = false;
    }, 1000);
  }

  // Новый метод: проверка попадания
  checkHit(opponent, range) {
    const distance = this.position.distanceTo(opponent.position);
    return distance <= range;
  }

  // Новый метод: система комбо
  addCombo() {
    const currentTime = performance.now();
    if (currentTime - this.lastComboTime < this.comboWindow) {
      this.comboCounter = Math.min(this.comboCounter + 1, this.maxCombo);
    } else {
      this.comboCounter = 1;
    }
    this.lastComboTime = currentTime;

    // Увеличиваем адреналин за комбо
    this.adrenaline = Math.min(this.adrenaline + 10, this.maxAdrenaline);
  }

  // Новый метод: критический удар
  isCriticalHit() {
    return Math.random() < this.criticalChance;
  }

  // Новый метод: блокирование удара
  tryBlock() {
    return Math.random() < this.blockChance;
  }

  // Новый метод: уклонение от удара
  tryDodge() {
    return Math.random() < this.dodgeChance;
  }

  // Новый метод: получение урона с системой блокирования
  takeDamage(damage, damageType = "normal") {
    // Проверяем блокирование
    if (this.isDefending && this.tryBlock()) {
      damage *= this.blockDamageReduction;
      this.createBlockEffect();
      this.lastBlock = true;
    } else {
      this.lastBlock = false;
    }

    // Проверяем уклонение
    if (this.tryDodge()) {
      damage = 0;
      this.createDodgeEffect();
      this.lastDodge = true;
    } else {
      this.lastDodge = false;
    }

    // Применяем урон
    this.health -= damage;
    this.lastHitTime = performance.now();

    // Создаём эффект попадания
    this.createHitEffect(this.position);

    // Система травм
    this.addInjury(damageType);

    // Увеличиваем адреналин при получении урона
    this.adrenaline = Math.min(this.adrenaline + 5, this.maxAdrenaline);
  }

  // Новый метод: добавление травмы
  addInjury(damageType) {
    switch (damageType) {
      case "head":
        this.injuries.head = Math.min(
          this.injuries.head + 1,
          this.maxInjuryLevel
        );
        break;
      case "body":
        this.injuries.body = Math.min(
          this.injuries.body + 1,
          this.maxInjuryLevel
        );
        break;
      case "arms":
        this.injuries.arms = Math.min(
          this.injuries.arms + 1,
          this.maxInjuryLevel
        );
        break;
    }
  }

  // Новый метод: эффект блокирования
  createBlockEffect() {
    if (!this.particleSystem) return;

    // Создаём синие частицы для блокирования
    this.particleSystem.material.color.setHex(0x0088ff);
    this.particleSystem.position.copy(this.position);
    this.particleSystem.visible = true;

    // Анимация частиц блокирования
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.3;
      positions[i + 1] = Math.random() * 0.3;
      positions[i + 2] = (Math.random() - 0.5) * 0.3;

      velocities[i] = (Math.random() - 0.5) * 0.1;
      velocities[i + 1] = Math.random() * 0.1;
      velocities[i + 2] = (Math.random() - 0.5) * 0.1;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Возвращаем красный цвет и скрываем через 0.5 секунды
    setTimeout(() => {
      this.particleSystem.material.color.setHex(0xff4444);
      this.particleSystem.visible = false;
    }, 500);
  }

  // Новый метод: эффект уклонения
  createDodgeEffect() {
    if (!this.particleSystem) return;

    // Создаём зелёные частицы для уклонения
    this.particleSystem.material.color.setHex(0x00ff88);
    this.particleSystem.position.copy(this.position);
    this.particleSystem.visible = true;

    // Анимация частиц уклонения
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.4;
      positions[i + 1] = Math.random() * 0.4;
      positions[i + 2] = (Math.random() - 0.5) * 0.4;

      velocities[i] = (Math.random() - 0.5) * 0.15;
      velocities[i + 1] = Math.random() * 0.15;
      velocities[i + 2] = (Math.random() - 0.5) * 0.15;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Возвращаем красный цвет и скрываем через 0.8 секунды
    setTimeout(() => {
      this.particleSystem.material.color.setHex(0xff4444);
      this.particleSystem.visible = false;
    }, 800);
  }

  // Новый метод: анимация победы
  startVictoryAnimation() {
    this.victoryAnimation = true;
    this.celebrationTimer = 0;

    // Анимация поднятия рук
    if (this.rightArm) {
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.y = Math.PI / 4;
    }
    if (this.leftArm) {
      this.leftArm.rotation.x = -Math.PI / 2;
      this.leftArm.rotation.y = -Math.PI / 4;
    }

    // Создаём эффект празднования
    this.createVictoryEffect();
  }

  // Новый метод: анимация поражения
  startDefeatAnimation() {
    this.defeatAnimation = true;
    this.celebrationTimer = 0;

    // Анимация падения на колени
    if (this.leftKnee) {
      this.leftKnee.rotation.x = Math.PI / 3;
    }
    if (this.rightKnee) {
      this.rightKnee.rotation.x = Math.PI / 3;
    }

    // Наклон головы
    if (this.head) {
      this.head.rotation.x = Math.PI / 6;
    }
  }

  // Новый метод: эффект победы
  createVictoryEffect() {
    if (!this.particleSystem) return;

    // Создаём золотые частицы для победы
    this.particleSystem.material.color.setHex(0xffdd00);
    this.particleSystem.position.copy(this.position);
    this.particleSystem.position.y += 2;
    this.particleSystem.visible = true;

    // Анимация частиц победы
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1.0;
      positions[i + 1] = Math.random() * 1.0;
      positions[i + 2] = (Math.random() - 0.5) * 1.0;

      velocities[i] = (Math.random() - 0.5) * 0.2;
      velocities[i + 1] = Math.random() * 0.3;
      velocities[i + 2] = (Math.random() - 0.5) * 0.2;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Скрываем через 3 секунды
    setTimeout(() => {
      this.particleSystem.visible = false;
    }, 3000);
  }
}
