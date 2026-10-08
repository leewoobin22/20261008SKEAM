import { COLORS, GAME_CONFIG } from "./config.js";
import { Game } from "./game.js";
import { Renderer } from "./renderer.js";

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
const game = new Game();
const renderer = new Renderer(canvas);
let previousTime = 0;
let displayedState = null;

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
    title: "아쉽지만 괜찮아요",
    copy: "처음부터 다시 시작할 수 있어요.",
    button: "처음부터 다시"
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
  feedback.textContent = game.statusMessage;

  if (displayedState !== game.state) {
    displayedState = game.state;
    const content = overlayContent[game.state];
    if (content) {
      overlayIcon.textContent = content.icon;
      overlayKicker.textContent = content.kicker;
      overlayTitle.textContent = game.state === "STAGE_CLEAR" ? `Stage ${game.stage} 클리어!` : content.title;
      overlayCopy.textContent = game.state === "STAGE_CLEAR"
        ? `${game.targetColor.name} 물감 ${game.targetCount}개를 모두 모았어요.`
        : content.copy;
      startButton.innerHTML = `${content.button} <span aria-hidden="true">→</span>`;
      overlay.classList.remove("is-hidden");
      gameStatus.textContent = content.kicker;
      statusDot.style.backgroundColor = game.state === "PLAYING" ? "#76a877" : "#ed6545";
    } else {
      overlay.classList.add("is-hidden");
      gameStatus.textContent = "PLAYING";
      statusDot.style.backgroundColor = "#76a877";
    }
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
  if (game.state === "MENU") game.start();
  else if (game.state === "STAGE_CLEAR") game.nextStage();
  else if (game.state === "TIMEOUT") game.retryStage();
  else if (game.state === "GAME_OVER") game.restartGame();
  syncUi();
  canvas.focus({ preventScroll: true });
});

canvas.addEventListener("pointermove", (event) => {
  game.setPointerPosition(getCanvasX(event));
});

canvas.addEventListener("pointerdown", (event) => {
  game.setPointerPosition(getCanvasX(event));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.code === "Space") {
    event.preventDefault();
  }
  if (event.repeat) return;
  if (event.key === "ArrowLeft") game.setDirection("left", true);
  if (event.key === "ArrowRight") game.setDirection("right", true);
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
