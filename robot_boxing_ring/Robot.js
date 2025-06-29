import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";

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
    this.mesh = this.createMesh();
    this.scene.add(this.mesh);
    this.targetOffset = new THREE.Vector3(0, 0, 0);
    this.animTime = 0;
    this.animDuration = 0.25; // секунды
    // Для анимации рук
    this.leftArm = null;
    this.rightArm = null;
    this.leftForearm = null;
    this.rightForearm = null;
    this.leftHand = null;
    this.rightHand = null;
    this.armAnim = null;
    this.armAnimTime = 0;
    this.armAnimDuration = 0.25;
    this.basePosition = this.position.clone();
  }

  createMesh() {
    const group = new THREE.Group();
    // Туловище
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    body.position.y = 1.1;
    group.add(body);
    // Голова
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    head.position.y = 1.95;
    group.add(head);
    // Плечи
    const leftShoulder = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftShoulder.position.set(-0.6, 1.5, 0);
    group.add(leftShoulder);
    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x = 0.6;
    group.add(rightShoulder);
    // Предплечья и кисти (левая)
    this.leftArm = new THREE.Group();
    const leftUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.45, 0.18),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftUpper.position.y = -0.225;
    this.leftArm.add(leftUpper);
    this.leftForearm = new THREE.Group();
    const leftLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.35, 0.16),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftLower.position.y = -0.175;
    this.leftForearm.add(leftLower);
    this.leftHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.leftHand.position.y = -0.23;
    this.leftForearm.add(this.leftHand);
    this.leftForearm.position.y = -0.45;
    this.leftArm.add(this.leftForearm);
    this.leftArm.position.set(-0.6, 1.5, 0);
    group.add(this.leftArm);
    // Предплечья и кисти (правая)
    this.rightArm = new THREE.Group();
    const rightUpper = leftUpper.clone();
    rightUpper.position.y = -0.225;
    this.rightArm.add(rightUpper);
    this.rightForearm = new THREE.Group();
    const rightLower = leftLower.clone();
    rightLower.position.y = -0.175;
    this.rightForearm.add(rightLower);
    this.rightHand = this.leftHand.clone();
    this.rightHand.position.y = -0.23;
    this.rightForearm.add(this.rightHand);
    this.rightForearm.position.y = -0.45;
    this.rightArm.add(this.rightForearm);
    this.rightArm.position.set(0.6, 1.5, 0);
    group.add(this.rightArm);
    // Бёдра, голени, стопы (левая)
    const leftHip = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.4, 0.22),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftHip.position.set(-0.22, 0.6, 0);
    group.add(leftHip);
    const leftShin = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.35, 0.18),
      new THREE.MeshStandardMaterial({ color: this.color })
    );
    leftShin.position.set(-0.22, 0.3, 0);
    group.add(leftShin);
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    leftFoot.position.set(-0.22, 0.1, 0.07);
    group.add(leftFoot);
    // Правая нога
    const rightHip = leftHip.clone();
    rightHip.position.x = 0.22;
    group.add(rightHip);
    const rightShin = leftShin.clone();
    rightShin.position.x = 0.22;
    group.add(rightShin);
    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.22;
    group.add(rightFoot);
    group.position.copy(this.position);
    return group;
  }

  clampToRingBounds(pos) {
    // Размер ринга 8x8, но визуально границы чуть внутри (например, 3.5)
    pos.x = Math.max(-3.5, Math.min(3.5, pos.x));
    pos.z = Math.max(-3.5, Math.min(3.5, pos.z));
    return pos;
  }

  attack(opponent) {
    this.isAttacking = true;
    this.lastAction = "attack";
    // Двигаемся к противнику
    const dir = opponent.position.clone().sub(this.position).normalize();
    const moveVec = dir.multiplyScalar(0.7);
    this.startAnimation(moveVec);
    this.armAnim = "punch";
    this.armAnimTime = 0;
    if (Math.random() > 0.5 && !opponent.isDefending) {
      opponent.takeHit();
      this.score++;
    }
    setTimeout(() => {
      this.isAttacking = false;
      // После атаки остаёмся на новой позиции, но не выходим за ринг
      this.position.add(moveVec);
      this.position = this.clampToRingBounds(this.position);
      this.basePosition.copy(this.position);
    }, 400);
  }

  defend() {
    this.isDefending = true;
    this.lastAction = "defend";
    // Двигаемся назад
    const moveVec = this.position
      .clone()
      .sub(new THREE.Vector3(0, 0, 0))
      .normalize()
      .multiplyScalar(0.5);
    this.startAnimation(moveVec);
    this.armAnim = "block";
    this.armAnimTime = 0;
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
    // Двигаемся вбок
    const side = this.name === "Orange" ? 1 : -1;
    const moveVec = new THREE.Vector3(0, 0, side * 0.7);
    this.startAnimation(moveVec);
    this.armAnim = "dodge";
    this.armAnimTime = 0;
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

  takeHit() {
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
    // Анимация движения
    if (this.targetOffset.lengthSq() > 0) {
      this.animTime += delta;
      let t = Math.min(this.animTime / this.animDuration, 1);
      let animVec = this.targetOffset
        .clone()
        .multiplyScalar(Math.sin(Math.PI * t));
      this.mesh.position.copy(this.basePosition.clone().add(animVec));
      if (t >= 1) {
        this.targetOffset.set(0, 0, 0);
        this.mesh.position.copy(this.basePosition);
      }
    }
    // Анимация рук с защитой от null
    if (this.armAnim) {
      this.armAnimTime += delta;
      let t = Math.min(this.armAnimTime / this.armAnimDuration, 1);
      if (this.armAnim === "punch") {
        if (this.rightArm && this.rightForearm) {
          this.rightArm.rotation.x = (-Math.PI / 2) * Math.sin(Math.PI * t);
          this.rightForearm.rotation.x = (-Math.PI / 3) * Math.sin(Math.PI * t);
        }
      } else if (this.armAnim === "block") {
        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x = (-Math.PI / 3) * Math.sin(Math.PI * t);
          this.rightArm.rotation.x = (-Math.PI / 3) * Math.sin(Math.PI * t);
        }
      } else if (this.armAnim === "dodge") {
        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.z = (Math.PI / 4) * Math.sin(Math.PI * t);
          this.rightArm.rotation.z = (-Math.PI / 4) * Math.sin(Math.PI * t);
        }
      }
      if (t >= 1) {
        if (this.leftArm) this.leftArm.rotation.set(0, 0, 0);
        if (this.rightArm) this.rightArm.rotation.set(0, 0, 0);
        if (this.rightForearm) this.rightForearm.rotation.set(0, 0, 0);
        this.armAnim = null;
      }
    }
    if (
      !this.isAttacking &&
      !this.isDefending &&
      !this.isDodging &&
      this.health > 0 &&
      this.targetOffset.lengthSq() === 0
    ) {
      this.decideAction(opponent);
    }
  }
}
