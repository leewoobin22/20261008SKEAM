import { COLORS, GAME_CONFIG, TUTORIAL_STORAGE_KEY } from "./config.js";
import { Game } from "./game.js";
import { loadPaintSprites, Renderer } from "./renderer.js";
import { Sound } from "./sound.js";

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
const soundToggle = document.querySelector("#sound-toggle");
const tutorialPanel = document.querySelector("#tutorial-panel");
const tutorialSkip = document.querySelector("#tutorial-skip");
const tutorialStep = document.querySelector("#tutorial-step");
const tutorialTitle = document.querySelector("#tutorial-title");
const tutorialCopy = document.querySelector("#tutorial-copy");
const tutorialAction = document.querySelector("#tutorial-action");
const tutorialRules = document.querySelector("#tutorial-rules");
const tutorialStart = document.querySelector("#tutorial-start");
const tutorialReplay = document.querySelector("#tutorial-replay");
const helpButton = document.querySelector("#help-button");
const helpDialog = document.querySelector("#help-dialog");
const helpClose = document.querySelector("#help-close");
const helpTutorial = document.querySelector("#help-tutorial");
const game = new Game();
const renderer = new Renderer(canvas);
const sound = new Sound();
let previousTime = 0;
let displayedState = null;
let lastSoundGameState = game.state;
let assetsLoaded = false;
let supportsTouchControls = false;
let helpPausedState = null;

function hasCompletedTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
  } catch (error) {
    console.warn("튜토리얼 완료 설정을 읽을 수 없어 첫 방문 튜토리얼을 표시합니다.", error);
    return false;
  }
}

function saveTutorialCompletion() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  } catch (error) {
    console.warn("튜토리얼 완료 설정을 저장할 수 없습니다.", error);
  }
}

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
  playPendingSounds();
  syncUi();
  renderer.render(game);
  requestAnimationFrame(frame);
}

function updateTutorialPanel(tutorial) {
  const content = [
    null,
    {
      title: "그릇을 움직여 떨어지는 물감을 받아보세요!",
      copy: "실제로 그릇을 움직이면 다음 단계로 넘어가요.",
      action: supportsTouchControls ? "손가락으로 좌우 드래그" : "방향키 또는 마우스로 그릇 이동"
    },
    {
      title: "목표 색깔의 물감을 받으면 점수를 얻어요!",
      copy: `목표 색 ${game.targetColor.id} 물감을 그릇으로 받아보세요.`,
      action: "떨어지는 목표 색 물감을 기다려 주세요."
    },
    {
      title: "다른 색 물감을 받으면 생명을 잃어요. 피해보세요!",
      copy: "이번에는 오답 물감이 바닥으로 떨어질 때까지 피하세요.",
      action: "실수해도 튜토리얼에서는 생명이 줄지 않아요."
    },
    {
      title: "우산을 사용하면 잘못된 색깔의 물감을 막을 수 있어요!",
      copy: "우산을 펼친 뒤 다가오는 오답 물감을 막아보세요.",
      action: supportsTouchControls ? "화면을 위로 밀어 우산 사용" : "Space 키로 우산 사용"
    },
    {
      title: "피버타임에는 목표 색깔의 물감이 빠르게 쏟아져요!",
      copy: "피버카드를 사용하고 5초 동안 목표 물감을 받아보세요.",
      action: supportsTouchControls ? "화면을 빠르게 두 번 터치해 사용" : "F 키로 피버타임 사용"
    },
    {
      title: "준비됐나요? 목표 색깔을 모아 스테이지를 클리어하세요!",
      copy: "게임 규칙을 확인하고 스테이지 1을 시작하세요.",
      action: ""
    }
  ][tutorial.step];
  if (!content) return;
  tutorialStep.textContent = `${tutorial.step} / 6`;
  tutorialTitle.textContent = content.title;
  tutorialCopy.textContent = content.copy;
  tutorialAction.textContent = content.action;
  tutorialAction.hidden = !content.action;
  tutorialRules.hidden = tutorial.step !== 6;
  tutorialStart.hidden = tutorial.step !== 6;
}

