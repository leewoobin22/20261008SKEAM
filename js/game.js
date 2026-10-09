import { COLORS, GAME_CONFIG, SOUND_CONFIG, TARGET_COLOR_ID, UMBRELLA_REWARD_INTERVAL } from "./config.js";

export class Game {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.state = "MENU";
    this.stage = 1;
    this.fallSpeedMultiplier = GAME_CONFIG.fallSpeed.baseMultiplier;
    this.tutorialActive = false;
    this.tutorial = null;
    this.targetColor = COLORS.find((color) => color.id === TARGET_COLOR_ID);
    this.targetCount = GAME_CONFIG.paintsPerStage;
    this.collectedCount = 0;
    this.lives = GAME_CONFIG.initialLives;
    this.remainingTime = GAME_CONFIG.stageDuration;
    this.umbrellaCount = 0;
    this.umbrellaRewardCounter = 0;
    this.umbrellaActive = false;
    this.umbrellaRemainingTime = 0;
    this.umbrellaOpenElapsed = 0;
    this.umbrellaImpacts = [];
    this.feverCardCount = 0;
    this.feverActive = false;
    this.feverRemainingTime = 0;
    this.feverParticles = [];
    this.nextFeverParticleColor = 0;
    this.feverFlashRemaining = 0;
    this.feverTitleElapsed = 0;
    this.feverFadeRemaining = 0;
    this.feverFadeColor = this.targetColor.hex;
    this.effectTime = 0;
    this.paintExplosions = [];
    this.playerHitFlashRemaining = 0;
    this.stageStartFeverCardCount = 0;
    this.perfectClear = false;
    this.stageClearRewardGranted = false;
    this.wrongCount = 0;
    this.melodyIndex = 0;
    this.lastCorrectCollectionTime = null;
    this.gameplayTime = 0;
    this.statusMessage = "빨간 물감 5개를 모아 보세요!";
    this.soundEvents = [];
    this.paints = [];
    this.nextPaintId = 1;
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
    this.timeSinceTargetSpawn = 0;
    this.pendingPaintSpawns = [];
    this.spawnSequenceTimer = 0;
    this.player = { x: 0, y: 0, width: GAME_CONFIG.playerWidth, height: GAME_CONFIG.playerHeight };
    this.input = { source: "mouse", mouseX: 0, left: false, right: false };
    this.feedback = null;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.player.x = this.player.x === 0 ? width / 2 : this.player.x;
    this.player.y = height - GAME_CONFIG.playerBottomOffset - this.player.height;
    this.clampPlayer();
  }

  start() {
    this.stage = 1;
    this.targetColor = COLORS.find((color) => color.id === TARGET_COLOR_ID);
    this.resetStage(0);
  }

  resetStage(feverCardCount = this.stageStartFeverCardCount) {
    this.state = "PLAYING";
    this.fallSpeedMultiplier = this.getStageFallSpeedMultiplier(this.stage);
    this.targetCount = this.stage * GAME_CONFIG.paintsPerStage;
    this.collectedCount = 0;
    this.lives = GAME_CONFIG.initialLives;
    this.remainingTime = GAME_CONFIG.stageDuration;
    this.umbrellaCount = 0;
    this.umbrellaRewardCounter = 0;
    this.umbrellaActive = false;
    this.umbrellaRemainingTime = 0;
    this.umbrellaOpenElapsed = 0;
    this.umbrellaImpacts = [];
    this.feverCardCount = Math.min(GAME_CONFIG.maxFeverCards, feverCardCount);
    this.feverActive = false;
    this.feverRemainingTime = 0;
    this.feverParticles = [];
    this.nextFeverParticleColor = 0;
    this.feverFlashRemaining = 0;
    this.feverTitleElapsed = 0;
    this.feverFadeRemaining = 0;
    this.paintExplosions = [];
    this.playerHitFlashRemaining = 0;
    this.stageStartFeverCardCount = this.feverCardCount;
    this.perfectClear = false;
    this.stageClearRewardGranted = false;
    this.wrongCount = 0;
    this.melodyIndex = 0;
    this.lastCorrectCollectionTime = null;
    this.gameplayTime = 0;
    this.soundEvents = [];
    this.paints = [];
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
    this.timeSinceTargetSpawn = 0;
    this.pendingPaintSpawns = [];
    this.spawnSequenceTimer = 0;
    this.feedback = {
      text: `${this.targetColor.name} 물감 ${this.targetCount}개를 모아 보세요!`,
      color: "#6d695f",
      x: this.width / 2,
      y: 34,
      time: 2.2
    };
    this.statusMessage = `${this.targetColor.name} 물감 ${this.targetCount}개를 모아 보세요!`;
    this.player.x = this.width / 2;
    this.input.mouseX = this.player.x;
  }

  getStageSpeedMultiplier(stage) {
    const { stageMultipliers, stageStep, maxMultiplier } = GAME_CONFIG.fallSpeed;
    if (stage <= stageMultipliers.length) return stageMultipliers[Math.max(0, stage - 1)];
    const lastListedMultiplier = stageMultipliers[stageMultipliers.length - 1];
    return Math.min(maxMultiplier, lastListedMultiplier + (stage - stageMultipliers.length) * stageStep);
  }

  getStageFallSpeedMultiplier(stage) {
    return GAME_CONFIG.fallSpeed.baseMultiplier * this.getStageSpeedMultiplier(stage);
  }

  startTutorial() {
    if (this.state === "PLAYING" || this.state === "TUTORIAL") return false;
    this.targetColor = COLORS.find((color) => color.id === TARGET_COLOR_ID);
    this.tutorialActive = true;
    this.tutorial = {
      step: 1,
      paints: [],
      fallSpeedMultiplier: this.getStageFallSpeedMultiplier(1),
      movementStartX: this.player.x || this.width / 2,
      umbrellaCount: 0,
      feverCardCount: 0,
      retryDelay: 0,
      spawnTimer: 0,
      melodyIndex: 0,
      lastCorrectCollectionTime: null
    };
    this.state = "TUTORIAL";
    this.paints = [];
    this.pendingPaintSpawns = [];
    this.umbrellaActive = false;
    this.umbrellaRemainingTime = 0;
    this.umbrellaOpenElapsed = 0;
    this.umbrellaImpacts = [];
    this.feverActive = false;
    this.feverRemainingTime = 0;
    this.feverParticles = [];
    this.feverFlashRemaining = 0;
    this.feverTitleElapsed = GAME_CONFIG.feverVfx.titleDuration;
    this.feverFadeRemaining = 0;
    this.paintExplosions = [];
    this.playerHitFlashRemaining = 0;
    this.feedback = null;
    this.soundEvents = [];
    this.player.x = this.width / 2;
    this.input.mouseX = this.player.x;
    this.input.left = false;
    this.input.right = false;
    this.statusMessage = "튜토리얼 1 / 6 · 그릇을 움직여 보세요.";
    return true;
  }

  finishTutorial() {
    if (!this.tutorialActive) return false;
    this.tutorialActive = false;
    this.tutorial = null;
    this.start();
    return true;
  }

  advanceTutorial(step) {
    if (!this.tutorialActive || !this.tutorial) return;
    this.tutorial.step = step;
    this.tutorial.paints = [];
    this.tutorial.retryDelay = 0;
    this.tutorial.spawnTimer = 0;
    const stepMessages = {
      2: "목표 색 물감을 그릇으로 받아보세요.",
      3: "다른 색 물감이 바닥으로 떨어지도록 피해보세요.",
      4: "우산을 사용해 오답 물감을 막아보세요.",
      5: "피버카드를 사용해 목표 물감을 받아보세요.",
      6: "튜토리얼을 마쳤어요. 게임을 시작할 준비가 됐어요."
    };
    this.statusMessage = `튜토리얼 ${step} / 6 · ${stepMessages[step]}`;
    if (step === 2) {
      this.spawnTutorialPaint(this.targetColor, this.player.x, -20, 0);
    } else if (step === 3) {
      this.spawnTutorialWrongPaint();
    } else if (step === 4) {
      this.tutorial.umbrellaCount = 1;
      this.umbrellaActive = false;
      this.umbrellaRemainingTime = 0;
    } else if (step === 5) {
      this.tutorial.feverCardCount = 1;
    } else if (step === 6) {
      this.feverActive = false;
      this.feverRemainingTime = 0;
      this.tutorial.paints = [];
    }
  }

  spawnTutorialPaint(color, x, y, velocityY) {
    if (!this.tutorial) return null;
    const radius = randomBetween(GAME_CONFIG.paintRadius.min, GAME_CONFIG.paintRadius.max);
    const paint = {
      id: this.nextPaintId,
      colorId: color.id,
      displayColorId: color.id,
      feverPaint: this.tutorial.step === 5,
      feverSpeedMultiplier: this.tutorial.step === 5
        ? GAME_CONFIG.fever.fallSpeedMultiplier * GAME_CONFIG.fever.fallSpeedAdjustment
        : 1,
      originalColorId: color.id,
      x,
      y,
      velocityY,
      previousY: y,
      colorChangeTime: 0,
      radius,
      collisionProcessed: false,
      animation: "fall",
      animationElapsed: 0
    };
    this.nextPaintId += 1;
    this.tutorial.paints.push(paint);
    return paint;
  }

  spawnTutorialWrongPaint() {
    const x = this.player.x < this.width / 2 ? this.width * 0.76 : this.width * 0.24;
    const wrongColor = COLORS.find((color) => color.id !== this.targetColor.id);
    this.spawnTutorialPaint(wrongColor, x, -20, 70);
  }

  updateTutorial(deltaTime) {
    if (!this.tutorial) return;
    const tutorial = this.tutorial;
    this.updatePaintExplosions(deltaTime);
    this.updateFeverVisuals(deltaTime);
    const previousPlayerX = this.player.x;
    this.updatePlayer(deltaTime);

    if (tutorial.step === 1 && Math.abs(this.player.x - tutorial.movementStartX) >= 24) {
      this.advanceTutorial(2);
    }

    if (tutorial.retryDelay > 0) {
      tutorial.retryDelay = Math.max(0, tutorial.retryDelay - deltaTime);
      if (tutorial.retryDelay === 0) {
        if (tutorial.step === 3) this.spawnTutorialWrongPaint();
        if (tutorial.step === 4 && !this.umbrellaActive) {
          tutorial.umbrellaCount = 1;
          this.spawnTutorialPaint(
            COLORS.find((color) => color.id !== this.targetColor.id),
            this.player.x,
            -20,
            70
          );
        }
      }
    }

    if (tutorial.step === 5 && this.feverActive) {
      this.feverRemainingTime = Math.max(0, this.feverRemainingTime - deltaTime);
      tutorial.spawnTimer -= deltaTime;
      if (tutorial.spawnTimer <= 0 && tutorial.paints.length < 6) {
        this.spawnTutorialPaint(this.targetColor, randomBetween(35, this.width - 35), -20, 90);
        tutorial.spawnTimer += 0.36;
      }
      if (this.feverRemainingTime <= 0) {
        this.feverActive = false;
        this.feverFadeRemaining = GAME_CONFIG.feverVfx.fadeDuration;
        this.advanceTutorial(6);
      }
    }

    for (let index = tutorial.paints.length - 1; index >= 0; index -= 1) {
      const paint = tutorial.paints[index];
      if (paint.animation === "splash") {
        paint.animationElapsed += deltaTime;
        if (paint.animationElapsed >= GAME_CONFIG.paintFrameCount / GAME_CONFIG.splashAnimationFps) {
          tutorial.paints.splice(index, 1);
        }
        continue;
      }
      paint.previousY = paint.y;
      paint.animationElapsed += deltaTime;
      const speedMultiplier = tutorial.fallSpeedMultiplier * (paint.feverSpeedMultiplier || 1);
      paint.velocityY += GAME_CONFIG.gravity * speedMultiplier * deltaTime;
      paint.y += paint.velocityY * deltaTime;

      if (this.umbrellaActive && tutorial.step === 4) {
        const umbrellaHit = this.findUmbrellaCollision(paint, previousPlayerX);
        if (umbrellaHit) {
          paint.animation = "splash";
          paint.animationElapsed = 0;
          paint.x = umbrellaHit.x;
          paint.y = umbrellaHit.y - paint.radius;
          this.umbrellaImpacts.push({ x: umbrellaHit.x, y: umbrellaHit.y, colorId: paint.colorId, time: 0.32 });
          this.soundEvents.push({ name: "umbrellaBlock" });
          this.umbrellaActive = false;
          this.umbrellaRemainingTime = 0;
          this.advanceTutorial(5);
          break;
        }
      }

      if (this.collidesWithPlayer(paint)) {
        paint.collisionProcessed = true;
        if (tutorial.step === 2 && paint.colorId === this.targetColor.id) {
          this.soundEvents.push({ name: "paintCollect", noteIndex: 0, fever: false });
          this.advanceTutorial(3);
          break;
        }
        if (tutorial.step === 5 && paint.colorId === this.targetColor.id) {
          const continuingMelody = tutorial.lastCorrectCollectionTime !== null
            && this.effectTime - tutorial.lastCorrectCollectionTime <= SOUND_CONFIG.melody.continuationWindow;
          if (!continuingMelody) tutorial.melodyIndex = 0;
          this.soundEvents.push({ name: "paintCollect", noteIndex: tutorial.melodyIndex, fever: true });
          tutorial.melodyIndex = (tutorial.melodyIndex + 1) % SOUND_CONFIG.melody.frequencies.length;
          tutorial.lastCorrectCollectionTime = this.effectTime;
          paint.animation = "splash";
          paint.animationElapsed = 0;
          continue;
        }
        if (tutorial.step === 3 || tutorial.step === 4) {
          paint.animation = "splash";
          paint.animationElapsed = 0;
          this.soundEvents.push({ name: "paintSplash" });
          this.statusMessage = tutorial.step === 3
            ? "앗, 다시 피해보세요. 생명은 줄지 않아요!"
            : "우산이 열리기 전에 닿았어요. 다시 사용해보세요.";
          this.umbrellaActive = false;
          this.umbrellaRemainingTime = 0;
          tutorial.retryDelay = 0.8;
          continue;
        }
      }

      if (paint.y - paint.radius > this.height) {
        tutorial.paints.splice(index, 1);
        if (tutorial.step === 3) {
          this.advanceTutorial(4);
          break;
        } else if (tutorial.step === 4 && this.umbrellaActive) {
          this.umbrellaActive = false;
          this.umbrellaRemainingTime = 0;
          tutorial.umbrellaCount = 1;
          tutorial.retryDelay = 0.8;
        }
      }
    }

    if (this.umbrellaActive) {
      this.umbrellaOpenElapsed = Math.min(
        GAME_CONFIG.umbrellaOpenDuration,
        this.umbrellaOpenElapsed + deltaTime
      );
      this.umbrellaRemainingTime = Math.max(0, this.umbrellaRemainingTime - deltaTime);
    }
  }

  nextStage() {
    if (this.state !== "STAGE_CLEAR") return;
    this.stage += 1;
    this.targetColor = COLORS[(this.stage - 1) % COLORS.length];
    this.resetStage(this.feverCardCount);
  }

  retryStage() {
    if (this.state !== "TIMEOUT") return;
    this.resetStage(this.stageStartFeverCardCount);
  }

  restartGame() {
    if (this.state !== "GAME_OVER") return;
    this.resetStage(this.stageStartFeverCardCount);
  }

  setPointerPosition(x) {
    this.input.source = "mouse";
    this.input.mouseX = x;
  }

  setDirection(direction, pressed) {
    if (direction !== "left" && direction !== "right") return;
    this.input.source = "keyboard";
    this.input[direction] = pressed;
  }

  useUmbrella() {
    if (this.tutorialActive && this.tutorial?.step === 4) {
      if (this.tutorial.umbrellaCount < 1 || this.umbrellaActive) return false;
      this.tutorial.umbrellaCount -= 1;
      this.umbrellaActive = true;
      this.umbrellaRemainingTime = GAME_CONFIG.umbrellaDuration;
      this.umbrellaOpenElapsed = 0;
      this.soundEvents.push({ name: "umbrella" });
      this.tutorial.paints = [];
      this.spawnTutorialPaint(
        COLORS.find((color) => color.id !== this.targetColor.id),
        this.player.x,
        this.player.y - 120,
        90
      );
      this.statusMessage = "우산이 펼쳐졌어요. 오답 물감을 막아보세요!";
      return true;
    }
    if (this.state !== "PLAYING" || this.umbrellaActive || this.umbrellaCount < 1) return false;
    this.umbrellaCount -= 1;
    this.umbrellaActive = true;
    this.umbrellaRemainingTime = GAME_CONFIG.umbrellaDuration;
    this.umbrellaOpenElapsed = 0;
    this.statusMessage = "우산이 펼쳐졌어요. 오답 물감을 막아 줍니다!";
    this.soundEvents.push({ name: "umbrella" });
    this.feedback = {
      text: "우산 방어!",
      color: "#438bd1",
      x: this.player.x,
      y: this.player.y - 28,
      time: 1.1
    };
    return true;
  }

  useFever() {
    if (this.tutorialActive && this.tutorial?.step === 5) {
      if (this.tutorial.feverCardCount < 1 || this.feverActive) return false;
      this.tutorial.feverCardCount -= 1;
      this.feverActive = true;
      this.feverRemainingTime = GAME_CONFIG.feverDuration;
      this.feverFlashRemaining = GAME_CONFIG.feverVfx.flashDuration;
      this.feverTitleElapsed = 0;
      this.feverFadeRemaining = 0;
      this.feverFadeColor = this.targetColor.hex;
      this.feverParticles = [];
      this.nextFeverParticleColor = 0;
      this.spawnFeverParticles(this.width / 2, this.height / 2, GAME_CONFIG.feverVfx.startParticleCount);
      this.tutorial.spawnTimer = 0.05;
      this.soundEvents.push({ name: "fever" });
      this.statusMessage = "피버타임! 목표 색 물감이 빠르게 내려와요.";
      return true;
    }
    if (this.state !== "PLAYING" || this.feverActive || this.feverCardCount < 1) return false;
    this.feverCardCount -= 1;
    this.feverActive = true;
    this.feverRemainingTime = GAME_CONFIG.feverDuration;
    this.feverFlashRemaining = GAME_CONFIG.feverVfx.flashDuration;
    this.feverTitleElapsed = 0;
    this.feverFadeRemaining = 0;
    this.feverFadeColor = this.targetColor.hex;
    this.feverParticles = [];
    this.nextFeverParticleColor = 0;
    this.spawnFeverParticles(this.width / 2, this.height / 2, GAME_CONFIG.feverVfx.startParticleCount);
    for (const paint of this.paints) {
      if (!paint.collisionProcessed && paint.animation !== "splash") {
        paint.colorId = this.targetColor.id;
        paint.displayColorId = this.targetColor.id;
        paint.feverPaint = true;
        paint.feverSpeedMultiplier = GAME_CONFIG.fever.fallSpeedMultiplier
          * GAME_CONFIG.fever.fallSpeedAdjustment;
        paint.velocityY *= paint.feverSpeedMultiplier;
        paint.colorChangeTime = 0.45;
      }
    }
    this.statusMessage = "FEVER TIME! 화면의 물감이 목표 색으로 바뀌었어요.";
    this.soundEvents.push({ name: "fever" });
    this.feedback = {
      text: "FEVER TIME!",
      color: this.targetColor.hex,
      x: this.width / 2,
      y: 40,
      time: GAME_CONFIG.feverDuration
    };
    return true;
  }

  update(deltaTime) {
    if (this.state === "PAUSED") return;
    if (this.state === "TUTORIAL") {
      this.updateTutorial(deltaTime);
      return;
    }
    if (this.state !== "PLAYING") {
      this.updatePaintExplosions(deltaTime);
      this.updateSplashAnimations(deltaTime);
      return;
    }
    if (this.width <= 0 || this.height <= 0) return;

    const activeDelta = Math.min(deltaTime, this.remainingTime);
    this.gameplayTime += activeDelta;
    if (this.lastCorrectCollectionTime !== null
      && this.gameplayTime - this.lastCorrectCollectionTime > SOUND_CONFIG.melody.continuationWindow) {
      this.melodyIndex = 0;
      this.lastCorrectCollectionTime = null;
    }
    this.updatePaintExplosions(activeDelta);
    this.timeSinceTargetSpawn += activeDelta;
    const previousPlayerX = this.player.x;
    this.updatePlayer(activeDelta);
    if (this.umbrellaActive) {
      this.umbrellaOpenElapsed = Math.min(
        GAME_CONFIG.umbrellaOpenDuration,
        this.umbrellaOpenElapsed + activeDelta
      );
    }
    const spawnRateMultiplier = this.feverActive
      ? GAME_CONFIG.fever.spawnMultiplier * GAME_CONFIG.fever.spawnRateAdjustment
      : 1;
    this.spawnTimer -= activeDelta * spawnRateMultiplier;
    let batchStarted = false;
    while (this.spawnTimer <= 0) {
      if (this.pendingPaintSpawns.length === 0) {
        this.queuePaintBatch();
        batchStarted = true;
      } else if (this.feverActive) {
        this.pendingPaintSpawns.push(...this.preparePaintBatch());
      }
      this.spawnTimer += GAME_CONFIG.spawnInterval;
    }
    if (this.pendingPaintSpawns.length > 0) {
      if (!batchStarted) this.spawnSequenceTimer -= activeDelta;
      while (this.pendingPaintSpawns.length > 0 && this.spawnSequenceTimer <= 1e-9) {
        const maxActivePaints = this.feverActive ? GAME_CONFIG.fever.maxActivePaints : Infinity;
        if (this.paints.length >= maxActivePaints) {
          this.pendingPaintSpawns = [];
          break;
        }
        const pendingPaint = this.pendingPaintSpawns.shift();
        const feverPaint = this.feverActive;
        const color = feverPaint ? this.targetColor : pendingPaint.color;
        this.createPaint(color, pendingPaint.x, color.id, color, feverPaint);
        this.spawnSequenceTimer += GAME_CONFIG.paintSpawn.sequenceInterval;
      }
    }

    for (let index = this.paints.length - 1; index >= 0; index -= 1) {
      const paint = this.paints[index];
      if (paint.animation === "splash") {
        paint.animationElapsed += activeDelta;
        if (paint.animationElapsed >= GAME_CONFIG.paintFrameCount / GAME_CONFIG.splashAnimationFps) {
          this.paints.splice(index, 1);
        }
        continue;
      }

      paint.previousY = paint.y;
      paint.colorChangeTime = Math.max(0, (paint.colorChangeTime || 0) - activeDelta);
      paint.animationElapsed += activeDelta;
      paint.velocityY += GAME_CONFIG.gravity * this.fallSpeedMultiplier
        * (paint.feverSpeedMultiplier || 1) * activeDelta;
      paint.y += paint.velocityY * activeDelta;

      if (this.umbrellaActive && paint.colorId !== this.targetColor.id) {
        const umbrellaHit = this.findUmbrellaCollision(paint, previousPlayerX);
        if (umbrellaHit) {
          paint.collisionProcessed = true;
          paint.animation = "splash";
          paint.animationElapsed = 0;
          paint.x = umbrellaHit.x;
          paint.y = umbrellaHit.y - paint.radius;
          this.umbrellaImpacts.push({
            x: umbrellaHit.x,
            y: umbrellaHit.y,
            colorId: paint.colorId,
            time: 0.32
          });
          if (this.umbrellaImpacts.length > 8) this.umbrellaImpacts.shift();
          this.soundEvents.push({ name: "umbrellaBlock" });
          this.feedback = {
            text: "우산으로 막았어요!",
            color: "#438bd1",
            x: this.player.x,
            y: umbrellaHit.y - 12,
            time: 0.75
          };
          this.statusMessage = "오답 물감을 우산 표면에서 막았어요!";
          continue;
        }
      }

      if (this.collidesWithPlayer(paint)) {
        if (!paint.collisionProcessed) {
          paint.animation = "splash";
          paint.animationElapsed = 0;
          this.resolveCollision(paint);
        }
        if (this.state !== "PLAYING") {
          break;
        }
      } else if (paint.y - paint.radius > this.height) {
        this.paints.splice(index, 1);
      }
    }

    if (this.feedback) {
      this.feedback.time -= activeDelta;
      this.feedback.y -= 18 * activeDelta;
      if (this.feedback.time <= 0) this.feedback = null;
    }

    if (this.state !== "PLAYING") return;
    if (this.umbrellaActive) {
      this.umbrellaRemainingTime = Math.max(0, this.umbrellaRemainingTime - activeDelta);
      if (this.umbrellaRemainingTime <= 1e-9) {
        this.umbrellaActive = false;
        this.umbrellaRemainingTime = 0;
        this.umbrellaOpenElapsed = 0;
        this.umbrellaImpacts = [];
        this.statusMessage = "우산 효과가 끝났어요.";
      }
    }
    this.updateFeverVisuals(activeDelta);
    if (this.feverActive) {
      const feverTimeBeforeUpdate = this.feverRemainingTime;
      this.feverRemainingTime = Math.max(0, this.feverRemainingTime - activeDelta);
      if (this.feverRemainingTime <= 1e-9) {
        this.feverActive = false;
        this.feverRemainingTime = 0;
        this.feverFadeRemaining = Math.min(GAME_CONFIG.feverVfx.fadeDuration, feverTimeBeforeUpdate);
        this.pendingPaintSpawns = [];
        this.spawnSequenceTimer = 0;
        this.statusMessage = "피버타임이 끝났어요. 바뀐 물감 색은 유지됩니다.";
      }
    }
    this.remainingTime = Math.max(0, this.remainingTime - activeDelta);
    if (this.remainingTime <= 0) {
      this.finishStage("TIMEOUT");
    }
  }

  updatePlayer(deltaTime) {
    if (this.input.source === "mouse") {
      this.player.x = this.input.mouseX;
    } else {
      const direction = Number(this.input.right) - Number(this.input.left);
      this.player.x += direction * GAME_CONFIG.playerSpeed * deltaTime;
    }
    this.clampPlayer();
  }

  clampPlayer() {
    const halfWidth = Math.min(this.player.width, this.width) / 2;
    this.player.x = Math.max(halfWidth, Math.min(this.width - halfWidth, this.player.x));
  }

  spawnPaint() {
    return this.spawnPaintBatch(1)[0];
  }

  spawnPaintBatch(forcedCount = null) {
    return this.preparePaintBatch(forcedCount)
      .map(({ color, x }) => {
        const feverPaint = this.feverActive;
        const visualColor = feverPaint ? this.targetColor : color;
        return this.createPaint(
          feverPaint ? this.targetColor : color,
          x,
          color.id,
          visualColor,
          feverPaint
        );
      });
  }

  queuePaintBatch() {
    this.pendingPaintSpawns = this.preparePaintBatch();
    this.spawnSequenceTimer = 0;
  }

  preparePaintBatch(forcedCount = null) {
    const count = forcedCount ?? this.choosePaintBatchSize();
    const positions = this.choosePaintPositions(count);
    if (this.feverActive) {
      return positions.map((x) => ({ color: this.targetColor, x }));
    }
    const targetChance = this.getTargetColorChance();
    const guaranteeTarget = !this.feverActive
      && this.timeSinceTargetSpawn >= GAME_CONFIG.paintSpawn.targetGuaranteeInterval;
    const colors = this.choosePaintColors(count, targetChance, guaranteeTarget);
    return colors.map((color, index) => ({ color, x: positions[index] }));
  }

  choosePaintBatchSize() {
    const settings = GAME_CONFIG.paintSpawn;
    const weights = this.stage === 1
      ? settings.batchWeights.stage1
      : this.stage <= 5
        ? settings.batchWeights.stages2To5
        : settings.batchWeights.stage6Plus;
    const roll = Math.random();
    let cumulativeWeight = 0;
    for (let index = 0; index < weights.length; index += 1) {
      cumulativeWeight += weights[index];
      if (roll < cumulativeWeight) return this.getFeverBatchSize(settings.minBatchSize + index);
    }
    return this.getFeverBatchSize(settings.maxBatchSize);
  }

  getFeverBatchSize(batchSize) {
    return this.feverActive
      ? Math.min(GAME_CONFIG.fever.maxBatchSize, batchSize * GAME_CONFIG.fever.spawnMultiplier)
      : batchSize;
  }

  getTargetColorChance() {
    const chance = GAME_CONFIG.paintSpawn.targetChance;
    if (this.stage === 1) return chance.stage1;
    if (this.stage <= 5) return chance.stages2To5;
    return Math.max(chance.minimum, chance.stage6Plus);
  }

  choosePaintColors(count, targetChance, guaranteeTarget) {
    let targetCount = 0;
    for (let index = 0; index < count; index += 1) {
      if (Math.random() < targetChance) targetCount += 1;
    }
    if (guaranteeTarget) targetCount = Math.max(1, targetCount);

    const otherColors = COLORS.filter((color) => color.id !== this.targetColor.id);
    shuffle(otherColors);
    const selected = [
      ...Array.from({ length: targetCount }, () => this.targetColor),
      ...otherColors.slice(0, count - targetCount)
    ];
    shuffle(selected);
    return selected;
  }

  choosePaintPositions(count) {
    const settings = GAME_CONFIG.paintSpawn;
    const margin = GAME_CONFIG.paintRadius.max + 5;
    const left = Math.min(margin, this.width / 2);
    const right = Math.max(left, this.width - margin);
    const usableWidth = right - left;
    const laneWidth = count > 1 ? usableWidth / count : usableWidth;
    const maxJitter = Math.max(
      0,
      Math.min(laneWidth * 0.35, (laneWidth - settings.minimumHorizontalSpacing) * 0.45)
    );
    const positions = Array.from({ length: count }, (_, index) => (
      left + laneWidth * (index + 0.5) + randomBetween(-maxJitter, maxJitter)
    ));
    shuffle(positions);
    return positions;
  }

  createPaint(color, x, originalColorId = color.id, displayColor = color, feverPaint = this.feverActive) {
    const radius = randomBetween(GAME_CONFIG.paintRadius.min, GAME_CONFIG.paintRadius.max);
    const paint = {
      id: this.nextPaintId,
      colorId: color.id,
      displayColorId: displayColor.id,
      feverPaint,
      feverSpeedMultiplier: feverPaint
        ? GAME_CONFIG.fever.fallSpeedMultiplier * GAME_CONFIG.fever.fallSpeedAdjustment
        : 1,
      originalColorId,
      x,
      y: -radius,
      velocityY: randomBetween(GAME_CONFIG.initialFallSpeed.min, GAME_CONFIG.initialFallSpeed.max)
        * this.fallSpeedMultiplier
        * (feverPaint
          ? GAME_CONFIG.fever.fallSpeedMultiplier * GAME_CONFIG.fever.fallSpeedAdjustment
          : 1),
      previousY: -radius,
      colorChangeTime: this.feverActive ? 0.45 : 0,
      radius,
      collisionProcessed: false,
      animation: "fall",
      animationElapsed: 0
    };
    this.nextPaintId += 1;
    this.paints.push(paint);
    if (color.id === this.targetColor.id) this.timeSinceTargetSpawn = 0;
    return paint;
  }

  collidesWithPlayer(paint) {
    if (paint.collisionProcessed) return false;
    const openingHalfWidth = this.player.width / 2 - 11;
    const withinOpening = Math.abs(paint.x - this.player.x) <= openingHalfWidth + paint.radius * 0.35;
    const crossingRim = paint.y + paint.radius >= this.player.y
      && paint.previousY - paint.radius <= this.player.y + 10;
    return withinOpening && crossingRim;
  }

  findUmbrellaCollision(paint, previousPlayerX) {
    const radius = paint.radius;
    const halfWidth = GAME_CONFIG.umbrellaWidth / 2 * this.getUmbrellaOpenProgress();
    const centerY = this.player.y - GAME_CONFIG.umbrellaSurfaceOffset;
    const samples = 16;
    let previous = null;

    for (let sample = 0; sample <= samples; sample += 1) {
      const time = sample / samples;
      const x = previousPlayerX + (this.player.x - previousPlayerX) * time;
      const y = paint.previousY + (paint.y - paint.previousY) * time;
      const offsetX = paint.x - x;
      if (Math.abs(offsetX) > halfWidth + radius * 0.25) {
        previous = null;
        continue;
      }

      const normalizedX = Math.max(-1, Math.min(1, offsetX / halfWidth));
      const surfaceY = centerY - GAME_CONFIG.umbrellaCanopyHeight * (1 - normalizedX * normalizedX);
      const penetration = y + radius - surfaceY;
      if (previous && previous.penetration < 0 && penetration >= 0) {
        let low = previous.time;
        let high = time;
        for (let iteration = 0; iteration < 8; iteration += 1) {
          const middle = (low + high) / 2;
          const middleX = previousPlayerX + (this.player.x - previousPlayerX) * middle;
          const middleY = paint.previousY + (paint.y - paint.previousY) * middle;
          const middleOffsetX = paint.x - middleX;
          const middleNormalizedX = Math.max(-1, Math.min(1, middleOffsetX / halfWidth));
          const middleSurfaceY = centerY - GAME_CONFIG.umbrellaCanopyHeight * (1 - middleNormalizedX * middleNormalizedX);
          if (middleY + radius - middleSurfaceY >= 0) high = middle;
          else low = middle;
        }
        const hitTime = (low + high) / 2;
        const hitX = previousPlayerX + (this.player.x - previousPlayerX) * hitTime;
        const hitOffsetX = paint.x - hitX;
        const hitNormalizedX = Math.max(-1, Math.min(1, hitOffsetX / halfWidth));
        return {
          x: paint.x,
          y: centerY - GAME_CONFIG.umbrellaCanopyHeight * (1 - hitNormalizedX * hitNormalizedX)
        };
      }
      previous = { time, penetration };
    }
    return null;
  }

  getUmbrellaOpenProgress() {
    return Math.min(1, Math.max(0.2, this.umbrellaOpenElapsed / GAME_CONFIG.umbrellaOpenDuration));
  }

  spawnFeverParticles(x, y, count) {
    const capacity = GAME_CONFIG.feverVfx.maxParticles - this.feverParticles.length;
    const particleCount = Math.min(count, capacity);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(50, 220);
      this.feverParticles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius: randomBetween(1.5, 3.5),
        lifetime: randomBetween(
          GAME_CONFIG.feverVfx.particleLifetime.min,
          GAME_CONFIG.feverVfx.particleLifetime.max
        ),
        elapsed: 0,
        color: COLORS[this.nextFeverParticleColor % COLORS.length].hex
      });
      this.nextFeverParticleColor += 1;
    }
  }

  getFeverVisualStrength() {
    return this.feverActive
      ? Math.min(1, this.feverRemainingTime / GAME_CONFIG.feverVfx.fadeDuration)
      : this.feverFadeRemaining / GAME_CONFIG.feverVfx.fadeDuration;
  }

  updateFeverVisuals(deltaTime) {
    this.effectTime += deltaTime;
    this.feverFlashRemaining = Math.max(0, this.feverFlashRemaining - deltaTime);
    this.feverTitleElapsed = Math.min(GAME_CONFIG.feverVfx.titleDuration, this.feverTitleElapsed + deltaTime);
    this.feverFadeRemaining = Math.max(0, this.feverFadeRemaining - deltaTime);
    for (let index = this.umbrellaImpacts.length - 1; index >= 0; index -= 1) {
      this.umbrellaImpacts[index].time -= deltaTime;
      if (this.umbrellaImpacts[index].time <= 0) this.umbrellaImpacts.splice(index, 1);
    }
    for (let index = this.feverParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.feverParticles[index];
      particle.elapsed += deltaTime;
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.velocityY += 45 * deltaTime;
      if (particle.elapsed >= particle.lifetime) this.feverParticles.splice(index, 1);
    }
    if (!this.feverActive && this.feverFadeRemaining <= 0) this.feverParticles = [];
  }

  resolveCollision(paint) {
    if (paint.collisionProcessed) return;
    paint.collisionProcessed = true;
    const correct = paint.colorId === this.targetColor.id;
    if (correct) {
      const continuingMelody = this.lastCorrectCollectionTime !== null
        && this.gameplayTime - this.lastCorrectCollectionTime <= SOUND_CONFIG.melody.continuationWindow;
      this.melodyIndex = continuingMelody ? (this.melodyIndex + 1) % SOUND_CONFIG.melody.frequencies.length : 0;
      this.lastCorrectCollectionTime = this.gameplayTime;
      this.collectedCount += 1;
      this.umbrellaRewardCounter += 1;
      const umbrellaRewarded = this.umbrellaRewardCounter % UMBRELLA_REWARD_INTERVAL === 0
        && this.umbrellaCount < GAME_CONFIG.maxUmbrellas;
      if (umbrellaRewarded) {
        this.umbrellaCount += 1;
        this.statusMessage = `우산을 획득했어요! 보유 ${this.umbrellaCount}개`;
      } else {
        this.statusMessage = `잘 받았어요! ${this.targetColor.name} 물감 ${this.collectedCount}/${this.targetCount}개`;
      }
      this.feedback = {
        text: umbrellaRewarded ? "우산 +1" : "+1 잘 받았어요!",
        color: umbrellaRewarded ? "#438bd1" : this.targetColor.hex,
        x: this.player.x,
        y: this.player.y - 12,
        time: 0.9
      };
      if (this.feverActive) {
        this.spawnFeverParticles(paint.x, paint.y, GAME_CONFIG.feverVfx.collectParticleCount);
      }
      this.soundEvents.push({
        name: "paintCollect",
        noteIndex: this.melodyIndex,
        fever: this.feverActive
      });
      if (this.collectedCount >= this.targetCount) {
        this.finishStage("STAGE_CLEAR");
      }
    } else {
      const color = COLORS.find((item) => item.id === paint.colorId);
      if (this.umbrellaActive) {
        this.soundEvents.push({ name: "umbrellaBlock" });
        this.feedback = {
          text: "우산으로 막았어요!",
          color: "#438bd1",
          x: this.player.x,
          y: this.player.y - 18,
          time: 1
        };
        this.statusMessage = `${color.name} 물감을 우산으로 막았어요!`;
      } else {
        this.melodyIndex = 0;
        this.lastCorrectCollectionTime = null;
        this.createPaintExplosion(paint, color);
        this.wrongCount += 1;
        this.lives = Math.max(0, this.lives - 1);
        this.feedback = {
          text: this.lives === 0 ? "목숨을 모두 잃었어요!" : `${color.name}은(는) 아니에요!`,
          color: this.lives === 0 ? "#c84b40" : "#77736a",
          x: this.player.x,
          y: this.player.y - 12,
          time: 1.1
        };
        this.statusMessage = this.lives === 0
          ? "목숨을 모두 잃었어요."
          : `${color.name}은(는) 목표 색이 아니에요.`;
        if (this.lives === 0) {
          this.finishStage("GAME_OVER");
        } else {
          this.soundEvents.push({ name: "paintSplash" });
        }
      }
    }
  }

  createPaintExplosion(paint, color) {
    const config = GAME_CONFIG.paintExplosion;
    const particles = [];
    for (let index = 0; index < config.maxParticles; index += 1) {
      const angle = (Math.PI * 2 * index) / config.maxParticles + randomBetween(-0.12, 0.12);
      const speed = randomBetween(config.spreadSpeed * 0.4, config.spreadSpeed);
      particles.push({
        x: paint.x,
        y: this.player.y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - randomBetween(12, 70),
        radius: randomBetween(2, 5),
        elapsed: 0
      });
    }
    this.paintExplosions.push({
      x: paint.x,
      y: this.player.y,
      color: color.hex,
      duration: config.duration,
      elapsed: 0,
      shockwaveDuration: config.shockwaveDuration,
      particles
    });
    if (this.paintExplosions.length > config.maxActive) this.paintExplosions.shift();
    this.playerHitFlashRemaining = config.playerFlashDuration;
  }

  updatePaintExplosions(deltaTime) {
    this.playerHitFlashRemaining = Math.max(0, this.playerHitFlashRemaining - deltaTime);
    for (let index = this.paintExplosions.length - 1; index >= 0; index -= 1) {
      const explosion = this.paintExplosions[index];
      explosion.elapsed += deltaTime;
      for (const particle of explosion.particles) {
        particle.elapsed += deltaTime;
        particle.x += particle.velocityX * deltaTime;
        particle.y += particle.velocityY * deltaTime;
        particle.velocityY += GAME_CONFIG.paintExplosion.gravity * deltaTime;
      }
      if (explosion.elapsed >= explosion.duration) this.paintExplosions.splice(index, 1);
    }
  }

  finishStage(state) {
    if (this.state !== "PLAYING") return;
    this.state = state;
    if (state === "STAGE_CLEAR") {
      const lastCollectionSound = [...this.soundEvents].reverse()
        .find((event) => event.name === "paintCollect");
      this.soundEvents = [
        ...(lastCollectionSound ? [lastCollectionSound] : []),
        { name: "stageClear" }
      ];
    } else if (state === "GAME_OVER") {
      this.soundEvents = [{ name: "gameOver" }];
    } else {
      this.soundEvents = [];
    }
    this.umbrellaCount = 0;
    this.umbrellaActive = false;
    this.umbrellaRemainingTime = 0;
    this.umbrellaOpenElapsed = 0;
    this.umbrellaImpacts = [];
    this.feverActive = false;
    this.feverRemainingTime = 0;
    this.feverParticles = [];
    this.feverFlashRemaining = 0;
    this.feverTitleElapsed = GAME_CONFIG.feverVfx.titleDuration;
    this.feverFadeRemaining = 0;
    if (state !== "GAME_OVER") {
      this.paintExplosions = [];
      this.playerHitFlashRemaining = 0;
    }

    this.paints = this.paints.filter((paint) => paint.animation === "splash");
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
    if (state === "STAGE_CLEAR") {
      this.perfectClear = this.lives === GAME_CONFIG.initialLives;
      if (!this.stageClearRewardGranted) {
        this.feverCardCount = this.perfectClear ? GAME_CONFIG.maxFeverCards : 0;
        this.stageClearRewardGranted = true;
      }
      this.statusMessage = `Stage ${this.stage} 클리어!`;
      if (this.perfectClear) {
        this.statusMessage += " PERFECT CLEAR! 다음 스테이지에서 피버타임 카드 1장을 받아요.";
      }
    } else if (state === "TIMEOUT") {
      this.statusMessage = "시간이 다 됐어요. 다시 도전해 보세요.";
    } else if (state === "GAME_OVER") {
      this.statusMessage = "목숨을 모두 잃었어요. 다시 시작해 보세요.";
    }
  }

  takeSoundEvents() {
    return this.soundEvents.splice(0);
  }

  updateSplashAnimations(deltaTime) {
    for (let index = this.paints.length - 1; index >= 0; index -= 1) {
      const paint = this.paints[index];
      if (paint.animation !== "splash") {
        this.paints.splice(index, 1);
        continue;
      }
      paint.animationElapsed += deltaTime;
      if (paint.animationElapsed >= GAME_CONFIG.paintFrameCount / GAME_CONFIG.splashAnimationFps) {
        this.paints.splice(index, 1);
      }
    }
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}
