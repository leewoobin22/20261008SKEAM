import { COLORS, GAME_CONFIG } from "./config.js";
import { Game } from "./game.js";
import { loadPaintSprites, Renderer } from "./renderer.js";

const canvas = document.querySelector("#game-canvas");
const overlay = document.querySelector("#start-overlay");
const startButton = document.querySelector("#start-button");
const overlayIcon = document.querySelector("#overlay-icon");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const collectedCount = document.querySelector("#collected-count");
const feedback = document.querySelector("#feedback");
const stageNumber = document.querySelector("#stage-number");
const targetCount = document.querySelector("#target-count");
const remainingTime = document.querySelector("#remaining-time");
const livesDisplay = document.querySelector("#lives-display");
const hearts = [...livesDisplay.querySelectorAll(".life-heart")];
const targetSwatch = document.querySelector(".target-swatch");
const gameStatus = document.querySelector("#game-status");
const statusDot = document.querySelector("#status-dot");
const umbrellaDisplay = document.querySelector("#umbrella-display");
const umbrellaCount = document.querySelector("#umbrella-count");
const umbrellaTimer = document.querySelector("#umbrella-timer");
const feverCardDisplay = document.querySelector("#fever-card-display");
const feverCardCount = document.querySelector("#fever-card-count");
const feverTimer = document.querySelector("#fever-timer");
const feverBanner = document.querySelector("#fever-banner");
const feverBannerTimer = document.querySelector("#fever-banner-timer");
const game = new Game();
const renderer = new Renderer(canvas);
let previousTime = 0;
let displayedState = null;
let assetsLoaded = false;

const overlayContent = {
  MENU: {
    icon: "↓",
    kicker: "READY WHEN YOU ARE",
    title: "물감을 받아 볼까요?",
    copy: "목표 색 물감을 모아 스테이지를 클리어하세요.",
    button: "게임 시작"
  },
  STAGE_CLEAR: {
    icon: "✓",
    kicker: "STAGE COMPLETE",
    title: `Stage ${game.stage} 클리어!`,
    copy: `${game.targetColor.name} 물감 ${game.targetCount}개를 모두 모았어요.`,
    button: "다음 스테이지"
  },
  TIMEOUT: {
    icon: "↻",
    kicker: "TIME'S UP",
    title: "시간이 다 됐어요",
    copy: `Stage ${game.stage}에서 다시 도전해 보세요.`,
    button: "다시 도전"
  },
  GAME_OVER: {
    icon: "!",
    kicker: "GAME OVER",
    title: `Stage ${game.stage} 다시 도전!`,
    copy: `Stage ${game.stage}에서 다시 도전해 보세요.`,
    button: "현재 스테이지 다시 시작"
  }
};

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;
  game.resize(bounds.width, bounds.height);
  renderer.resize(bounds.width, bounds.height);
  renderer.render(game);
}

function frame(timestamp) {
  const elapsed = previousTime === 0 ? 0 : (timestamp - previousTime) / 1000;
  previousTime = timestamp;
  game.update(Math.min(elapsed, GAME_CONFIG.maxDeltaTime));
  syncUi();
  renderer.render(game);
  requestAnimationFrame(frame);
}

