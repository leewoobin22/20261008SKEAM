import { COLORS } from "./config.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) throw new Error("이 브라우저에서는 Canvas 렌더링을 사용할 수 없습니다.");
    this.width = 0;
    this.height = 0;
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
    this.drawBackground(context);
    for (const paint of game.paints) this.drawPaint(context, paint);
    this.drawPlayer(context, game.player);
    if (game.feedback) this.drawFeedback(context, game.feedback);
  }

  drawBackground(context) {
    const gradient = context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "rgba(255, 253, 247, 0.08)");
    gradient.addColorStop(1, "rgba(235, 226, 208, 0.19)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawPaint(context, paint) {
    const color = COLORS.find((item) => item.id === paint.colorId);
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

  drawPlayer(context, player) {
    const left = player.x - player.width / 2;
    const right = player.x + player.width / 2;
    const bottom = player.y + player.height;
    context.save();
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
    gradient.addColorStop(0, "#45413b");
    gradient.addColorStop(1, "#25231f");
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
