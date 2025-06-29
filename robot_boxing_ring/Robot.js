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
    // Кисть
    this.leftHand = new THREE.Group();
    this.leftHand.position.y = -0.22;
    const leftHandBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.leftHand.add(leftHandBox);
    // Пальцы (3 цилиндра)
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      finger.rotation.x = Math.PI / 2;
      finger.position.set(i * 0.035, -0.04, 0.07);
      this.leftHand.add(finger);
    }
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
    this.rightHand = new THREE.Group();
    this.rightHand.position.y = -0.22;
    const rightHandBox = leftHandBox.clone();
    this.rightHand.add(rightHandBox);
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      finger.rotation.x = Math.PI / 2;
      finger.position.set(i * 0.035, -0.04, 0.07);
      this.rightHand.add(finger);
    }
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

  attack(opponent, fromCombo = false) {
    this.isAttacking = true;
    this.lastAction = "attack";
    const dir = opponent.position.clone().sub(this.position).normalize();
    const moveVec = dir.multiplyScalar(0.7);
    // Если комбо — выбираем следующий удар из расширенного списка
    const punchTypes = ["jab", "hook", "uppercut", "body", "cross"];
    this.currentPunch =
      punchTypes[Math.floor(Math.random() * punchTypes.length)];
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
      // Если комбо ещё не закончено — продолжаем
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
      } else if (this.animState === "hit") {
        // Получение удара: корпус и голова назад, тряска, руки вверх
        this.chest.position.z = lerp(0, -0.3, t);
        this.head.position.z = lerp(0, -0.15, t) + Math.sin(t * 20) * 0.03;
        this.leftShoulder.rotation.x = lerp(0, -0.3, t);
        this.rightShoulder.rotation.x = lerp(0, -0.3, t);
        this.leftUpperArm.rotation.x = lerp(0, 0.2, t);
        this.rightUpperArm.rotation.x = lerp(0, 0.2, t);
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
      const t = performance.now() * 0.001 + (this.name === "Orange" ? 0 : 1);

      // Смена состояния каждые 3-5 секунд
      if (this.idleTimer > 3 + Math.random() * 2) {
        this.changeIdleState();
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
      } else if (this.idleState === "taunting") {
        // Провокации: покачивание головой, движения рук
        this.head.rotation.y = Math.sin(t * 2.5) * 0.2;
        this.head.rotation.z = Math.sin(t * 1.8) * 0.1;
        this.leftShoulder.rotation.z = Math.sin(t * 3) * 0.3;
        this.rightShoulder.rotation.z = -Math.sin(t * 3) * 0.3;
        this.leftHand.position.x = Math.sin(t * 4) * 0.1;
        this.rightHand.position.x = -Math.sin(t * 4) * 0.1;
        this.chest.rotation.y = Math.sin(t * 1.2) * 0.12;
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
      }

      // Реакции на противника
      if (this.reactionToOpponent === "defensive_ready") {
        // Готовность к защите
        this.chest.position.z = -0.1;
        this.leftShoulder.rotation.x = -0.2;
        this.rightShoulder.rotation.x = -0.2;
        this.head.position.y = 0.03;
      } else if (this.reactionToOpponent === "frustrated") {
        // Раздражение
        this.head.rotation.y = Math.sin(t * 5) * 0.1;
        this.chest.rotation.y = Math.sin(t * 3) * 0.1;
        this.leftHand.position.y = Math.sin(t * 6) * 0.05;
        this.rightHand.position.y = Math.sin(t * 6) * 0.05;
      } else if (this.reactionToOpponent === "tired") {
        // Усталость
        this.chest.position.y = 0.35;
        this.head.position.y = -0.02;
        this.chest.rotation.x = -0.08;
        this.leftShoulder.rotation.x = -0.05;
        this.rightShoulder.rotation.x = -0.05;
      }

      // Микродвижения ног (всегда активны)
      this.leftThigh.rotation.x = Math.sin(t * 1.1) * 0.04;
      this.rightThigh.rotation.x = -Math.sin(t * 1.1) * 0.04;
      this.leftFoot.position.x = Math.sin(t * 1.7) * 0.02;
      this.rightFoot.position.x = -Math.sin(t * 1.7) * 0.02;
    }
    // Усталость накапливается при ударах
    if (this.isAttacking || this.isDefending || this.isDodging) {
      this.fatigue = Math.min(1, this.fatigue + delta * 0.12);
    } else {
      this.fatigue = Math.max(0, this.fatigue - delta * 0.05);
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
}
