class AnimationSystem {
  constructor(character) {
    this.character = character;
    this.mixer = character.animationMixer;
    this.actions = {};
    this.currentAction = null;
    this.previousAction = null;
    this.transitionDuration = 0.3;

    this.setupActions();
  }

  setupActions() {
    // Получение всех анимаций из миксера
    const clips = this.mixer._actions;

    for (const action of clips) {
      this.actions[action._clip.name] = action;

      // Настройка параметров анимации
      action.setLoop(THREE.LoopRepeat);
      action.clampWhenFinished = true;
      action.enabled = false;
    }

    // Установка начальной анимации
    this.playAction("idle");
  }

  playAction(actionName, crossFadeDuration = this.transitionDuration) {
    const nextAction = this.actions[actionName];

    if (!nextAction) {
      console.warn(`Анимация "${actionName}" не найдена`);
      return;
    }

    if (this.currentAction === nextAction) {
      return;
    }

    // Если есть текущая анимация, выполняем плавный переход
    if (this.currentAction) {
      this.currentAction.crossFadeTo(nextAction, crossFadeDuration, true);
    }

    // Активация новой анимации
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    this.previousAction = this.currentAction;
    this.currentAction = nextAction;
  }

  // Плавный переход между анимациями
  crossFade(fromAction, toAction, duration = this.transitionDuration) {
    if (fromAction && toAction) {
      fromAction.crossFadeTo(toAction, duration, true);
    }
  }

  // Смешивание анимаций
  blendActions(action1, action2, weight = 0.5) {
    if (action1 && action2) {
      action1.setEffectiveWeight(1 - weight);
      action2.setEffectiveWeight(weight);
    }
  }

