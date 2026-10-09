export const COLORS = [
  { id: "RED", name: "빨강", hex: "#ee514b" },
  { id: "ORANGE", name: "주황", hex: "#f28c38" },
  { id: "YELLOW", name: "노랑", hex: "#e9c743" },
  { id: "GREEN", name: "초록", hex: "#56a66b" },
  { id: "BLUE", name: "파랑", hex: "#438bd1" },
  { id: "INDIGO", name: "남색", hex: "#595db7" },
  { id: "VIOLET", name: "보라", hex: "#a363bd" }
];

export const TARGET_COLOR_ID = "RED";
export const UMBRELLA_REWARD_INTERVAL = 3;
export const TUTORIAL_STORAGE_KEY = "paint-catcher-tutorial-completed";
export const SOUND_CONFIG = {
  muteStorageKey: "paint-catcher-muted",
  masterVolume: 0.22,
  maxConcurrentEffects: 4,
  effectVolumes: {
    paintCollect: 1.12,
    paintSplash: 0.88,
    umbrellaBlock: 1,
    umbrella: 1,
    fever: 1,
    stageClear: 1,
    gameOver: 1
  },
  melody: {
    frequencies: [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 523.25],
    continuationWindow: 3,
    maxCrescendo: 1.18
  },
  music: {
    volume: 0.24,
    crossfadeDuration: 0.22,
    schedulerInterval: 25,
    scheduleAhead: 0.12,
    normal: {
      bpm: 102,
      notes: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 261.63, 329.63, 392, 329.63, 220, 293.66, 349.23, 293.66],
      bass: [130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196, 196]
    },
    fever: {
      bpm: 152,
      notes: [392, 493.88, 587.33, 493.88, 440, 523.25, 659.25, 523.25, 392, 493.88, 587.33, 659.25, 440, 523.25, 659.25, 783.99],
      bass: [130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196, 196]
    }
  }
};

export const GAME_CONFIG = {
  gravity: 520,
  initialFallSpeed: { min: 25, max: 85 },
  paintRadius: { min: 13, max: 19 },
  spawnInterval: 0.85,
  firstSpawnDelay: 0.45,
  paintSpawn: {
    minBatchSize: 2,
    maxBatchSize: 4,
    sequenceInterval: 0.18,
    minimumHorizontalSpacing: 56,
    targetChance: {
      stage1: 0.45,
      stages2To5: 0.4,
      stage6Plus: 0.35,
      minimum: 0.35
    },
    targetGuaranteeInterval: 3,
    batchWeights: {
      stage1: [0.76, 0.2, 0.04],
      stages2To5: [0.45, 0.4, 0.15],
      stage6Plus: [0.2, 0.4, 0.4]
    }
  },
  initialLives: 3,
  stageDuration: 90,
  paintsPerStage: 5,
  maxUmbrellas: 3,
  umbrellaDuration: 8,
  maxFeverCards: 1,
  feverDuration: 5,
  fever: {
    spawnMultiplier: 2,
    spawnRateAdjustment: 1.2,
    fallSpeedMultiplier: 1.3,
    fallSpeedAdjustment: 1.5,
    maxBatchSize: 8,
    maxActivePaints: 24
  },
  fallSpeed: {
    baseMultiplier: 1.2,
    stageMultipliers: [1, 1.15, 1.3, 1.5, 1.75, 2, 2.2, 2.4],
    stageStep: 0.15,
    maxMultiplier: 3
  },
  umbrellaWidth: 156,
  umbrellaCanopyHeight: 22,
  umbrellaSurfaceOffset: 22,
  umbrellaOpenDuration: 0.24,
  feverVfx: {
    maxParticles: 72,
    startParticleCount: 42,
    collectParticleCount: 8,
    particleLifetime: { min: 0.65, max: 1.3 },
    flashDuration: 0.2,
    titleDuration: 0.95,
    glowStrength: 0.2,
    fadeDuration: 1
  },
  paintExplosion: {
    duration: 0.5,
    maxParticles: 24,
    maxActive: 4,
    spreadSpeed: 230,
    gravity: 420,
    shockwaveRadius: 78,
    shockwaveDuration: 0.36,
    playerFlashDuration: 0.22
  },
  paintAssetsPath: "../assets/paint/",
  paintFrameCount: 8,
  fallAnimationFps: 10,
  splashAnimationFps: 14,
  paintSpriteSize: 64,
  playerWidth: 132,
  playerHeight: 31,
  playerBottomOffset: 30,
  playerSpeed: 470,
  maxDeltaTime: 0.05
};
