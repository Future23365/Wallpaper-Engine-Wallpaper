(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, ThunderFlash, getWeatherConfig, getFadeAlpha } = common;
  const { degToRad, rand, normalizeRotationDelta } = utils;

  const RAIN = 1;
  const THUNDERSTORM = 3;
  const SLEET = 4;

  // 雨/雨夹雪/雷暴共用同一粒子结构。
  class RainImplementor {
    constructor(sizes, type, daylight, kind) {
      this.rains = [];
      this.thunder = null;
      this.lastRotation3D = 1000;
      this.kind = kind;
      this.setup(sizes, type, daylight);
    }

    setup(sizes, type, daylight) {
      const density = getWeatherConfig ? (getWeatherConfig(this.kind)?.density ?? 1) : 1;
      const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
      let colors = [];
      let count = 75;
      if (type === RAIN) {
        colors = daylight ? ["#DFB372", "#98AFDE", "#FFFFFF"] : ["#B68E52", "#585C71", "#FFFFFF"];
      } else if (type === THUNDERSTORM) {
        colors = daylight ? ["#B68E52", "#6C5592", "#FFFFFF"] : ["#B68E52", "#585C71", "#FFFFFF"];
        const flashEnabled = getWeatherConfig ? getWeatherConfig("thunderstorm")?.flash !== false : true;
        this.thunder = flashEnabled ? new ThunderFlash() : null;
      } else {
        colors = daylight ? ["#80C5FF", "#B9DEFF", "#FFFFFF"] : ["#28669B", "#6390B6", "#FFFFFF"];
        count = 45;
      }
      count = Math.max(0, Math.round(count * scale));
      const scales = [0.6, 0.8, 1.0];
      if (count > 0) {
        this.rains = Array.from({ length: count }, (_, i) => new RainDrop(
          sizes,
          colors[Math.floor((i * 3) / count)],
          scales[Math.floor((i * 3) / count)],
          type
        ));
      }
    }

    update(interval) {
      const { rotation3D } = getState();
      const deltaRaw = this.lastRotation3D === 1000 ? 0 : rotation3D - this.lastRotation3D;
      const delta = normalizeRotationDelta(deltaRaw, interval);
      this.rains.forEach((r) => r.move(interval, delta));
      if (this.thunder) this.thunder.shine(interval);
      this.lastRotation3D = rotation3D;
    }

    draw() {
      const { width, height, rotation2D } = getState();
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degToRad(rotation2D + 8));
      ctx.translate(-width / 2, -height / 2);
      this.rains.forEach((r) => r.draw());
      ctx.restore();

      if (this.thunder) {
        // 闪电叠层独立绘制，便于过渡。
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = `rgba(${this.thunder.r}, ${this.thunder.g}, ${this.thunder.b}, ${this.thunder.alpha * 0.66})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }

  // 雨滴尺寸按画布缩放，4K 下密度保持一致。
  class RainDrop {
    constructor(sizes, color, scale, type) {
      this.canvasSize = Math.hypot(sizes[0], sizes[1]);
      this.viewWidth = sizes[0];
      this.viewHeight = sizes[1];
      this.color = color;
      this.scale = scale;
      this.scalePower = Math.pow(scale, 1.5);
      this.rect = { x: 0, y: 0, w: 0, h: 0 };
      const velocity = type === SLEET ? 3.0 : 5.0;
      this.speed = this.canvasSize / (1000 * (1.75 + Math.random())) * velocity;
      this.maxWidth = (type === SLEET ? 0.006 : 0.003) * this.canvasSize;
      this.minWidth = (type === SLEET ? 0.004 : 0.002) * this.canvasSize;
      this.maxHeight = this.maxWidth * 10;
      this.minHeight = this.minWidth * 6;
      this.init(true);
    }

    init(firstTime) {
      this.x = Math.random() * this.canvasSize;
      this.y = firstTime ? rand(-this.canvasSize, -this.maxHeight) : -this.maxHeight * (1 + 2 * Math.random());
      this.width = rand(this.minWidth, this.maxWidth);
      this.height = rand(this.minHeight, this.maxHeight);
      this.buildRect();
    }

    buildRect() {
      const x = this.x - (this.canvasSize - this.viewWidth) * 0.5;
      const y = this.y - (this.canvasSize - this.viewHeight) * 0.5;
      this.rect.x = x;
      this.rect.y = y;
      this.rect.w = this.width * this.scale;
      this.rect.h = this.height * this.scale;
    }

    move(interval, deltaRotation3D) {
      this.y += this.speed * interval * (this.scalePower - 5 * Math.sin(degToRad(deltaRotation3D)) * Math.cos(degToRad(8)));
      this.x -= this.speed * interval * 5 * Math.sin(degToRad(deltaRotation3D)) * Math.sin(degToRad(8));
      if (this.y >= this.canvasSize) {
        this.init(false);
      } else {
        this.buildRect();
      }
    }

    draw() {
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = fade;
      const radius = this.rect.w / 2;
      roundRect(ctx, this.rect.x, this.rect.y, this.rect.w, this.rect.h, radius);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundRect(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  common.registerWeather("rain", ({ sizes, isDay }) => new RainImplementor(sizes, RAIN, isDay, "rain"));
  common.registerWeather("sleet", ({ sizes, isDay }) => new RainImplementor(sizes, SLEET, isDay, "sleet"));
  common.registerWeather("thunderstorm", ({ sizes, isDay }) => new RainImplementor(sizes, THUNDERSTORM, isDay, "thunderstorm"));
})();