  // Анимация ходьбы с вариациями
  playWalkAnimation(speed = 1) {
    this.playAction("walk");

    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(speed);
    }
  }

  // Анимация бега
  playRunAnimation() {
    this.playAction("walk");

    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(2);
    }
  }

  // Анимация прыжка с подготовкой
  playJumpAnimation() {
    // Сначала подготовка к прыжку
    this.playAction("crouch", 0.1);

    setTimeout(() => {
      this.playAction("jump", 0.2);
    }, 200);
  }

  // Анимация приземления
  playLandAnimation() {
    this.playAction("crouch", 0.1);

    setTimeout(() => {
      this.playAction("idle", 0.3);
    }, 300);
  }

  // Анимация поворота
  playTurnAnimation(direction) {
    // Создание временной анимации поворота
    const turnClip = new THREE.AnimationClip("turn", 0.5, [
      new THREE.VectorKeyframeTrack(
        ".group.rotation[y]",
        [0, 0.5],
        [0, (direction * Math.PI) / 4]
      ),
    ]);

    const turnAction = this.mixer.clipAction(turnClip);
    turnAction.setLoop(THREE.LoopOnce);
    turnAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    turnAction.play();

    setTimeout(() => {
      turnAction.stop();
    }, 500);
  }

  // Анимация реакции на препятствие
  playObstacleReaction() {
    // Создание анимации отшатывания
    const reactionClip = new THREE.AnimationClip("reaction", 0.8, [
      new THREE.VectorKeyframeTrack(
        ".body.rotation[z]",
        [0, 0.2, 0.4, 0.8],
        [0, 0.1, -0.1, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".head.rotation[y]",
        [0, 0.4, 0.8],
        [0, 0.2, 0]
      ),
    ]);

    const reactionAction = this.mixer.clipAction(reactionClip);
    reactionAction.setLoop(THREE.LoopOnce);
    reactionAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    reactionAction.play();

    setTimeout(() => {
      reactionAction.stop();
    }, 800);
  }

  // Анимация успешного действия
  playSuccessAnimation() {
    // Создание анимации радости
    const successClip = new THREE.AnimationClip("success", 1, [
      new THREE.VectorKeyframeTrack(
        ".body.rotation[y]",
        [0, 0.5, 1],
        [0, 0.1, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 0.5, 1],
        [0, -Math.PI / 3, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 0.5, 1],
        [0, -Math.PI / 3, 0]
      ),
    ]);

    const successAction = this.mixer.clipAction(successClip);
    successAction.setLoop(THREE.LoopOnce);
    successAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    successAction.play();

    setTimeout(() => {
      successAction.stop();
    }, 1000);
  }

  // Анимация неудачного действия
  playFailureAnimation() {
    // Создание анимации разочарования
    const failureClip = new THREE.AnimationClip("failure", 1.2, [
      new THREE.VectorKeyframeTrack(
        ".body.rotation[z]",
        [0, 0.3, 0.6, 1.2],
        [0, 0.05, -0.05, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".head.rotation[y]",
        [0, 0.6, 1.2],
        [0, -0.3, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 0.6, 1.2],
        [0, Math.PI / 6, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 0.6, 1.2],
        [0, Math.PI / 6, 0]
      ),
    ]);

    const failureAction = this.mixer.clipAction(failureClip);
    failureAction.setLoop(THREE.LoopOnce);
    failureAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    failureAction.play();

    setTimeout(() => {
      failureAction.stop();
    }, 1200);
  }

  // Анимация обучения
  playLearningAnimation() {
    // Создание анимации размышления
    const learningClip = new THREE.AnimationClip("learning", 2, [
      new THREE.VectorKeyframeTrack(
        ".head.rotation[y]",
        [0, 0.5, 1, 1.5, 2],
        [0, 0.2, -0.2, 0.2, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".body.rotation[y]",
        [0, 1, 2],
        [0, 0.05, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 1, 2],
        [0, -Math.PI / 6, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 1, 2],
        [0, -Math.PI / 6, 0]
      ),
    ]);

    const learningAction = this.mixer.clipAction(learningClip);
    learningAction.setLoop(THREE.LoopOnce);
    learningAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    learningAction.play();

    setTimeout(() => {
      learningAction.stop();
    }, 2000);
  }

  // Анимация адаптации к поверхности
  playSurfaceAdaptationAnimation(surfaceType) {
    let adaptationClip;

    switch (surfaceType) {
      case "high":
        // Анимация для высокой поверхности
        adaptationClip = new THREE.AnimationClip("high_surface", 1, [
          new THREE.VectorKeyframeTrack(
            ".body.position[y]",
            [0, 0.5, 1],
            [0, 0.3, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".leftLeg.rotation[x]",
            [0, 0.5, 1],
            [0, Math.PI / 6, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".rightLeg.rotation[x]",
            [0, 0.5, 1],
            [0, Math.PI / 6, 0]
          ),
        ]);
        break;
      case "medium":
        // Анимация для средней поверхности
        adaptationClip = new THREE.AnimationClip("medium_surface", 0.8, [
          new THREE.VectorKeyframeTrack(
            ".body.position[y]",
            [0, 0.4, 0.8],
            [0, 0.2, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".leftLeg.rotation[x]",
            [0, 0.4, 0.8],
            [0, Math.PI / 8, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".rightLeg.rotation[x]",
            [0, 0.4, 0.8],
            [0, Math.PI / 8, 0]
          ),
        ]);
        break;
      default:
        // Анимация для плоской поверхности
        adaptationClip = new THREE.AnimationClip("flat_surface", 0.5, [
          new THREE.VectorKeyframeTrack(
            ".body.position[y]",
            [0, 0.25, 0.5],
            [0, 0.1, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".leftLeg.rotation[x]",
            [0, 0.25, 0.5],
            [0, Math.PI / 12, 0]
          ),
          new THREE.VectorKeyframeTrack(
            ".rightLeg.rotation[x]",
            [0, 0.25, 0.5],
            [0, Math.PI / 12, 0]
          ),
        ]);
    }

    const adaptationAction = this.mixer.clipAction(adaptationClip);
    adaptationAction.setLoop(THREE.LoopOnce);
    adaptationAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    adaptationAction.play();

    setTimeout(() => {
      adaptationAction.stop();
    }, adaptationClip.duration * 1000);
  }

  // Обновление системы анимаций
  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  // Остановка всех анимаций
  stopAllAnimations() {
    for (const action of Object.values(this.actions)) {
      action.stop();
      action.enabled = false;
    }
    this.currentAction = null;
    this.previousAction = null;
  }

  // Получение текущей анимации
  getCurrentAnimation() {
    return this.currentAction ? this.currentAction._clip.name : null;
  }

  // Проверка, играет ли анимация
  isPlaying(actionName) {
    const action = this.actions[actionName];
    return action ? action.isRunning() : false;
  }

  // Установка скорости анимации
  setAnimationSpeed(actionName, speed) {
    const action = this.actions[actionName];
    if (action) {
      action.setEffectiveTimeScale(speed);
    }
  }

  // Установка веса анимации
  setAnimationWeight(actionName, weight) {
    const action = this.actions[actionName];
    if (action) {
      action.setEffectiveWeight(weight);
    }
  }

  // Создание пользовательской анимации
  createCustomAnimation(name, duration, tracks) {
    const clip = new THREE.AnimationClip(name, duration, tracks);
    const action = this.mixer.clipAction(clip);

    this.actions[name] = action;
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;

    return action;
  }

  // Анимация движения к цели
  playTargetSeekingAnimation() {
    const seekingClip = new THREE.AnimationClip("seeking", 1.5, [
      new THREE.VectorKeyframeTrack(
        ".head.rotation[y]",
        [0, 0.5, 1, 1.5],
        [0, 0.3, -0.3, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".body.rotation[y]",
        [0, 0.75, 1.5],
        [0, 0.1, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".leftArm.rotation[x]",
        [0, 0.75, 1.5],
        [0, -Math.PI / 8, 0]
      ),
      new THREE.VectorKeyframeTrack(
        ".rightArm.rotation[x]",
        [0, 0.75, 1.5],
        [0, -Math.PI / 8, 0]
      ),
    ]);

    const seekingAction = this.mixer.clipAction(seekingClip);
    seekingAction.setLoop(THREE.LoopOnce);
    seekingAction.clampWhenFinished = true;

    this.playAction("idle", 0.1);
    seekingAction.play();

    setTimeout(() => {
      seekingAction.stop();
    }, 1500);
  }
}
