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

export const GAME_CONFIG = {
  gravity: 520,
  initialFallSpeed: { min: 25, max: 85 },
  paintRadius: { min: 13, max: 19 },
  spawnInterval: 0.85,
  firstSpawnDelay: 0.45,
  initialLives: 3,
  stageDuration: 90,
  paintsPerStage: 5,
  playerWidth: 132,
  playerHeight: 31,
  playerBottomOffset: 30,
  playerSpeed: 470,
  maxDeltaTime: 0.05
};
