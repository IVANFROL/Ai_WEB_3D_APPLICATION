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

    // Левая нога (бедро -> голень -> стопа)
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.22, -0.3, 0); // Относительно таза

    this.leftThigh = new THREE.Group();
    const leftThighBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.4, 0.22),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftThighBox.position.y = 0.2;
    this.leftThigh.add(leftThighBox);

    this.leftKnee = new THREE.Group();
    this.leftKnee.position.y = 0.4;
    const leftShinBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.35, 0.18),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftShinBox.position.y = 0.175;
    this.leftKnee.add(leftShinBox);

    this.leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    this.leftFoot.position.y = 0.225;
    this.leftFoot.position.z = 0.07;
    this.leftKnee.add(this.leftFoot);

    this.leftThigh.add(this.leftKnee);
    this.leftHip.add(this.leftThigh);
    this.hips.add(this.leftHip);

    // Правая нога
    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.22, -0.3, 0);

    this.rightThigh = new THREE.Group();
    const rightThighBox = leftThighBox.clone();
    rightThighBox.position.y = 0.2;
    this.rightThigh.add(rightThighBox);

    this.rightKnee = new THREE.Group();
    this.rightKnee.position.y = 0.4;
    const rightShinBox = leftShinBox.clone();
    rightShinBox.position.y = 0.175;
    this.rightKnee.add(rightShinBox);

    this.rightFoot = this.leftFoot.clone();
    this.rightFoot.position.y = 0.225;
    this.rightFoot.position.z = 0.07;
    this.rightKnee.add(this.rightFoot);

    this.rightThigh.add(this.rightKnee);
    this.rightHip.add(this.rightThigh);
    this.hips.add(this.rightHip);

    // Туловище (крепится к тазу)
    this.body = new THREE.Group();
    this.body.position.y = 0.45; // Высота туловища относительно таза

    const bodyBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    bodyBox.position.y = 0.6;
    this.body.add(bodyBox);

    // Голова
    this.head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    this.head.position.y = 1.45;
    this.body.add(this.head);

    // Левая рука
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.5, 1.2, 0);

    this.leftUpperArm = new THREE.Group();
    this.leftUpperArm.position.y = -0.18;
    const leftUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.36, 0.18),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftUpper.position.y = -0.18;
    this.leftUpperArm.add(leftUpper);

    this.leftElbow = new THREE.Group();
    this.leftElbow.position.y = -0.36;
    const leftLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.32, 0.16),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftLower.position.y = -0.16;
    this.leftElbow.add(leftLower);

    this.leftHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.leftHand.position.y = -0.22;
    this.leftElbow.add(this.leftHand);

    this.leftUpperArm.add(this.leftElbow);
    this.leftShoulder.add(this.leftUpperArm);
    this.body.add(this.leftShoulder);

    // Правая рука
    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.5, 1.2, 0);

    this.rightUpperArm = new THREE.Group();
    this.rightUpperArm.position.y = -0.18;
    const rightUpper = leftUpper.clone();
    rightUpper.position.y = -0.18;
    this.rightUpperArm.add(rightUpper);

    this.rightElbow = new THREE.Group();
    this.rightElbow.position.y = -0.36;
    const rightLower = leftLower.clone();
    rightLower.position.y = -0.16;
    this.rightElbow.add(rightLower);

    this.rightHand = this.leftHand.clone();
    this.rightHand.position.y = -0.22;
    this.rightElbow.add(this.rightHand);

    this.rightUpperArm.add(this.rightElbow);
    this.rightShoulder.add(this.rightUpperArm);
    this.body.add(this.rightShoulder);

    // Собираем робота
    this.hips.add(this.body); // Туловище крепится к тазу
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

  attack(opponent) {
    this.isAttacking = true;
    this.lastAction = "attack";
    const dir = opponent.position.clone().sub(this.position).normalize();
    const moveVec = dir.multiplyScalar(0.7);
    this.startAnimation(moveVec);
    this.setAnimState("punch");
    if (Math.random() > 0.5 && !opponent.isDefending) {
      opponent.takeHit();
      this.score++;
    }
    setTimeout(() => {
      this.isAttacking = false;
      this.position.add(moveVec);
      this.position = this.clampToRingBounds(this.position);
      this.basePosition.copy(this.position);
    }, 400);
  }

  defend() {
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
    }, 400);
  }

  dodge() {
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
      if (this.animState === "punch") {
        // Таз и корпус вперёд, левая нога чуть назад, правая вперёд
        this.hips.position.z = lerp(0.3, 0.45, t);
        this.leftHip.position.z = lerp(-0.15, -0.25, t);
        this.rightHip.position.z = lerp(0.15, 0.25, t);
        this.body.rotation.x = lerp(0, 0.12, t);
      } else if (this.animState === "block") {
        // Таз чуть назад, ноги ближе друг к другу
        this.hips.position.z = lerp(0.3, 0.15, t);
        this.leftHip.position.x = lerp(-0.22, -0.15, t);
        this.rightHip.position.x = lerp(0.22, 0.15, t);
        this.body.rotation.x = lerp(0, -0.08, t);
      } else if (this.animState === "dodge") {
        // Таз и ноги вбок
        const side = this.name === "Orange" ? 1 : -1;
        this.hips.position.x = lerp(0, side * 0.25, t);
        this.body.rotation.z = lerp(0, side * 0.18, t);
      } else if (this.animState === "hit") {
        // Таз и корпус назад, ноги чуть согнуты
        this.hips.position.z = lerp(0.3, 0.05, t);
        this.leftThigh.rotation.x = lerp(0, -0.2, t);
        this.rightThigh.rotation.x = lerp(0, -0.2, t);
        this.body.rotation.x = lerp(0, -0.18, t);
      }
      if (t >= 1) {
        // Сбросить анимацию
        this.hips.position.set(0, 0.3, 0);
        this.leftHip.position.set(-0.22, -0.3, 0);
        this.rightHip.position.set(0.22, -0.3, 0);
        this.leftThigh.rotation.set(0, 0, 0);
        this.rightThigh.rotation.set(0, 0, 0);
        this.body.rotation.set(0, 0, 0);
        this.body.position.y = 0.4; // ближе к тазу
        this.animState = null;
      }
    }
    if (
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      this.health > 0 &&
      this.targetOffset.lengthSq() === 0 &&
      !this.animState
    ) {
      this.decideAction(opponent);
    }
  }
}
