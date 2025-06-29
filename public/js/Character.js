class Character {
  constructor(scene, position = { x: 0, y: 1, z: 0 }) {
    this.scene = scene;
    this.position = new THREE.Vector3(position.x, position.y, position.z);
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.rotation = new THREE.Euler();

    // Физические параметры
    this.speed = 5;
    this.jumpForce = 8;
    this.gravity = -20;
    this.friction = 0.8;
    this.groundY = 0;
    this.isOnGround = false;
    this.isJumping = false;
    this.isCrouching = false;

    // Состояние персонажа
    this.health = 100;
    this.energy = 100;
    this.currentAction = "idle";
    this.lastAction = "idle";

    // Создание 3D модели персонажа
    this.createCharacter();

    // Система анимаций
    this.animationMixer = null;
    this.animations = {};
    this.currentAnimation = null;
    this.setupAnimations();

    // Система обучения
    this.learningData = {
      successfulMoves: 0,
      failedMoves: 0,
      terrainMemory: new Map(),
      obstacleMemory: new Map(),
    };
  }

  createCharacter() {
    // Создание группы для персонажа
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Тело персонажа (цилиндр)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.8,
    });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = 0.75;
    this.group.add(this.body);

    // Голова (сфера)
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 6);
    const headMaterial = new THREE.MeshLambertMaterial({
      color: 0xf39c12,
      transparent: true,
      opacity: 0.9,
    });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = 1.8;
    this.group.add(this.head);

    // Руки
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xf39c12 });

    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(-0.7, 1.2, 0);
    this.leftArm.rotation.z = Math.PI / 2;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(0.7, 1.2, 0);
    this.rightArm.rotation.z = -Math.PI / 2;
    this.group.add(this.rightArm);

    // Ноги
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 6);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.leftLeg.position.set(-0.3, -0.4, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.rightLeg.position.set(0.3, -0.4, 0);
    this.group.add(this.rightLeg);

    // Глаза
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 4);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.leftEye.position.set(-0.15, 1.85, 0.35);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.rightEye.position.set(0.15, 1.85, 0.35);
    this.group.add(this.rightEye);

    // Добавление в сцену
    this.scene.add(this.group);

    // Создание коллайдера
    this.collider = new THREE.Box3().setFromObject(this.group);
  }

  setupAnimations() {
    // Создание анимационного миксера
    this.animationMixer = new THREE.AnimationMixer(this.group);

    // Анимация ходьбы
    this.createWalkAnimation();

    // Анимация прыжка
    this.createJumpAnimation();

    // Анимация приседания
    this.createCrouchAnimation();

    // Анимация ожидания
    this.createIdleAnimation();
  }

  createWalkAnimation() {
    const walkClip = new THREE.AnimationClip("walk", 1, [
      // Анимация ног
      new THREE.VectorKeyframeTrack(
        ".leftLeg.rotation[x]",
        [0, 0.5, 1],
        [0, Math.PI / 4, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightLeg.rotation[x]",
        [0, 0.5, 1],
        [0, -Math.PI / 4, 0]
      ),

      // Анимация рук
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 0.5, 1],
        [0, -Math.PI / 6, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 0.5, 1],
        [0, Math.PI / 6, 0]
      ),

      // Покачивание тела
      new THREE.VectorKeyframeTrack(
        ".body.rotation[z]",
        [0, 0.5, 1],
        [0, 0.1, 0]
      ),
    ]);

    this.animations.walk = this.animationMixer.clipAction(walkClip);
    this.animations.walk.setLoop(THREE.LoopRepeat);
  }

  createJumpAnimation() {
    const jumpClip = new THREE.AnimationClip("jump", 1.5, [
      // Подготовка к прыжку
      new THREE.VectorKeyframeTrack(
        ".leftLeg.rotation[x]",
        [0, 0.2, 0.4, 1.5],
        [0, -Math.PI / 6, -Math.PI / 3, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightLeg.rotation[x]",
        [0, 0.2, 0.4, 1.5],
        [0, -Math.PI / 6, -Math.PI / 3, 0]
      ),

      // Руки вверх
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 0.3, 1.5],
        [0, -Math.PI / 3, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 0.3, 1.5],
        [0, -Math.PI / 3, 0]
      ),
    ]);

    this.animations.jump = this.animationMixer.clipAction(jumpClip);
    this.animations.jump.setLoop(THREE.LoopOnce);
    this.animations.jump.clampWhenFinished = true;
  }

  createCrouchAnimation() {
    const crouchClip = new THREE.AnimationClip("crouch", 0.5, [
      // Приседание
      new THREE.VectorKeyframeTrack(".body.scale[y]", [0, 0.5], [1, 0.7]),
      new THREE.VectorKeyframeTrack(".head.position[y]", [0, 0.5], [1.8, 1.4]),
      new THREE.VectorKeyframeTrack(
        ".leftLeg.rotation[x]",
        [0, 0.5],
        [0, Math.PI / 3]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightLeg.rotation[x]",
        [0, 0.5],
        [0, Math.PI / 3]
      ),
    ]);

    this.animations.crouch = this.animationMixer.clipAction(crouchClip);
    this.animations.crouch.setLoop(THREE.LoopOnce);
    this.animations.crouch.clampWhenFinished = true;
  }

  createIdleAnimation() {
    const idleClip = new THREE.AnimationClip("idle", 2, [
      // Легкое покачивание
      new THREE.VectorKeyframeTrack(
        ".body.rotation[y]",
        [0, 1, 2],
        [0, 0.05, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".head.rotation[y]",
        [0, 1, 2],
        [0, -0.02, 0]
      ),
    ]);

    this.animations.idle = this.animationMixer.clipAction(idleClip);
    this.animations.idle.setLoop(THREE.LoopRepeat);
  }

  playAnimation(animationName) {
    if (this.currentAnimation) {
      this.currentAnimation.stop();
    }

    if (this.animations[animationName]) {
      this.currentAnimation = this.animations[animationName];
      this.currentAnimation.reset();
      this.currentAnimation.play();
    }
  }

  isStepAhead(environment) {
    // Проверяем, есть ли перед персонажем ступенька (лестница)
    const forward = new THREE.Vector3(0, 0, -1)
      .applyEuler(this.group.rotation)
      .normalize();
    const checkPos = this.position.clone().add(forward.multiplyScalar(0.7));
    const heightAtCheck = environment.getHeightAt(checkPos.x, checkPos.z);
    // Если высота впереди больше текущей, но не слишком высоко (например, до 1.2)
    return (
      heightAtCheck - this.position.y > 0.2 &&
      heightAtCheck - this.position.y < 1.2
    );
  }

  update(deltaTime, environment) {
    // Обновление анимаций
    if (this.animationMixer) {
      this.animationMixer.update(deltaTime);
    }

    // Применение гравитации
    this.acceleration.y = this.gravity;

    // Обновление скорости
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));

    // Применение трения
    this.velocity.x *= this.friction;
    this.velocity.z *= this.friction;

    // Обновление позиции
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Авто-прыжок при встрече со ступенькой
    if (
      !this.isJumping &&
      this.isOnGround &&
      environment &&
      this.isStepAhead(environment)
    ) {
      this.jump();
    }

    // Корректировка по поверхности (ступеньки, платформа, пол)
    if (environment) {
      const heightBelow = environment.getHeightAt(
        this.position.x,
        this.position.z
      );
      if (this.position.y <= heightBelow + 0.1) {
        this.position.y = heightBelow;
        this.velocity.y = 0;
        this.isOnGround = true;
        this.isJumping = false;
      } else {
        this.isOnGround = false;
      }
    }

    // Обновление позиции группы
    this.group.position.copy(this.position);

    // Обновление коллайдера
    this.collider.setFromObject(this.group);

    // Обновление состояния анимации
    this.updateAnimationState();
  }

  updateAnimationState() {
    if (this.isJumping) {
      if (this.currentAction !== "jump") {
        this.playAnimation("jump");
        this.currentAction = "jump";
      }
    } else if (this.isCrouching) {
      if (this.currentAction !== "crouch") {
        this.playAnimation("crouch");
        this.currentAction = "crouch";
      }
    } else if (
      Math.abs(this.velocity.x) > 0.1 ||
      Math.abs(this.velocity.z) > 0.1
    ) {
      if (this.currentAction !== "walk") {
        this.playAnimation("walk");
        this.currentAction = "walk";
      }
    } else {
      if (this.currentAction !== "idle") {
        this.playAnimation("idle");
        this.currentAction = "idle";
      }
    }
  }

  move(direction, speed = this.speed) {
    const moveVector = new THREE.Vector3();

    switch (direction) {
      case "forward":
        moveVector.z = -speed;
        break;
      case "backward":
        moveVector.z = speed;
        break;
      case "left":
        moveVector.x = -speed;
        break;
      case "right":
        moveVector.x = speed;
        break;
    }

    this.velocity.add(moveVector);

    // Поворот персонажа в направлении движения
    if (moveVector.length() > 0) {
      const angle = Math.atan2(moveVector.x, moveVector.z);
      this.group.rotation.y = angle;
    }
  }

  jump() {
    if (this.isOnGround && !this.isJumping) {
      this.velocity.y = this.jumpForce;
      this.isJumping = true;
      this.isOnGround = false;
      return true;
    }
    return false;
  }

  crouch() {
    if (!this.isCrouching) {
      this.isCrouching = true;
      this.speed *= 0.5;
      return true;
    }
    return false;
  }

  stand() {
    if (this.isCrouching) {
      this.isCrouching = false;
      this.speed = 5;
      return true;
    }
    return false;
  }

  resetPosition() {
    this.position.set(0, 1, 0);
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.isJumping = false;
    this.isCrouching = false;
    this.isOnGround = true;
  }

  // Система обучения
  learnFromAction(action, success, terrainType, obstacles) {
    if (success) {
      this.learningData.successfulMoves++;
      this.learningData.terrainMemory.set(
        terrainType,
        (this.learningData.terrainMemory.get(terrainType) || 0) + 1
      );
    } else {
      this.learningData.failedMoves++;
      this.learningData.obstacleMemory.set(
        JSON.stringify(obstacles),
        (this.learningData.obstacleMemory.get(JSON.stringify(obstacles)) || 0) +
          1
      );
    }
  }

  getLearningStats() {
    const totalMoves =
      this.learningData.successfulMoves + this.learningData.failedMoves;
    return {
      successfulMoves: this.learningData.successfulMoves,
      failedMoves: this.learningData.failedMoves,
      successRate:
        totalMoves > 0
          ? ((this.learningData.successfulMoves / totalMoves) * 100).toFixed(2)
          : 0,
      terrainMemory: Object.fromEntries(this.learningData.terrainMemory),
      obstacleMemory: Object.fromEntries(this.learningData.obstacleMemory),
    };
  }

  // Получение информации о текущей ситуации
  getCurrentSituation(environment) {
    return {
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z,
      },
      isOnGround: this.isOnGround,
      isJumping: this.isJumping,
      isCrouching: this.isCrouching,
      surfaceType: environment.getSurfaceTypeAt(this.position),
      obstacles: environment.getNearbyObstacles(this.position),
      health: this.health,
      energy: this.energy,
    };
  }

  // Проверка столкновений с препятствиями
  checkCollisions(obstacles) {
    for (const obstacle of obstacles) {
      if (this.collider.intersectsBox(obstacle.collider)) {
        return true;
      }
    }
    return false;
  }

  // Получение направления к цели
  getDirectionToTarget(targetPosition) {
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.position)
      .normalize();
    return direction;
  }

  // Умное движение к цели
  moveTowardsTarget(targetPosition, obstacles) {
    const direction = this.getDirectionToTarget(targetPosition);
    const distance = this.position.distanceTo(targetPosition);

    // Проверка препятствий на пути
    const rayStart = this.position.clone();
    const rayEnd = targetPosition.clone();
    const rayDirection = rayEnd.sub(rayStart).normalize();

    // Простая проверка препятствий
    let canMoveDirectly = true;
    for (const obstacle of obstacles) {
      const obstaclePos = obstacle.position;
      const distanceToObstacle = rayStart.distanceTo(obstaclePos);

      if (distanceToObstacle < distance && distanceToObstacle < 2) {
        canMoveDirectly = false;
        break;
      }
    }

    if (canMoveDirectly) {
      // Прямое движение к цели
      this.velocity.x = direction.x * this.speed;
      this.velocity.z = direction.z * this.speed;
    } else {
      // Обход препятствий
      this.avoidObstacles(obstacles);
    }

    return distance < 1; // Достигнута ли цель
  }

  // Обход препятствий
  avoidObstacles(obstacles) {
    let avoidDirection = new THREE.Vector3();

    for (const obstacle of obstacles) {
      const toObstacle = new THREE.Vector3().subVectors(
        obstacle.position,
        this.position
      );
      const distance = toObstacle.length();

      if (distance < 3) {
        // Вычисление направления обхода
        const avoid = toObstacle.clone().normalize().multiplyScalar(-1);
        avoidDirection.add(avoid);
      }
    }

    if (avoidDirection.length() > 0) {
      avoidDirection.normalize();
      this.velocity.x = avoidDirection.x * this.speed;
      this.velocity.z = avoidDirection.z * this.speed;
    }
  }
}
