class Environment {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.surfaces = [];
    this.targets = [];
    this.currentSurfaceType = "flat";
    this.difficulty = 5;

    // Создание базовой среды
    this.createBaseEnvironment();
  }

  createBaseEnvironment() {
    // Создание пола
    this.createFloor();

    // Создание освещения
    this.createLighting();

    // Создание начальных препятствий
    this.generateObstacles();
  }

  createFloor() {
    // Основной пол
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0x2ecc71,
      transparent: true,
      opacity: 0.8,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.scene.add(this.floor);

    // Сетка для ориентации
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  createLighting() {
    // Основное освещение
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // Направленное освещение
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Точечное освещение
    const pointLight = new THREE.PointLight(0x3498db, 0.5, 20);
    pointLight.position.set(0, 10, 0);
    this.scene.add(pointLight);
  }

  generateObstacles() {
    this.clearObstacles();

    switch (this.currentSurfaceType) {
      case "flat":
        this.generateFlatSurface();
        break;
      case "hills":
        this.generateHillsSurface();
        break;
      case "stairs":
        this.generateStairsSurface();
        break;
      case "obstacles":
        this.generateObstacleCourse();
        break;
    }
  }

  generateFlatSurface() {
    // Плоская поверхность с минимальными препятствиями
    for (let i = 0; i < this.difficulty; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;

      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        // Избегаем центра
        this.createObstacle(x, 0.5, z, 1, 1, 1);
      }
    }
  }

  generateHillsSurface() {
    // Создание холмистой поверхности
    const hillCount = Math.floor(this.difficulty / 2) + 2;

    for (let i = 0; i < hillCount; i++) {
      const x = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      const height = Math.random() * 3 + 1;
      const radius = Math.random() * 5 + 3;

      this.createHill(x, height, z, radius);
    }

    // Добавление препятствий на холмах
    for (let i = 0; i < this.difficulty; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const y = this.getHeightAt(x, z) + 0.5;

      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        this.createObstacle(x, y, z, 1, 1, 1);
      }
    }
  }

  generateStairsSurface() {
    // Создание лестничной поверхности
    const stairCount = Math.floor(this.difficulty / 2) + 3;
    const stairWidth = 8;
    const stairHeight = 0.5;
    const stairDepth = 2;

    let maxY = 0;
    let maxZ = 0;
    for (let i = 0; i < stairCount; i++) {
      const x = 0; // Центрируем лестницу
      const z = i * stairDepth - (stairCount * stairDepth) / 2;
      const y = i * stairHeight;
      this.createStair(x, y, z, stairWidth, stairHeight, stairDepth);
      if (i === stairCount - 1) {
        maxY = y + stairHeight / 2;
        maxZ = z;
      }
    }

    // Добавление платформы наверху лестницы
    const platformWidth = stairWidth;
    const platformDepth = 6;
    const platformHeight = 0.5;
    const platformY = maxY + platformHeight / 2;
    const platformZ = maxZ + platformDepth / 2 + stairDepth / 2;
    this.createStair(
      0,
      platformY,
      platformZ,
      platformWidth,
      platformHeight,
      platformDepth
    );
    this.stairsPlatform = { x: 0, y: platformY + 0.5, z: platformZ };

    // Добавление препятствий на лестницах
    for (let i = 0; i < this.difficulty; i++) {
      const x = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      const y = this.getHeightAt(x, z) + 0.5;
      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        this.createObstacle(x, y, z, 0.8, 0.8, 0.8);
      }
    }
  }

  generateObstacleCourse() {
    // Создание полосы препятствий
    const obstacleCount = this.difficulty * 2;

    for (let i = 0; i < obstacleCount; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const width = Math.random() * 2 + 0.5;
      const height = Math.random() * 3 + 1;
      const depth = Math.random() * 2 + 0.5;

      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        this.createObstacle(x, height / 2, z, width, height, depth);
      }
    }

    // Создание движущихся препятствий
    for (let i = 0; i < Math.floor(this.difficulty / 2); i++) {
      this.createMovingObstacle();
    }
  }

  createObstacle(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0.8,
    });

    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y, z);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;

    // Создание коллайдера
    obstacle.collider = new THREE.Box3().setFromObject(obstacle);
    // obstacle.position = obstacle.position.clone();

    this.obstacles.push(obstacle);
    this.scene.add(obstacle);
  }

  createHill(x, height, z, radius) {
    const segments = 16;
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
      color: 0x8b4513,
      transparent: true,
      opacity: 0.9,
    });

    const hill = new THREE.Mesh(geometry, material);
    hill.position.set(x, height / 2, z);
    hill.castShadow = true;
    hill.receiveShadow = true;

    this.surfaces.push(hill);
    this.scene.add(hill);
  }

  createStair(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({
      color: 0x95a5a6,
      transparent: true,
      opacity: 0.9,
    });

    const stair = new THREE.Mesh(geometry, material);
    stair.position.set(x, y + height / 2, z);
    stair.castShadow = true;
    stair.receiveShadow = true;

    this.surfaces.push(stair);
    this.scene.add(stair);
  }

  createMovingObstacle() {
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const material = new THREE.MeshLambertMaterial({
      color: 0xf39c12,
      transparent: true,
      opacity: 0.8,
    });

    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(
      (Math.random() - 0.5) * 30,
      1,
      (Math.random() - 0.5) * 30
    );

    obstacle.castShadow = true;
    obstacle.receiveShadow = true;

    // Добавление анимации движения
    obstacle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    );
    obstacle.bounds = 15;
    obstacle.collider = new THREE.Box3().setFromObject(obstacle);
    obstacle.position = obstacle.position.clone();

    this.obstacles.push(obstacle);
    this.scene.add(obstacle);
  }

  clearObstacles() {
    // Удаление существующих препятствий
    for (const obstacle of this.obstacles) {
      this.scene.remove(obstacle);
    }
    this.obstacles = [];

    // Удаление поверхностей
    for (const surface of this.surfaces) {
      this.scene.remove(surface);
    }
    this.surfaces = [];
  }

  update(deltaTime) {
    // Обновление движущихся препятствий
    for (const obstacle of this.obstacles) {
      if (obstacle.velocity) {
        // Обновление позиции
        obstacle.position.add(
          obstacle.velocity.clone().multiplyScalar(deltaTime)
        );

        // Проверка границ
        if (Math.abs(obstacle.position.x) > obstacle.bounds) {
          obstacle.velocity.x *= -1;
        }
        if (Math.abs(obstacle.position.z) > obstacle.bounds) {
          obstacle.velocity.z *= -1;
        }

        // Обновление коллайдера
        obstacle.collider.setFromObject(obstacle);
      }
    }
  }

  getHeightAt(x, z) {
    let height = 0;

    // Проверка столкновения с поверхностями
    for (const surface of this.surfaces) {
      const surfacePos = surface.position;
      const distance = Math.sqrt(
        (x - surfacePos.x) ** 2 + (z - surfacePos.z) ** 2
      );

      if (surface.geometry.type === "ConeGeometry") {
        // Холм
        const radius =
          surface.geometry.parameters.radiusTop ||
          surface.geometry.parameters.radius;
        const maxHeight = surface.geometry.parameters.height;

        if (distance < radius) {
          const relativeDistance = distance / radius;
          const surfaceHeight = (1 - relativeDistance) * maxHeight;
          height = Math.max(height, surfaceHeight);
        }
      } else if (surface.geometry.type === "BoxGeometry") {
        // Лестница или препятствие
        const box = new THREE.Box3().setFromObject(surface);
        if (
          x >= box.min.x &&
          x <= box.max.x &&
          z >= box.min.z &&
          z <= box.max.z
        ) {
          height = Math.max(height, box.max.y);
        }
      }
    }

    return height;
  }

  getSurfaceTypeAt(position) {
    // Определение типа поверхности в данной позиции
    const height = this.getHeightAt(position.x, position.z);

    if (height > 2) {
      return "high";
    } else if (height > 0.5) {
      return "medium";
    } else {
      return "flat";
    }
  }

  getNearbyObstacles(position, radius = 5) {
    const nearby = [];

    for (const obstacle of this.obstacles) {
      const distance = position.distanceTo(obstacle.position);
      if (distance <= radius) {
        nearby.push({
          position: obstacle.position.clone(),
          distance: distance,
          type: obstacle.geometry.type,
        });
      }
    }

    return nearby;
  }

  checkCollision(position, radius = 1) {
    const collisionSphere = new THREE.Sphere(position, radius);

    for (const obstacle of this.obstacles) {
      if (obstacle.collider.intersectsSphere(collisionSphere)) {
        return true;
      }
    }

    return false;
  }

  setSurfaceType(type) {
    this.currentSurfaceType = type;
    this.generateObstacles();
  }

  setDifficulty(level) {
    this.difficulty = Math.max(1, Math.min(10, level));
    this.generateObstacles();
  }

  // Создание цели для персонажа
  createTarget(position) {
    const geometry = new THREE.SphereGeometry(0.5, 8, 6);
    const material = new THREE.MeshLambertMaterial({
      color: 0x27ae60,
      transparent: true,
      opacity: 0.8,
    });

    const target = new THREE.Mesh(geometry, material);
    target.position.copy(position);
    target.castShadow = true;

    // Добавление анимации пульсации
    target.scale.set(1, 1, 1);
    target.userData.originalScale = 1;
    target.userData.pulseSpeed = 2;

    this.targets.push(target);
    this.scene.add(target);

    return target;
  }

  // Обновление анимации целей
  updateTargets(deltaTime) {
    for (const target of this.targets) {
      const time = Date.now() * 0.001;
      const scale = 1 + Math.sin(time * target.userData.pulseSpeed) * 0.2;
      target.scale.setScalar(scale);
    }
  }

  // Получение случайной позиции для цели
  getRandomTargetPosition() {
    let x, y, z;
    let attempts = 0;
    if (this.currentSurfaceType === "stairs" && this.stairsPlatform) {
      // Размещаем цель на платформе наверху лестницы
      return new THREE.Vector3(
        this.stairsPlatform.x,
        this.stairsPlatform.y,
        this.stairsPlatform.z
      );
    }
    do {
      x = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
      attempts++;
    } while (this.checkCollision(new THREE.Vector3(x, 1, z)) && attempts < 50);
    return new THREE.Vector3(x, 1, z);
  }

  // Очистка целей
  clearTargets() {
    for (const target of this.targets) {
      this.scene.remove(target);
    }
    this.targets = [];
  }
}
