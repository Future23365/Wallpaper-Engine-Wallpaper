(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, getGlobalConfig, getFadeAlpha, getWeatherConfig } = common;
  const { degToRad, rand, normalizeRotationDelta } = utils;

  // 太阳：旋转方形层模拟柔和光晕。
  class SunImplementor {
    constructor(sizes) {
      const sunBase = Math.min(sizes[0], sizes[1]) * 0.7;
      this.angles = [0, 0, 0];
      this.unitSizes = [
        0.5 * 0.47 * sunBase,
        1.7794 * 0.5 * 0.47 * sunBase,
        3.0594 * 0.5 * 0.47 * sunBase
      ];
    }

    update(interval) {
      for (let i = 0; i < this.angles.length; i += 1) {
        this.angles[i] = (this.angles[i] + (90 / (3000 + 1000 * i)) * interval) % 90;
      }
    }

    draw() {
      const { width, height, rotation2D, rotation3D } = getState();
      const deltaX = Math.sin(degToRad(rotation2D)) * 0.18 * width;
      const deltaY = Math.sin(degToRad(rotation3D)) * -0.3 * width;
      const sunPos = getGlobalConfig ? getGlobalConfig().sunPos : "right";
      const baseX = sunPos === "left" ? 0 : (sunPos === "center" ? width * 0.5 : width);
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.save();
      ctx.translate(baseX + deltaX, height * 0.12 + deltaY);

      const alphas = [0.16, 0.08, 0.04];
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.globalAlpha = alphas[i] * fade;
        ctx.rotate(degToRad(this.angles[i]));
        ctx.fillStyle = "#ffffff";
        for (let j = 0; j < 4; j += 1) {
          const size = this.unitSizes[i];
          ctx.fillRect(-size, -size, size * 2, size * 2);
          ctx.rotate(degToRad(22.5));
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // 夜晚：流星与星点闪烁，保持缓慢节奏。
  class MeteorShowerImplementor {
    constructor(sizes) {
      this.canvasSize = Math.hypot(sizes[0], sizes[1]);
      this.colors = [
        "#D2F7FF",
        "#D0E9FF",
        "#AFC9E4",
        "#A4C2DC",
        "#61ABDC",
        "#4A8DC1",
        "#364277",
        "#22304A",
        "#ECEAD5",
        "#F0DC97"
      ];

      const density = getWeatherConfig ? (getWeatherConfig("clear")?.density ?? 1) : 1;
      const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
      const meteorCount = Math.max(0, Math.round(10 * scale));
      const starCount = Math.max(0, Math.round(70 * scale));
      this.meteors = Array.from({ length: meteorCount }, () => new Meteor(this.canvasSize, sizes, this.colors));
      this.stars = Array.from({ length: starCount }, (_, i) => new Star(this.canvasSize, sizes, this.colors[i % this.colors.length]));
      this.lastRotation3D = 1000;
    }

    update(interval) {
      const { rotation3D } = getState();
      const deltaRaw = this.lastRotation3D === 1000 ? 0 : rotation3D - this.lastRotation3D;
      const delta = normalizeRotationDelta(deltaRaw, interval);
      this.meteors.forEach((m) => m.update(interval, delta));
      this.stars.forEach((s) => s.shine(interval));
      this.lastRotation3D = rotation3D;
    }

    draw() {
      const { width, height, rotation2D } = getState();
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degToRad(rotation2D));
      ctx.translate(-width / 2, -height / 2);
      this.stars.forEach((s) => s.draw());
      ctx.restore();

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degToRad(60));
      ctx.translate(-width / 2, -height / 2);
      this.meteors.forEach((m) => m.draw());
      ctx.restore();
    }
  }

  class Meteor {
    constructor(canvasSize, sizes, colors) {
      this.canvasSize = canvasSize;
      this.viewWidth = sizes[0];
      this.viewHeight = sizes[1];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.scale = Math.random();
      this.width = this.viewWidth * 0.0088 * this.scale;
      this.speed = this.viewWidth / 200;
      this.maxHeight = 1.1 * this.viewWidth / Math.cos(degToRad(60));
      this.minHeight = this.maxHeight * 0.7;
      this.progress = 0;
      this.delay = 0;
      this.init(true);
    }

    init(firstTime) {
      this.progress = 0;
      this.delay = rand(5, 25) * 1000;
      this.x = Math.random() * this.canvasSize;
      if (!firstTime) {
        this.y = rand(-this.maxHeight - this.canvasSize, -this.maxHeight);
      } else {
        this.y = this.canvasSize * 2;
      }
      this.height = rand(this.minHeight, this.maxHeight);
      this.buildRect();
    }

    buildRect() {
      const x = this.x - (this.canvasSize - this.viewWidth) * 0.5;
      const y = this.y - (this.canvasSize - this.viewHeight) * 0.5;
      this.rect = { x, y, w: this.width, h: this.height };
    }

    update(interval, deltaRotation3D) {
      if (this.y > this.canvasSize) {
        this.progress += interval;
        if (this.progress > this.delay) this.init(false);
        return;
      }
      this.x -= this.speed * interval * 5 * Math.sin(degToRad(deltaRotation3D)) * Math.cos(degToRad(60));
      this.y += this.speed * interval * (Math.sqrt(this.scale) - 5 * Math.sin(degToRad(deltaRotation3D)) * Math.sin(degToRad(60)));
      this.buildRect();
    }

    draw() {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.rect.w;
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.moveTo(this.rect.x + this.rect.w / 2, this.rect.y);
      ctx.lineTo(this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h);
      ctx.stroke();
    }
  }

  class Star {
    constructor(canvasSize, sizes, color) {
      this.centerX = rand(-0.5 * (canvasSize - sizes[0]), 0.5 * (canvasSize + sizes[0]));
      this.centerY = rand(-0.5 * (canvasSize - sizes[1]), -0.5 * (canvasSize - sizes[1]) + sizes[0] * 1.1111);
      this.radius = 0.00125 * canvasSize * (0.5 + Math.random());
      this.color = color;
      this.duration = rand(2500, 5000);
      this.progress = 0;
      this.alpha = 0.5;
    }

    shine(interval) {
      this.progress = (this.progress + interval) % this.duration;
      if (this.progress < 0.5 * this.duration) {
        this.alpha = this.progress / (0.5 * this.duration);
      } else {
        this.alpha = 1 - (this.progress - 0.5 * this.duration) / (0.5 * this.duration);
      }
      this.alpha = this.alpha * 0.66 + 0.33;
    }

    draw() {
      ctx.fillStyle = this.color;
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.globalAlpha = this.alpha * fade;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  common.registerWeather("clear", ({ sizes, isDay }) => (
    isDay ? new SunImplementor(sizes) : new MeteorShowerImplementor(sizes)
  ));
})();
