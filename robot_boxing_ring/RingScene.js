import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import Robot from "./Robot.js";
import AIController from "./AIController.js";

export default class RingScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.offsetWidth / container.offsetHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 8, 10);
    this.camera.lookAt(0, 1, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
    this.initRing();
    this.initRobots();
    this.initScoreboard();
    this.animate = this.animate.bind(this);
    this.animate();
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
  }

  updateScoreboard() {
    this.scoreDiv.textContent = `${this.robot1.name}: ${this.robot1.score}  |  ${this.robot2.name}: ${this.robot2.score}`;
  }

  checkWinner() {
    if (this.robot1.health <= 0 || this.robot2.health <= 0) {
      let winner =
        this.robot1.health > this.robot2.health
          ? this.robot1.name
          : this.robot2.name;
      this.scoreDiv.textContent += `  —  Победитель: ${winner}!`;
      return true;
    }
    return false;
  }

  animate() {
    requestAnimationFrame(this.animate);
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
      this.robot1.update(this.robot2, delta);
      this.robot2.update(this.robot1, delta);
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
    }
    // TODO: визуализация частиц (эффекты попаданий)
    this.renderer.render(this.scene, this.camera);
  }
}
