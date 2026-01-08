(() => {
  const common = window.WeatherCommon;
  if (!common) return;

  const { ctx, utils, getState, ThunderFlash, getWeatherConfig, getFadeAlpha, getGlobalConfig } = common;
  const { TWO_PI, degToRad, rand } = utils;

  const CLOUD = 1;
  const CLOUDY = 3;
  const THUNDER = 5;
  const FOG = 6;
  const HAZE = 7;

  // 云层预构建，避免每帧分配对象。
  class CloudImplementor {
    constructor(sizes, type, daylight, darkMode, kind) {
      this.clouds = [];
      this.stars = [];
      const flashEnabled = getWeatherConfig ? getWeatherConfig("thunder")?.flash !== false : true;
      this.thunder = type === THUNDER && flashEnabled ? new ThunderFlash() : null;
      const driftConfig = getWeatherConfig ? getWeatherConfig(kind) : null;
      this.driftEnabled = driftConfig ? driftConfig.cloudDrift !== false : true;
      this.driftMode = driftConfig?.cloudDriftDirection || "random";
      this.driftDirection = this.resolveDriftDirection(this.driftMode);
      this.driftOffset = 0;
      this.driftSpeedBase = sizes[0] * 0.00002;
      this.kind = kind;
      this.setup(sizes, type, daylight, darkMode);
    }

    resolveDriftDirection(direction) {
      if (direction === "left") return -1;
      if (direction === "right") return 1;
      return Math.random() < 0.5 ? -1 : 1;
    }

    setup(sizes, type, daylight, darkMode) {
      const w = sizes[0];
      const h = sizes[1];
      const randomFactor = (from, to) => from + Math.random() * (to - from);
      const isWideScreen = true;
      // 超宽屏时将云层限制在上部区域。
      const yScale = isWideScreen ? (0.15 * h) / w : 1;
      const constrainToTopBand = () => {
        if (!isWideScreen) return;
        const bandHeight = h * 0.2;
        this.clouds.forEach((c) => {
          const maxCenter = bandHeight - c.initRadius;
          if (c.initCY > maxCenter) {
            c.initCY = maxCenter;
            c.centerY = maxCenter;
          }
        });
      };
      const make = (cx, cy, radius, scaleRatio, moveFactor, color, alpha, duration) => (
        new Cloud(cx, cy, radius, scaleRatio, moveFactor, color, alpha, duration)
      );

      if (type === FOG || type === HAZE) {
        const cloudColors = type === FOG
          ? (daylight && !darkMode ? ["#93B9FF", "#93B9FF", "#93B9FF"] : ["#2A5476", "#2A5476", "#2A5476"])
          : (daylight && !darkMode ? ["#FFDDA1", "#FFDDA1", "#FFDDA1"] : ["#4D3314", "#4D3314", "#4D3314"]);
        const cloudAlphas = [0.3, 0.3, 0.3];
        this.clouds = [
          make(w * 1.0699, w * (1.19 * 0.2286 + 0.11) * yScale, w * (0.4694 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 9000),
          make(w * 0.4866, w * (0.4866 * 0.6064 + 0.085) * yScale, w * (0.3946 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 10500),
          make(w * 0.0351, w * (0.1701 * 1.4327 + 0.11) * yScale, w * (0.4627 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 9000),
          make(w * 0.8831, w * (1.027 * 0.1671 + 0.07) * yScale, w * (0.3238 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 7000),
          make(w * 0.4663, w * (0.4663 * 0.3520 + 0.05) * yScale, w * (0.2906 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 8500),
          make(w * 0.1229, w * (0.0234 * 5.7648 + 0.07) * yScale, w * (0.2972 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 7000),
          make(w * 0.925, w * (0.925 * 0.0249 + 0.15) * yScale, w * 0.3166, 1.15, randomFactor(1.8, 2.2), cloudColors[2], cloudAlphas[2], 7000),
          make(w * 0.4694, w * (0.4694 * 0.0489 + 0.15) * yScale, w * 0.3166, 1.15, randomFactor(1.8, 2.2), cloudColors[2], cloudAlphas[2], 8200),
          make(w * 0.025, w * (0.025 * 0.682 + 0.15) * yScale, w * 0.3166, 1.15, randomFactor(1.8, 2.2), cloudColors[2], cloudAlphas[2], 7700)
        ];
        constrainToTopBand();
      } else if (type === CLOUDY || type === THUNDER) {
        const cloudColors = type === CLOUDY
          ? (daylight && !darkMode ? ["#A0B3BF", "#A0B3BF"] : ["#5F686C", "#5F686C"])
          : (daylight && !darkMode ? ["#AB90DB", "#AB90DB"] : ["#2C1C4D", "#2C1C4D"]);
        const cloudAlphas = [0.3, 0.3];
        this.clouds = [
          make(w * 1.0699, w * (1.19 * 0.2286 + 0.11) * yScale, w * (0.4694 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 9000),
          make(w * 0.4866, w * (0.4866 * 0.6064 + 0.085) * yScale, w * (0.3946 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 10500),
          make(w * 0.0351, w * (0.1701 * 1.4327 + 0.11) * yScale, w * (0.4627 * 0.9), 1.1, randomFactor(1.3, 1.8), cloudColors[0], cloudAlphas[0], 9000),
          make(w * 0.8831, w * (1.027 * 0.1671 + 0.07) * yScale, w * (0.3238 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 7000),
          make(w * 0.4663, w * (0.4663 * 0.3520 + 0.05) * yScale, w * (0.2906 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 8500),
          make(w * 0.1229, w * (0.0234 * 5.7648 + 0.07) * yScale, w * (0.2972 * 0.9), 1.15, randomFactor(1.6, 2.0), cloudColors[1], cloudAlphas[1], 7000)
        ];
        constrainToTopBand();
      } else {
        const cloudColor = daylight && !darkMode ? "#CBF5FF" : "#97A8CA";
        const cloudAlphas = [0.4, 0.1];
        this.clouds = [
          make(w * 0.1529, w * (0.1529 * 0.5568 + 0.05) * yScale, w * 0.2649, 1.2, randomFactor(1.5, 1.8), cloudColor, cloudAlphas[0], 7000),
          make(w * 0.4793, w * (0.4793 * 0.2185 + 0.05) * yScale, w * 0.2426, 1.2, randomFactor(1.5, 1.8), cloudColor, cloudAlphas[0], 8500),
          make(w * 0.8531, w * (0.8531 * 0.1286 + 0.05) * yScale, w * 0.297, 1.2, randomFactor(1.5, 1.8), cloudColor, cloudAlphas[0], 7050),
          make(w * 0.0551, w * (0.0551 * 2.86 + 0.05) * yScale, w * 0.4125, 1.15, randomFactor(1.3, 1.5), cloudColor, cloudAlphas[1], 9500),
          make(w * 0.4928, w * (0.4928 * 0.3897 + 0.05) * yScale, w * 0.3521, 1.15, randomFactor(1.3, 1.5), cloudColor, cloudAlphas[1], 10500),
          make(w * 1.0499, w * (1.0499 * 0.1875 + 0.05) * yScale, w * 0.4186, 1.15, randomFactor(1.3, 1.5), cloudColor, cloudAlphas[1], 9000)
        ];
        if (isWideScreen) {
          const layerOffset = h * 0.02;
          this.clouds.forEach((c) => {
            if (c.alpha === cloudAlphas[1]) {
              c.initCY += layerOffset;
              c.centerY += layerOffset;
            }
          });
        }
        constrainToTopBand();

        if (!daylight) {
          // 夜晚云层加少量星点。
          const colors = [
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
          const canvasSize = Math.hypot(w, h);
          const widthRange = canvasSize;
          const heightRange = (canvasSize - h) * 0.5 + w * 1.1111;
          const radius = 0.00125 * canvasSize * (0.5 + Math.random());
          const density = getWeatherConfig ? (getWeatherConfig(this.kind)?.density ?? 1) : 1;
          const scale = Math.max(0, Math.min(2, parseFloat(String(density))));
          const starCount = Math.max(0, Math.round(50 * scale));
          this.stars = Array.from({ length: starCount }, (_, i) => {
            const x = rand(0, widthRange) - 0.5 * (canvasSize - w);
            const y = rand(0, heightRange) - 0.5 * (canvasSize - h);
            const duration = rand(2500, 5000);
            return new StarField(x, y, radius, colors[i % colors.length], duration);
          });
        }
      }
    }

    update(interval) {
      if (this.driftEnabled) {
        const driftConfig = getWeatherConfig ? getWeatherConfig(this.kind) : null;
        const speedScale = driftConfig ? (driftConfig.cloudDriftSpeed ?? 1) : 1;
        const mode = driftConfig?.cloudDriftDirection || "random";
        if (mode !== this.driftMode) {
          this.driftMode = mode;
          this.driftDirection = this.resolveDriftDirection(mode);
        }
        const driftSpeed = this.driftSpeedBase * speedScale;
        this.driftOffset += this.driftDirection * driftSpeed * interval;
        // 漂移做环绕，保证云层连续。
        const wrap = getState().width;
        if (this.driftOffset > wrap) this.driftOffset -= wrap;
        if (this.driftOffset < -wrap) this.driftOffset += wrap;
      }
      this.clouds.forEach((c) => c.move(interval, this.driftOffset));
      this.stars.forEach((s) => s.shine(interval));
      if (this.thunder) this.thunder.shine(interval);
    }

    draw() {
      const { width, height } = getState();
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      if (this.thunder) {
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = `rgba(${this.thunder.r}, ${this.thunder.g}, ${this.thunder.b}, ${this.thunder.alpha * 0.66})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      this.stars.forEach((s) => s.draw());
      this.clouds.forEach((c) => c.draw());
    }
  }

  class Cloud {
    constructor(cx, cy, radius, scaleRatio, moveFactor, color, alpha, duration, sizeScale = 1, yShift = 0) {
      this.initCX = cx;
      this.initCY = cy + yShift;
      this.radius = radius * sizeScale;
      this.initRadius = radius * sizeScale;
      this.scaleRatio = scaleRatio;
      this.moveFactor = moveFactor;
      this.color = color;
      this.alpha = alpha;
      this.duration = duration;
      this.progress = 0;
    }

    move(interval, driftOffset) {
      const { rotation2D, rotation3D } = getState();
      const width = getState().width;
      const x = this.initCX + driftOffset + Math.sin(degToRad(rotation2D)) * 0.4 * this.radius * this.moveFactor;
      this.baseX = x;
      this.centerX = ((x % width) + width) % width;
      this.centerY = this.initCY - Math.sin(degToRad(rotation3D)) * 0.5 * this.radius * this.moveFactor;
      this.progress = (this.progress + interval) % this.duration;
      const half = 0.5 * this.duration;
      if (this.progress < half) {
        this.radius = this.initRadius * (1 + (this.scaleRatio - 1) * (this.progress / half));
      } else {
        this.radius = this.initRadius * (this.scaleRatio - (this.scaleRatio - 1) * ((this.progress - half) / half));
      }
    }

    draw() {
      const width = getState().width;
      ctx.save();
      ctx.fillStyle = this.color;
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.globalAlpha = this.alpha * fade;
      const baseX = Number.isFinite(this.baseX) ? this.baseX : this.centerX;
      const x = ((baseX % width) + width) % width;
      const positions = [x, x - width, x + width];
      positions.forEach((px) => {
        if (px + this.radius < 0 || px - this.radius > width) return;
        ctx.beginPath();
        ctx.arc(px, this.centerY, this.radius, 0, TWO_PI);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  class StarField {
    constructor(x, y, radius, color, duration) {
      this.centerX = x;
      this.centerY = y;
      this.radius = radius * (0.7 + 0.3 * Math.random());
      this.color = color;
      this.duration = duration;
      this.progress = 0;
      this.alpha = Math.random();
    }

    shine(interval) {
      this.progress = (this.progress + interval) % this.duration;
      const half = 0.5 * this.duration;
      if (this.progress < half) {
        this.alpha = this.progress / half;
      } else {
        this.alpha = 1 - (this.progress - half) / half;
      }
    }

    draw() {
      ctx.save();
      ctx.fillStyle = this.color;
      const fade = typeof getFadeAlpha === "function" ? getFadeAlpha() : 1;
      ctx.globalAlpha = this.alpha * fade;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  common.registerWeather("cloud", ({ sizes, isDay }) => new CloudImplementor(sizes, CLOUD, isDay, !isDay, "cloud"));
  common.registerWeather("cloudy", ({ sizes, isDay }) => new CloudImplementor(sizes, CLOUDY, isDay, !isDay, "cloudy"));
  common.registerWeather("fog", ({ sizes, isDay }) => new CloudImplementor(sizes, FOG, isDay, !isDay, "fog"));
  common.registerWeather("haze", ({ sizes, isDay }) => new CloudImplementor(sizes, HAZE, isDay, !isDay, "haze"));
  common.registerWeather("thunder", ({ sizes, isDay }) => new CloudImplementor(sizes, THUNDER, isDay, !isDay, "thunder"));
})();
