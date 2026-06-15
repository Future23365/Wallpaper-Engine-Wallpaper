(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, getFadeAlpha, getWeatherConfig } = common;
  const { TWO_PI, degToRad, rand, normalizeRotationDelta } = utils;

  // 雪使用圆形粒子并带轻微漂移。
  class SnowImplementor {
    constructor(sizes, daylight) {
      this.snows = [];
      this.lastRotation3D = 1000;
      const colors = daylight ? ["#BEE1FF", "#D3E9FF", "#FFFFFF"] : ["#6F859B", "#8CA1B6", "#FFFFFF"];
      const scales = [0.6, 0.8, 1.0];
      const density = getWeatherConfig ? (getWeatherConfig("snow")?.density ?? 1) : 1;
      const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
      const count = Math.max(0, Math.round(50 * scale));
      if (count > 0) {
        this.snows = Array.from({ length: count }, (_, i) => new SnowFlake(
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
      this.snows.forEach((s) => s.move(interval, delta));
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
      this.snows.forEach((s) => s.draw());
      ctx.restore();
    }
  }

  class SnowFlake {
    constructor(sizes, color, scale) {
      this.canvasSize = Math.hypot(sizes[0], sizes[1]);
      this.viewWidth = sizes[0];
      this.viewHeight = sizes[1];
      this.color = color;
      this.scale = scale;
      this.scalePower = Math.pow(scale, 1.5);
      this.radius = this.canvasSize * (0.005 + Math.random() * 0.007) * scale;
      this.speedY = this.canvasSize / (1000 * (2.5 + Math.random())) * 1.5;
      this.init(true);
    }

    init(firstTime) {
      this.cx = Math.random() * this.canvasSize;
      this.cy = firstTime ? rand(-this.canvasSize, -this.radius) : -this.radius;
      this.speedX = rand(-this.speedY, this.speedY);
      this.computeCenter();
    }

    computeCenter() {
      this.centerX = this.cx - (this.canvasSize - this.viewWidth) * 0.5;
      this.centerY = this.cy - (this.canvasSize - this.viewHeight) * 0.5;
    }

    move(interval, deltaRotation3D) {
      this.cx += this.speedX * interval * this.scalePower;
      this.cy += this.speedY * interval * (this.scalePower - 5 * Math.sin(degToRad(deltaRotation3D)));
      if (this.centerY >= this.canvasSize) {
        this.init(false);
      } else {
        this.computeCenter();
      }
    }

    draw() {
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  common.registerWeather("snow", ({ sizes, isDay }) => new SnowImplementor(sizes, isDay));
})();