function syncUi() {
  const target = game.targetColor;
  const tutorial = game.tutorialActive ? game.tutorial : null;
  const visibleStage = tutorial ? 1 : game.stage;
  const visibleCollected = tutorial ? 0 : game.collectedCount;
  const visibleTargetCount = tutorial ? GAME_CONFIG.paintsPerStage : game.targetCount;
  const visibleTime = tutorial ? GAME_CONFIG.stageDuration : game.remainingTime;
  const visibleLives = tutorial ? GAME_CONFIG.initialLives : game.lives;
  const visibleUmbrellas = tutorial ? tutorial.umbrellaCount : game.umbrellaCount;
  const visibleFeverCards = tutorial ? tutorial.feverCardCount : game.feverCardCount;
  stageNumber.textContent = String(visibleStage).padStart(2, "0");
  document.querySelector("#target-name").textContent = `${target.id} · ${target.name}`;
  targetSwatch.style.backgroundColor = target.hex;
  collectedCount.textContent = String(visibleCollected);
  targetCount.textContent = String(visibleTargetCount);
  remainingTime.textContent = formatTime(visibleTime);
  remainingTime.classList.toggle("is-low", visibleTime <= 10);
  livesDisplay.setAttribute("aria-label", `목숨 ${visibleLives}개`);
  hearts.forEach((heart, index) => heart.classList.toggle("is-lost", index >= visibleLives));
  umbrellaCount.textContent = String(visibleUmbrellas);
  umbrellaDisplay.setAttribute("aria-label", `우산 ${visibleUmbrellas}개${game.umbrellaActive ? `, 활성 ${game.umbrellaRemainingTime.toFixed(1)}초` : ""}`);
  umbrellaTimer.hidden = !game.umbrellaActive;
  umbrellaTimer.textContent = game.umbrellaActive ? `${game.umbrellaRemainingTime.toFixed(1)}s` : "";
  umbrellaDisplay.classList.toggle("is-active", game.umbrellaActive);
  feverCardCount.textContent = String(visibleFeverCards);
  feverCardDisplay.setAttribute("aria-label", `피버타임 카드 ${visibleFeverCards}장${game.feverActive ? `, 활성 ${game.feverRemainingTime.toFixed(1)}초` : ""}`);
  feverTimer.hidden = !game.feverActive;
  feverTimer.textContent = game.feverActive ? `${game.feverRemainingTime.toFixed(1)}s` : "";
  feverCardDisplay.classList.toggle("is-active", game.feverActive);
  feverBanner.hidden = !game.feverActive;
  feverBannerTimer.textContent = game.feverActive ? `${game.feverRemainingTime.toFixed(1)}s` : "";
  canvas.parentElement.classList.toggle("fever-active", game.feverActive);
  canvas.closest(".game-card").classList.toggle("fever-active", game.feverActive);
  feedback.textContent = game.statusMessage;
  soundToggle.setAttribute("aria-pressed", String(sound.enabled));
  soundToggle.setAttribute("aria-label", sound.enabled ? "사운드 끄기" : "사운드 켜기");
  soundToggle.textContent = sound.enabled ? "♫ 사운드 켜짐" : "♫ 사운드 꺼짐";
  tutorialPanel.hidden = !tutorial;
  canvas.parentElement.classList.toggle("tutorial-active", Boolean(tutorial));
  tutorialReplay.hidden = !["MENU", "GAME_OVER", "TIMEOUT"].includes(game.state);
  if (tutorial) updateTutorialPanel(tutorial);

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
      gameStatus.textContent = game.state === "TUTORIAL"
        ? "TUTORIAL"
        : game.state === "PAUSED"
          ? "PAUSED"
          : "PLAYING";
      statusDot.style.backgroundColor = game.state === "PAUSED" ? "#aaa497" : "#76a877";
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

function playPendingSounds() {
  if (game.state !== lastSoundGameState) {
    sound.stopAll();
    lastSoundGameState = game.state;
  }
  if (document.hidden || game.state === "PAUSED") {
    sound.pauseMusic();
  } else if (game.state === "PLAYING" || game.state === "TUTORIAL") {
    sound.resumeMusic();
    sound.setMusicMode(game.feverActive ? "fever" : "normal");
  } else {
    sound.stopMusic();
  }
  for (const soundEvent of game.takeSoundEvents()) sound.play(soundEvent);
}

function useUmbrella() {
  game.useUmbrella();
  playPendingSounds();
}

function useFever() {
  game.useFever();
  playPendingSounds();
}

startButton.addEventListener("click", () => {
  sound.unlock();
  if (!assetsLoaded) return;
  if (game.state === "MENU") game.start();
  else if (game.state === "STAGE_CLEAR") game.nextStage();
  else if (game.state === "TIMEOUT") game.retryStage();
  else if (game.state === "GAME_OVER") game.restartGame();
  syncUi();
  canvas.focus({ preventScroll: true });
});

function finishTutorial() {
  if (!assetsLoaded || !game.tutorialActive) return;
  saveTutorialCompletion();
  sound.stopAll();
  game.finishTutorial();
  playPendingSounds();
  syncUi();
  canvas.focus({ preventScroll: true });
}

function openHelp() {
  if (helpDialog.open) return;
  helpPausedState = game.state;
  game.state = "PAUSED";
  game.setDirection("left", false);
  game.setDirection("right", false);
  activeTouchPointer = null;
  lastTapAt = null;
  helpDialog.showModal();
  playPendingSounds();
  syncUi();
  helpClose.focus();
}

function closeHelp() {
  if (!helpDialog.open) return;
  helpDialog.close();
  restoreAfterHelp();
}

function restoreAfterHelp() {
  if (helpPausedState === null) return;
  game.state = helpPausedState;
  helpPausedState = null;
  playPendingSounds();
  syncUi();
}

function restartTutorialFromHelp() {
  if (!assetsLoaded) return;
  sound.unlock();
  const previousState = helpPausedState;
  const isLiveGame = previousState === "PLAYING";
  const isRunningTutorial = previousState === "TUTORIAL";
  if (isLiveGame && !window.confirm(
    "튜토리얼을 다시 시작하면 현재 게임 진행 상황이 초기화됩니다. 계속할까요?"
  )) return;

  closeHelp();
  sound.stopAll();
  const started = game.startTutorial({ force: isLiveGame || isRunningTutorial });
  if (!started) {
    throw new Error("현재 게임 상태에서 튜토리얼을 다시 시작할 수 없습니다.");
  }
  helpPausedState = null;
  activeTouchPointer = null;
  lastTapAt = null;
  playPendingSounds();
  syncUi();
  canvas.focus({ preventScroll: true });
}

helpButton.addEventListener("click", openHelp);
helpClose.addEventListener("click", closeHelp);
helpDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeHelp();
});
helpTutorial.addEventListener("click", restartTutorialFromHelp);

