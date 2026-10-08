import { COLORS, GAME_CONFIG, TARGET_COLOR_ID } from "./config.js";

export class Game {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.state = "MENU";
    this.stage = 1;
    this.targetColor = COLORS.find((color) => color.id === TARGET_COLOR_ID);
    this.targetCount = GAME_CONFIG.paintsPerStage;
    this.collectedCount = 0;
    this.lives = GAME_CONFIG.initialLives;
    this.remainingTime = GAME_CONFIG.stageDuration;
    this.wrongCount = 0;
    this.statusMessage = "빨간 물감 5개를 모아 보세요!";
    this.paints = [];
    this.nextPaintId = 1;
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
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
    this.beginStage();
  }

  beginStage() {
    this.state = "PLAYING";
    this.targetCount = this.stage * GAME_CONFIG.paintsPerStage;
    this.collectedCount = 0;
    this.lives = GAME_CONFIG.initialLives;
    this.remainingTime = GAME_CONFIG.stageDuration;
    this.wrongCount = 0;
    this.paints = [];
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
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

  nextStage() {
    if (this.state !== "STAGE_CLEAR") return;
    this.stage += 1;
    this.targetColor = COLORS[(this.stage - 1) % COLORS.length];
    this.beginStage();
  }

  retryStage() {
    if (this.state !== "TIMEOUT") return;
    this.beginStage();
  }

  restartGame() {
    if (this.state !== "GAME_OVER") return;
    this.stage = 1;
    this.targetColor = COLORS.find((color) => color.id === TARGET_COLOR_ID);
    this.beginStage();
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

  update(deltaTime) {
    if (this.state !== "PLAYING" || this.width <= 0 || this.height <= 0) return;

    const activeDelta = Math.min(deltaTime, this.remainingTime);
    this.updatePlayer(activeDelta);
    this.spawnTimer -= activeDelta;
    while (this.spawnTimer <= 0) {
      this.spawnPaint();
      this.spawnTimer += GAME_CONFIG.spawnInterval;
    }

    for (let index = this.paints.length - 1; index >= 0; index -= 1) {
      const paint = this.paints[index];
      paint.velocityY += GAME_CONFIG.gravity * activeDelta;
      paint.y += paint.velocityY * activeDelta;

      if (this.collidesWithPlayer(paint)) {
        if (!paint.collisionProcessed) {
          paint.collisionProcessed = true;
          this.resolveCollision(paint);
        }
        this.paints.splice(index, 1);
        if (this.state !== "PLAYING") {
          this.paints = [];
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
    const radius = randomBetween(GAME_CONFIG.paintRadius.min, GAME_CONFIG.paintRadius.max);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const margin = radius + 5;
    this.paints.push({
      id: this.nextPaintId,
      colorId: color.id,
      originalColorId: color.id,
      x: randomBetween(margin, Math.max(margin, this.width - margin)),
      y: -radius,
      velocityY: randomBetween(GAME_CONFIG.initialFallSpeed.min, GAME_CONFIG.initialFallSpeed.max),
      radius,
      collisionProcessed: false
    });
    this.nextPaintId += 1;
  }

  collidesWithPlayer(paint) {
    if (paint.collisionProcessed) return false;
    const openingHalfWidth = this.player.width / 2 - 11;
    const withinOpening = Math.abs(paint.x - this.player.x) <= openingHalfWidth + paint.radius * 0.35;
    const crossingRim = paint.y + paint.radius >= this.player.y
      && paint.y - paint.radius <= this.player.y + 10;
    return withinOpening && crossingRim;
  }

  resolveCollision(paint) {
    const correct = paint.colorId === this.targetColor.id;
    if (correct) {
      this.collectedCount += 1;
      this.feedback = {
        text: "+1 잘 받았어요!",
        color: this.targetColor.hex,
        x: this.player.x,
        y: this.player.y - 12,
        time: 0.9
      };
      this.statusMessage = `잘 받았어요! ${this.targetColor.name} 물감 ${this.collectedCount}/${this.targetCount}개`;
      if (this.collectedCount >= this.targetCount) {
        this.finishStage("STAGE_CLEAR");
      }
    } else {
      this.wrongCount += 1;
      this.lives = Math.max(0, this.lives - 1);
      const color = COLORS.find((item) => item.id === paint.colorId);
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
      }
    }
  }

  finishStage(state) {
    this.state = state;
    this.paints = [];
    this.spawnTimer = GAME_CONFIG.firstSpawnDelay;
    if (state === "STAGE_CLEAR") {
      this.statusMessage = `Stage ${this.stage} 클리어!`;
    } else if (state === "TIMEOUT") {
      this.statusMessage = "시간이 다 됐어요. 다시 도전해 보세요.";
    } else if (state === "GAME_OVER") {
      this.statusMessage = "목숨을 모두 잃었어요. 다시 시작해 보세요.";
    }
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
