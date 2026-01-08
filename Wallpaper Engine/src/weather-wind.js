(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, getFadeAlpha, getWeatherConfig } = common;
  const { degToRad, rand, normalizeRotationDelta } = utils;

  // 风：长条矩形，夜晚降低透明度。
  class WindImplementor {
    constructor(sizes, daylight) {
      this.winds = [];
      this.lastRotation3D = 1000;
      this.alpha = daylight ? 1 : 0.33;
      const colors = daylight ? ["#C2E4CA", "#B2E0BA", "#D2F0DA"] : ["#313E3A", "#529B73", "#638170"];
      const scales = [0.6, 0.8, 1.0];
      const density = getWeatherConfig ? (getWeatherConfig("wind")?.density ?? 1) : 1;
      const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
      const count = Math.max(0, Math.round(160 * scale));
      if (count > 0) {
        this.winds = Array.from({ length: count }, (_, i) => new WindStroke(
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
      this.winds.forEach((w) => w.move(interval, delta));
      this.lastRotation3D = rotation3D;
    }

    draw() {
      const { width, height, rotation2D } = getState();
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degToRad(rotation2D));
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = this.alpha * fade;
      this.winds.forEach((w) => w.draw());
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  class WindStroke {
    constructor(sizes, color, scale) {
      this.canvasSize = Math.hypot(sizes[0], sizes[1]);
      this.viewWidth = sizes[0];
      this.viewHeight = sizes[1];
      this.color = color;
      this.scale = scale;
      this.speed = this.canvasSize / (1000 * (0.5 + Math.random())) * 6;
      this.maxHeight = 0.007 * this.canvasSize;
      this.minHeight = 0.005 * this.canvasSize;
      this.maxWidth = this.maxHeight * 10;
      this.minWidth = this.minHeight * 6;
      this.init(true);
    }

    init(firstTime) {
      this.y = Math.random() * this.canvasSize;
      this.x = firstTime ? rand(-this.canvasSize, -this.maxHeight) : -this.maxHeight;
      this.width = rand(this.minWidth, this.maxWidth);
      this.height = rand(this.minHeight, this.maxHeight);
      this.buildRect();
    }

    buildRect() {
      const x = this.x - (this.canvasSize - this.viewWidth) * 0.5;
      const y = this.y - (this.canvasSize - this.viewHeight) * 0.5;
      this.rect = { x, y, w: this.width * this.scale, h: this.height * this.scale };
    }

    move(interval, deltaRotation3D) {
      this.x += this.speed * interval * (Math.pow(this.scale, 1.5) + 5 * Math.sin(degToRad(deltaRotation3D)) * Math.cos(degToRad(16)));
      this.y -= this.speed * interval * 5 * Math.sin(degToRad(deltaRotation3D)) * Math.sin(degToRad(16));
      if (this.x >= this.canvasSize) {
        this.init(false);
      } else {
        this.buildRect();
      }
    }

    draw() {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
      ctx.restore();
    }
  }

  common.registerWeather("wind", ({ sizes, isDay }) => new WindImplementor(sizes, isDay));
})();
