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
export const SOUND_CONFIG = {
  muteStorageKey: "paint-catcher-muted",
  masterVolume: 0.18,
  maxConcurrentEffects: 4
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
  fallSpeed: {
    baseMultiplier: 1.2,
    stageStep: 0.12,
    maxMultiplier: 2.5
  },
  umbrellaWidth: 156,
  umbrellaCanopyHeight: 22,
  umbrellaSurfaceOffset: 22,
  umbrellaOpenDuration: 0.24,
  feverVfx: {
    maxParticles: 72,
    particleLifetime: { min: 0.65, max: 1.3 },
    flashDuration: 0.2,
    titleDuration: 0.95,
    glowStrength: 0.2,
    fadeDuration: 0.4
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
