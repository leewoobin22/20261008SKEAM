import { COLORS, GAME_CONFIG } from "./config.js";

export async function loadPaintSprites() {
  const sprites = new Map();
  const requests = [];

  for (const color of COLORS) {
    for (const animation of ["fall", "splash"]) {
      for (let frame = 1; frame <= GAME_CONFIG.paintFrameCount; frame += 1) {
        const key = spriteKey(color.id, animation, frame - 1);
        const fileName = `${animation}_${String(frame).padStart(2, "0")}.png`;
        const url = new URL(
          `${GAME_CONFIG.paintAssetsPath}${color.id.toLowerCase()}/${fileName}`,
          import.meta.url
        );
        requests.push(loadImage(url).then((image) => {
          sprites.set(key, image);
        }));
      }
    }
  }

  await Promise.all(requests);
  return {
    sprites,
    failedCount: [...sprites.values()].filter((image) => image === null).length
  };
}

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url.href;
  });
}

function spriteKey(colorId, animation, frame) {
  return `${colorId}:${animation}:${frame}`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) throw new Error("이 브라우저에서는 Canvas 렌더링을 사용할 수 없습니다.");
    this.width = 0;
    this.height = 0;
    this.sprites = new Map();
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  resize(width, height) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  render(game) {
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    this.drawBackground(context, game);
    for (const paint of game.paints) {
      this.drawPaint(context, paint);
      if (game.feverActive && paint.animation !== "splash") this.drawFeverSparkles(context, game, paint);
    }
    this.drawPaintExplosions(context, game.paintExplosions);
    this.drawPlayer(context, game.player, game.playerHitFlashRemaining);
    if (game.umbrellaActive) {
      this.drawUmbrella(context, game.player, game.getUmbrellaOpenProgress());
      this.drawUmbrellaImpacts(context, game.umbrellaImpacts);
    }
    if (game.feedback) this.drawFeedback(context, game.feedback);
    this.drawFeverEffects(context, game);
  }

  drawBackground(context, game) {
    const gradient = context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "rgba(255, 253, 247, 0.08)");
    gradient.addColorStop(1, "rgba(235, 226, 208, 0.19)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
    const feverFade = game.feverActive
      ? Math.min(1, game.feverRemainingTime)
      : game.feverFadeRemaining / GAME_CONFIG.feverVfx.fadeDuration;
    if (feverFade > 0) {
      const pulse = 0.82 + Math.sin(game.effectTime * 3.2) * 0.18;
      const glow = context.createRadialGradient(
        this.width / 2,
        this.height / 2,
        this.height * 0.18,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.72
      );
      glow.addColorStop(0, `${game.targetColor.hex}00`);
      glow.addColorStop(1, hexToRgba(
        game.feverActive ? game.targetColor.hex : game.feverFadeColor,
        GAME_CONFIG.feverVfx.glowStrength * feverFade * pulse
      ));
      context.fillStyle = glow;
      context.fillRect(0, 0, this.width, this.height);
    }
    if (game.feverFlashRemaining > 0) {
      context.fillStyle = `rgba(255, 255, 255, ${game.feverFlashRemaining / GAME_CONFIG.feverVfx.flashDuration * 0.72})`;
      context.fillRect(0, 0, this.width, this.height);
    }
  }

  drawPaint(context, paint) {
    const color = COLORS.find((item) => item.id === paint.colorId);
    const isSplash = paint.animation === "splash";
    const fps = isSplash ? GAME_CONFIG.splashAnimationFps : GAME_CONFIG.fallAnimationFps;
    const frame = Math.min(GAME_CONFIG.paintFrameCount - 1, Math.floor(paint.animationElapsed * fps));
    const sprite = this.sprites.get(spriteKey(paint.colorId, paint.animation, frame));
    if (sprite?.complete && sprite.naturalWidth > 0) {
      const size = GAME_CONFIG.paintSpriteSize;
      context.drawImage(sprite, paint.x - size / 2, paint.y - size / 2, size, size);
      return;
    }

    if (isSplash) {
      this.drawFallbackSplash(context, paint, color, frame);
      return;
    }

    this.drawFallbackPaint(context, paint, color);
  }

  drawFallbackPaint(context, paint, color) {
    context.save();
    context.shadowColor = `${color.hex}55`;
    context.shadowBlur = 12;
    context.shadowOffsetY = 4;
    context.beginPath();
    context.arc(paint.x, paint.y, paint.radius, 0, Math.PI * 2);
    context.fillStyle = color.hex;
    context.fill();
    context.shadowColor = "transparent";
    context.beginPath();
    context.arc(paint.x - paint.radius * 0.3, paint.y - paint.radius * 0.34, paint.radius * 0.27, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.58)";
    context.fill();
    context.restore();
  }

  drawFallbackSplash(context, paint, color, frame) {
    const progress = frame / (GAME_CONFIG.paintFrameCount - 1);
    context.save();
    context.globalAlpha = Math.max(0.12, 1 - progress * 0.78);
    context.strokeStyle = color.hex;
    context.lineWidth = 3;
    for (let drop = 0; drop < 6; drop += 1) {
      const angle = (Math.PI * 2 * drop) / 6;
      const start = 4 + progress * 8;
      const end = start + 5 + progress * 15;
      context.beginPath();
      context.moveTo(paint.x + Math.cos(angle) * start, paint.y + Math.sin(angle) * start);
      context.lineTo(paint.x + Math.cos(angle) * end, paint.y + Math.sin(angle) * end);
      context.stroke();
    }
    context.beginPath();
    context.arc(paint.x, paint.y, Math.max(2, paint.radius * (1 - progress)), 0, Math.PI * 2);
    context.fillStyle = color.hex;
    context.fill();
    context.restore();
  }

  drawPlayer(context, player, hitFlashRemaining = 0) {
    const left = player.x - player.width / 2;
    const right = player.x + player.width / 2;
    const bottom = player.y + player.height;
    const flashProgress = hitFlashRemaining / GAME_CONFIG.paintExplosion.playerFlashDuration;
    const shake = flashProgress > 0 ? Math.sin((1 - flashProgress) * 42) * 1.5 : 0;
    context.save();
    context.translate(shake, 0);
    context.shadowColor = "rgba(42, 37, 28, .12)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    context.beginPath();
    context.moveTo(left, player.y);
    context.quadraticCurveTo(player.x, player.y + 14, right, player.y);
    context.lineTo(right - 9, bottom - 3);
    context.quadraticCurveTo(player.x, bottom + 8, left + 9, bottom - 3);
    context.closePath();
    const gradient = context.createLinearGradient(0, player.y, 0, bottom);
    gradient.addColorStop(0, flashProgress > 0.05 ? "#ef8179" : "#45413b");
    gradient.addColorStop(1, flashProgress > 0.05 ? "#a92f32" : "#25231f");
    context.fillStyle = gradient;
    context.fill();
    context.shadowColor = "transparent";
    context.beginPath();
    context.moveTo(left + 2, player.y + 1);
    context.quadraticCurveTo(player.x, player.y + 15, right - 2, player.y + 1);
    context.strokeStyle = "#f8f4eb";
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  }

  drawPaintExplosions(context, explosions) {
    const config = GAME_CONFIG.paintExplosion;
    for (const explosion of explosions) {
      const progress = Math.min(1, explosion.elapsed / explosion.duration);
      const fade = 1 - progress;
      const burstProgress = Math.min(1, progress / 0.28);
      context.save();
      context.globalAlpha = fade;
      context.fillStyle = explosion.color;
      context.shadowColor = explosion.color;
      context.shadowBlur = 18 * fade;
      context.beginPath();
      context.arc(explosion.x, explosion.y, 4 + burstProgress * 24, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      const waveProgress = Math.min(1, explosion.elapsed / explosion.shockwaveDuration);
      if (waveProgress < 1) {
        context.globalAlpha = (1 - waveProgress) * 0.85;
        context.strokeStyle = explosion.color;
        context.lineWidth = 5 * (1 - waveProgress) + 1;
        context.beginPath();
        context.arc(
          explosion.x,
          explosion.y,
          7 + waveProgress * config.shockwaveRadius,
          0,
          Math.PI * 2
        );
        context.stroke();
      }

      for (const particle of explosion.particles) {
        const particleProgress = Math.min(1, particle.elapsed / explosion.duration);
        const particleFade = 1 - particleProgress;
        if (particleFade <= 0) continue;
        context.save();
        context.globalAlpha = particleFade;
        context.translate(particle.x, particle.y);
        context.rotate(Math.atan2(particle.velocityY, particle.velocityX));
        context.fillStyle = explosion.color;
        context.beginPath();
        context.ellipse(
          0,
          0,
          particle.radius * (0.45 + particleFade * 0.55),
          particle.radius * (0.8 + particleFade * 0.5),
          0,
          0,
          Math.PI * 2
        );
        context.fill();
        context.restore();
      }
      context.restore();
    }
  }

  drawUmbrella(context, player, progress) {
    const halfWidth = GAME_CONFIG.umbrellaWidth / 2 * progress;
    const canopyHeight = GAME_CONFIG.umbrellaCanopyHeight * progress;
    const centerY = player.y - GAME_CONFIG.umbrellaSurfaceOffset;
    context.save();
    context.globalAlpha = progress;
    context.fillStyle = "rgba(67, 139, 209, 0.32)";
    context.strokeStyle = "rgba(45, 111, 178, 0.78)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(player.x - halfWidth, centerY);
    context.quadraticCurveTo(player.x, centerY - canopyHeight * 2, player.x + halfWidth, centerY);
    context.quadraticCurveTo(player.x + halfWidth * 0.82, centerY + 5 * progress, player.x + halfWidth * 0.66, centerY);
    context.quadraticCurveTo(player.x + halfWidth * 0.5, centerY + 7 * progress, player.x + halfWidth * 0.33, centerY);
    context.quadraticCurveTo(player.x + halfWidth * 0.16, centerY + 6 * progress, player.x, centerY);
    context.quadraticCurveTo(player.x - halfWidth * 0.16, centerY + 6 * progress, player.x - halfWidth * 0.33, centerY);
    context.quadraticCurveTo(player.x - halfWidth * 0.5, centerY + 7 * progress, player.x - halfWidth * 0.66, centerY);
    context.quadraticCurveTo(player.x - halfWidth * 0.82, centerY + 5 * progress, player.x - halfWidth, centerY);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(player.x, centerY - canopyHeight);
    context.lineTo(player.x, player.y - 5);
    context.quadraticCurveTo(player.x, player.y + 1, player.x + 6, player.y - 1);
    context.strokeStyle = "#438bd1";
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  }

  drawUmbrellaImpacts(context, impacts) {
    for (const impact of impacts) {
      const progress = 1 - impact.time / 0.32;
      context.save();
      context.globalAlpha = 1 - progress;
      context.strokeStyle = COLORS.find((color) => color.id === impact.colorId).hex;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(impact.x, impact.y, 4 + progress * 12, Math.PI * 0.12, Math.PI * 0.88);
      context.stroke();
      for (let drop = -1; drop <= 1; drop += 1) {
        context.beginPath();
        context.arc(impact.x + drop * (5 + progress * 7), impact.y - progress * (8 + Math.abs(drop) * 4), 1.5, 0, Math.PI * 2);
        context.fillStyle = context.strokeStyle;
        context.fill();
      }
      context.restore();
    }
  }

  drawFeverSparkles(context, game, paint) {
    const pulse = 0.45 + (Math.sin(game.effectTime * 9 + paint.id) + 1) * 0.25;
    context.save();
    context.globalAlpha = pulse * Math.min(1, game.feverRemainingTime);
    context.fillStyle = "#fff9d7";
    for (let index = 0; index < 2; index += 1) {
      const angle = game.effectTime * 2.5 + paint.id * 1.7 + index * Math.PI;
      const x = paint.x + Math.cos(angle) * (paint.radius + 7);
      const y = paint.y + Math.sin(angle) * (paint.radius + 7);
      context.beginPath();
      context.arc(x, y, index === 0 ? 2 : 1.4, 0, Math.PI * 2);
      context.fill();
    }

    if (paint.colorChangeTime > 0) {
      context.strokeStyle = game.targetColor.hex;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(paint.x, paint.y, paint.radius + (0.45 - paint.colorChangeTime) * 28, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  drawFeverEffects(context, game) {
    const hasFeverEffect = game.feverActive || game.feverFlashRemaining > 0
      || game.feverFadeRemaining > 0 || game.feverParticles.length > 0;
    if (!hasFeverEffect) return;
    for (const particle of game.feverParticles) {
      const life = 1 - particle.elapsed / particle.lifetime;
      const fade = game.feverActive ? 1 : game.feverFadeRemaining / GAME_CONFIG.feverVfx.fadeDuration;
      context.save();
      context.globalAlpha = life * fade;
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * (0.5 + life * 0.5), 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    if (game.feverActive && game.feverTitleElapsed < GAME_CONFIG.feverVfx.titleDuration) {
      const progress = game.feverTitleElapsed / GAME_CONFIG.feverVfx.titleDuration;
      const scale = progress < 0.32
        ? 0.45 + (1.28 - 0.45) * progress / 0.32
        : 1.28 - 0.28 * Math.min(1, (progress - 0.32) / 0.68);
      context.save();
      context.globalAlpha = Math.min(1, (1 - progress) * 2.6);
      context.translate(this.width / 2, this.height / 2);
      context.scale(scale, scale);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `800 ${Math.min(48, this.width * 0.105)}px "DM Sans", sans-serif`;
      context.lineWidth = 5;
      context.strokeStyle = "rgba(255,255,255,.9)";
      context.fillStyle = game.targetColor.hex;
      context.shadowColor = game.targetColor.hex;
      context.shadowBlur = 22;
      context.strokeText("FEVER TIME!", 0, 0);
      context.fillText("FEVER TIME!", 0, 0);
      context.restore();
    }
  }

  drawFeedback(context, feedback) {
    context.save();
    context.globalAlpha = Math.min(1, feedback.time * 1.8);
    context.font = '600 13px "DM Sans", "Gowun Dodum", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = feedback.color;
    context.fillText(feedback.text, feedback.x, feedback.y - 17);
    context.restore();
  }
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