tutorialSkip.addEventListener("click", () => {
  sound.unlock();
  finishTutorial();
});

tutorialStart.addEventListener("click", () => {
  sound.unlock();
  finishTutorial();
});

tutorialReplay.addEventListener("click", () => {
  sound.unlock();
  if (!assetsLoaded || !["MENU", "GAME_OVER", "TIMEOUT"].includes(game.state)) return;
  sound.stopAll();
  game.startTutorial();
  syncUi();
});

soundToggle.addEventListener("click", () => {
  sound.toggle();
  syncUi();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    sound.stopAll();
    sound.pauseMusic();
  } else {
    sound.resumeIfNeeded();
    if (game.state === "PLAYING" || game.state === "TUTORIAL") {
      sound.resumeMusic();
      sound.setMusicMode(game.feverActive ? "fever" : "normal");
    }
  }
});

startButton.disabled = true;
tutorialReplay.disabled = true;
overlayCopy.textContent = "물감 그림을 준비하고 있어요...";
loadPaintSprites().then(({ sprites, failedCount }) => {
  renderer.setSprites(sprites);
  assetsLoaded = true;
  startButton.disabled = false;
  tutorialReplay.disabled = false;
  overlayCopy.textContent = "목표 색 물감을 모아 스테이지를 클리어하세요.";
  if (!hasCompletedTutorial()) game.startTutorial();
  syncUi();
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
  supportsTouchControls = navigator.maxTouchPoints > 0
    || window.matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("touch-controls", supportsTouchControls);
  syncUi();
}

const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
updateTouchControls();
coarsePointerQuery.addEventListener("change", updateTouchControls);

canvas.addEventListener("pointermove", (event) => {
  if (helpDialog.open) return;
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
  if (game.state === "TUTORIAL" && game.tutorial.step === 1
    && event.movementX === 0 && event.movementY === 0) return;
  game.setPointerPosition(getCanvasX(event));
});

canvas.addEventListener("pointerdown", (event) => {
  if (helpDialog.open) return;
  if (event.pointerType === "touch") {
    event.preventDefault();
    sound.unlock();
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
  sound.unlock();
  game.setPointerPosition(getCanvasX(event));
});

canvas.addEventListener("pointerup", (event) => {
  if (helpDialog.open) return;
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
    const feverTutorialStep = game.state === "TUTORIAL" && game.tutorial?.step === 5;
    const canUseFever = game.state === "PLAYING" || feverTutorialStep;
    if (canUseFever && lastTapAt !== null && startTime - lastTapAt <= maxTapDuration) {
      useFever();
      lastTapAt = null;
    } else {
      lastTapAt = canUseFever ? event.timeStamp : null;
    }
    return;
  }

  lastTapAt = null;
  if (deltaY <= -minSwipeUpDistance && Math.abs(deltaY) > Math.abs(deltaX)) {
    useUmbrella();
  }
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerType !== "touch" || !activeTouchPointer || event.pointerId !== activeTouchPointer.pointerId) return;
  activeTouchPointer = null;
  lastTapAt = null;
});

window.addEventListener("keydown", (event) => {
  if (helpDialog.open) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeHelp();
    }
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.code === "Space") {
    event.preventDefault();
  }
  if (event.repeat) return;
  sound.unlock();
  if (event.key === "ArrowLeft") game.setDirection("left", true);
  if (event.key === "ArrowRight") game.setDirection("right", true);
  if (event.code === "Space") useUmbrella();
  if (event.key.toLowerCase() === "f") useFever();
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