function syncUi() {
  const target = game.targetColor;
  stageNumber.textContent = String(game.stage).padStart(2, "0");
  document.querySelector("#target-name").textContent = `${target.id} · ${target.name}`;
  targetSwatch.style.backgroundColor = target.hex;
  collectedCount.textContent = String(game.collectedCount);
  targetCount.textContent = String(game.targetCount);
  remainingTime.textContent = formatTime(game.remainingTime);
  remainingTime.classList.toggle("is-low", game.remainingTime <= 10);
  livesDisplay.setAttribute("aria-label", `목숨 ${game.lives}개`);
  hearts.forEach((heart, index) => heart.classList.toggle("is-lost", index >= game.lives));
  umbrellaCount.textContent = String(game.umbrellaCount);
  umbrellaDisplay.setAttribute("aria-label", `우산 ${game.umbrellaCount}개${game.umbrellaActive ? `, 활성 ${game.umbrellaRemainingTime.toFixed(1)}초` : ""}`);
  umbrellaTimer.hidden = !game.umbrellaActive;
  umbrellaTimer.textContent = game.umbrellaActive ? `${game.umbrellaRemainingTime.toFixed(1)}s` : "";
  umbrellaDisplay.classList.toggle("is-active", game.umbrellaActive);
  feverCardCount.textContent = String(game.feverCardCount);
  feverCardDisplay.setAttribute("aria-label", `피버타임 카드 ${game.feverCardCount}장${game.feverActive ? `, 활성 ${game.feverRemainingTime.toFixed(1)}초` : ""}`);
  feverTimer.hidden = !game.feverActive;
  feverTimer.textContent = game.feverActive ? `${game.feverRemainingTime.toFixed(1)}s` : "";
  feverCardDisplay.classList.toggle("is-active", game.feverActive);
  feverBanner.hidden = !game.feverActive;
  feverBannerTimer.textContent = game.feverActive ? `${game.feverRemainingTime.toFixed(1)}s` : "";
  canvas.parentElement.classList.toggle("fever-active", game.feverActive);
  feedback.textContent = game.statusMessage;

  if (displayedState !== game.state) {
    displayedState = game.state;
    const content = overlayContent[game.state];
    if (content) {
      overlayIcon.textContent = content.icon;
      overlayKicker.textContent = content.kicker;
      overlayTitle.textContent = game.state === "STAGE_CLEAR"
        ? `Stage ${game.stage} 클리어!`
        : game.state === "GAME_OVER"
          ? `Stage ${game.stage} 다시 도전!`
          : content.title;
      overlayCopy.textContent = game.state === "STAGE_CLEAR"
        ? game.perfectClear
          ? `${game.targetColor.name} 물감 ${game.targetCount}개를 모두 모았어요. 다음 스테이지에서 피버타임 카드 1장을 받아요!`
          : `${game.targetColor.name} 물감 ${game.targetCount}개를 모두 모았어요.`
        : game.state === "GAME_OVER"
          ? `Stage ${game.stage}부터 다시 시작합니다.`
          : content.copy;
      overlayKicker.textContent = game.state === "STAGE_CLEAR" && game.perfectClear
        ? "PERFECT CLEAR!"
        : content.kicker;
      startButton.innerHTML = `${content.button} ${game.state === "GAME_OVER" ? "" : '<span aria-hidden="true">→</span>'}`;
      const waitingForLastExplosion = game.state === "GAME_OVER" && game.paintExplosions.length > 0;
      overlay.classList.toggle("is-hidden", waitingForLastExplosion);
      gameStatus.textContent = overlayKicker.textContent;
      statusDot.style.backgroundColor = "#ed6545";
    } else {
      overlay.classList.add("is-hidden");
      gameStatus.textContent = "PLAYING";
      statusDot.style.backgroundColor = "#76a877";
    }
  }
  if (game.state === "GAME_OVER" && game.paintExplosions.length === 0) {
    overlay.classList.remove("is-hidden");
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.ceil(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getCanvasX(event) {
  const bounds = canvas.getBoundingClientRect();
  return event.clientX - bounds.left;
}

startButton.addEventListener("click", () => {
  if (!assetsLoaded) return;
  if (game.state === "MENU") game.start();
  else if (game.state === "STAGE_CLEAR") game.nextStage();
  else if (game.state === "TIMEOUT") game.retryStage();
  else if (game.state === "GAME_OVER") game.restartGame();
  syncUi();
  canvas.focus({ preventScroll: true });
});

startButton.disabled = true;
overlayCopy.textContent = "물감 그림을 준비하고 있어요...";
loadPaintSprites().then(({ sprites, failedCount }) => {
  renderer.setSprites(sprites);
  assetsLoaded = true;
  startButton.disabled = false;
  overlayCopy.textContent = "목표 색 물감을 모아 스테이지를 클리어하세요.";
  if (failedCount > 0) {
    console.error(`${failedCount}개 물감 이미지 로드에 실패해 Canvas 도형으로 대신 표시합니다.`);
    feedback.textContent = "일부 물감 이미지를 불러오지 못해 기본 그림으로 표시합니다.";
  }
});

const maxTapDuration = 300;
const maxTapMovement = 15;
const minSwipeUpDistance = 60;
let activeTouchPointer = null;
let lastTapAt = null;

function updateTouchControls() {
  const supportsTouch = navigator.maxTouchPoints > 0
    || window.matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("touch-controls", supportsTouch);
}

const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
updateTouchControls();
coarsePointerQuery.addEventListener("change", updateTouchControls);

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") {
    if (!activeTouchPointer || event.pointerId !== activeTouchPointer.pointerId) return;
    const deltaX = event.clientX - activeTouchPointer.startX;
    const deltaY = event.clientY - activeTouchPointer.startY;
    if (Math.hypot(deltaX, deltaY) > maxTapMovement) lastTapAt = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      game.setPointerPosition(getCanvasX(event));
    }
    return;
  }
  game.setPointerPosition(getCanvasX(event));
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") {
    event.preventDefault();
    if (activeTouchPointer) return;
    if (lastTapAt !== null && event.timeStamp - lastTapAt > maxTapDuration) lastTapAt = null;
    activeTouchPointer = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp
    };
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  game.setPointerPosition(getCanvasX(event));
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch" || !activeTouchPointer || event.pointerId !== activeTouchPointer.pointerId) return;
  event.preventDefault();

  const { startX, startY, startTime } = activeTouchPointer;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
  const duration = event.timeStamp - startTime;
  const isTap = Math.hypot(deltaX, deltaY) <= maxTapMovement && duration <= maxTapDuration;
  activeTouchPointer = null;

  if (isTap) {
    game.setPointerPosition(getCanvasX(event));
    if (game.state === "PLAYING" && lastTapAt !== null && startTime - lastTapAt <= maxTapDuration) {
      game.useFever();
      lastTapAt = null;
    } else {
      lastTapAt = game.state === "PLAYING" ? event.timeStamp : null;
    }
    return;
  }

  lastTapAt = null;
  if (deltaY <= -minSwipeUpDistance && Math.abs(deltaY) > Math.abs(deltaX)) {
    game.useUmbrella();
  }
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerType !== "touch" || !activeTouchPointer || event.pointerId !== activeTouchPointer.pointerId) return;
  activeTouchPointer = null;
  lastTapAt = null;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.code === "Space") {
    event.preventDefault();
  }
  if (event.repeat) return;
  if (event.key === "ArrowLeft") game.setDirection("left", true);
  if (event.key === "ArrowRight") game.setDirection("right", true);
  if (event.code === "Space") game.useUmbrella();
  if (event.key.toLowerCase() === "f") game.useFever();
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") game.setDirection("left", false);
  if (event.key === "ArrowRight") game.setDirection("right", false);
});

window.addEventListener("blur", () => {
  game.setDirection("left", false);
  game.setDirection("right", false);
});

if ("ResizeObserver" in window) {
  new ResizeObserver(resizeCanvas).observe(canvas);
} else {
  window.addEventListener("resize", resizeCanvas);
}

const target = COLORS.find((color) => color.id === game.targetColor.id);
document.querySelector("#target-name").textContent = `${target.id} · ${target.name}`;
resizeCanvas();
syncUi();
requestAnimationFrame(frame);
