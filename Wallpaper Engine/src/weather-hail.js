(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, getFadeAlpha, getWeatherConfig } = common;
  const { degToRad, rand, normalizeRotationDelta } = utils;

  // 冰雹：旋转方块，营造更“重”的感觉。
  class HailImplementor {
    constructor(sizes, daylight) {
      this.hails = [];
      this.lastRotation3D = 1000;
      const colors = daylight ? ["#80C5FF", "#B9DEFF", "#FFFFFF"] : ["#28669B", "#6390B6", "#FFFFFF"];
      const scales = [0.6, 0.8, 1.0];
      const density = getWeatherConfig ? (getWeatherConfig("hail")?.density ?? 1) : 1;
      const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
      const count = Math.max(0, Math.round(51 * scale));
      if (count > 0) {
        this.hails = Array.from({ length: count }, (_, i) => new HailStone(
          sizes,
          colors[Math.floor((i * 3) / count)],
          scales[Math.floor((i * 3) / count)]
        ));
      }
    }

    update(interval) {
      const { rotation3D } = getState();
      const deltaRaw = this.lastRotation3D === 1000 ? 0 : rotation3D - this.lastRotation3D;
      const delta = normalizeRotationDelta(deltaRaw, interval);
      this.hails.forEach((h) => h.move(interval, delta));
      this.lastRotation3D = rotation3D;
    }

    draw() {
      const { width, height, rotation2D } = getState();
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degToRad(rotation2D));
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = fade;
      this.hails.forEach((h) => h.draw());
      ctx.restore();
    }
  }

  class HailStone {
    constructor(sizes, color, scale) {
      this.canvasSize = Math.hypot(sizes[0], sizes[1]);
      this.viewWidth = sizes[0];
      this.viewHeight = sizes[1];
      this.color = color;
      this.scale = scale;
      this.size = 0.0324 * Math.min(this.viewWidth, this.viewHeight) * 0.8;
      this.speedY = Math.min(this.viewWidth, this.viewHeight) / 150;
      this.init(true);
    }

    init(firstTime) {
      this.cx = Math.random() * this.canvasSize;
      this.cy = firstTime ? rand(-this.canvasSize, -this.size) : -this.size;
      this.rotation = Math.random() * 360;
      this.speedRotation = 360 / 500 * Math.random();
      this.speedX = 0.75 * (Math.random() * this.speedY * (Math.random() > 0.5 ? 1 : -1));
      this.computeCenter();
    }

    computeCenter() {
      this.centerX = this.cx - (this.canvasSize - this.viewWidth) * 0.5;
      this.centerY = this.cy - (this.canvasSize - this.viewHeight) * 0.5;
    }

    move(interval, deltaRotation3D) {
      this.cx += this.speedX * interval * Math.pow(this.scale, 1.5);
      this.cy += this.speedY * interval * (Math.pow(this.scale, 1.5) - 5 * Math.sin(degToRad(deltaRotation3D)));
      this.rotation = (this.rotation + this.speedRotation * interval) % 360;
      if (this.cy - this.size >= this.canvasSize) {
        this.init(false);
      } else {
        this.computeCenter();
      }
    }

    draw() {
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.rotate(degToRad(this.rotation));
      ctx.fillStyle = this.color;
      ctx.globalAlpha = fade;
      const size = this.size * this.scale;
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.restore();
    }
  }

  common.registerWeather("hail", ({ sizes, isDay }) => new HailImplementor(sizes, isDay));
})();
