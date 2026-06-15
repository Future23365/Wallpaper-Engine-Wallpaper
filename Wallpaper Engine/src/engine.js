(() => {
  const cfg = window.WeatherConfig;
  const ui = window.WeatherUI;
  if (!cfg || !ui) return;

  const canvas = document.getElementById("stage");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dom = ui.dom;

  // 场景背景配色：保持简单以便平滑过渡与性能稳定。
  const BACKGROUNDS = {
    day: {
      clear: ["#FFBA5E", "#FFC67E", "#FFF0E2"],
      cloud: ["#64DBFF", "#D6DEE0", "#E2F0F6"],
      cloudy: ["#AFBCC7", "#D2D6DB", "#EBEFF8"],
      fog: ["#A2C3FF", "#B3AFD1", "#E7BEB0"],
      haze: ["#FFDDA1", "#D1C3AF", "#B5E8EF"],
      rain: ["#97B6D1", "#A6BBCE", "#97A8D7"],
      sleet: ["#B4D3ED", "#C5D2DC", "#ADC3DE"],
      snow: ["#93A2AD", "#E3E7EB", "#EDF2F6"],
      hail: ["#DDF7FF", "#E1E5E9", "#A0AFC1"],
      thunder: ["#C697D7", "#C1A3CE", "#AB90DB"],
      thunderstorm: ["#C697D7", "#C1A3CE", "#AB90DB"],
      wind: ["#96D0A3", "#DFFAE7", "#E8F4EE"],
    },
    night: {
      clear: ["#171D52", "#3F4DBA", "#5E68BD"],
      cloud: ["#1C2F75", "#585D6D", "#747B99"],
      cloudy: ["#23262C", "#525D66", "#6B8394"],
      fog: ["#131B45", "#2A5476", "#918EAF"],
      haze: ["#4D3314", "#755125", "#C5AF9D"],
      rain: ["#233361", "#2F4997", "#252731"],
      sleet: ["#23306B", "#3549A4", "#23262F"],
      snow: ["#353A47", "#455762", "#414F83"],
      hail: ["#335A7E", "#435A6F", "#303742"],
      thunder: ["#2F2B38", "#50406D", "#2C1C4D"],
      thunderstorm: ["#2F2B38", "#50406D", "#2C1C4D"],
      wind: ["#313E3A", "#529B73", "#638170"],
    }
  };

  const TWO_PI = Math.PI * 2;
  const degToRad = (deg) => (deg * Math.PI) / 180;
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const normalizeRotationDelta = (delta, intervalMs) => {
    if (!intervalMs) return 0;
    const base = 1000 / 60;
    return delta * (base / intervalMs);
  };
  const SLOW_FADE_KINDS = new Set(["clear", "cloud", "cloudy", "fog", "haze", "thunder"]);
  const backgroundGradientCache = new Map();

  let width = 0;
  let height = 0;
  let deviceScale = window.devicePixelRatio || 1;

  let rotation2D = 0;
  let rotation3D = 0;
  let targetRotation2D = 0;
  let targetRotation3D = 0;
  let lastTick = 0;
  let activeKind = "clear";
  let activeIsDay = true;
  let running = true;
  let fadeAlpha = 1;
  let fpsSampleTime = 0;
  let fpsFrameCount = 0;
  let fpsThreshold = 0;
  let dtSampleSum = 0;
  let dtSampleCount = 0;
  let lastMouseUpdate = 0;
  let pendingMouse = false;
  let pendingMouseX = 0;
  let pendingMouseY = 0;

  let current = null;
  let previous = null;
  let transitionStart = 0;
  let transitionDuration = 0;
  const registry = new Map();
  // 自动昼夜按分钟缓存，避免重复计算。
  let cachedAutoMinute = -1;
  let cachedAutoIsDay = true;
  let rafId = 0;
  const onResize = () => {
    setCanvasSize();
    resetScene(0);
  };
  const onMouseMove = (event) => {
    const allowDom = !document.body.classList.contains("no-ui");
    const tiltEnabled = allowDom && dom.tiltToggle
      ? dom.tiltToggle.checked
      : cfg.config.global.tilt === true;
    if (!tiltEnabled) return;
    pendingMouseX = event.clientX;
    pendingMouseY = event.clientY;
    pendingMouse = true;
  };
  const onMouseLeave = () => {
    targetRotation2D = 0;
    targetRotation3D = 0;
    pendingMouse = false;
  };

  function getActiveWeather() {
    const fixedWeather = document.body.dataset.weather;
    if (fixedWeather) {
      return cfg.normalizeWeatherKind ? cfg.normalizeWeatherKind(fixedWeather, "clear") : fixedWeather;
    }
    const allowDom = !document.body.classList.contains("no-ui");
    const raw = (allowDom ? dom.weatherSelect?.value : null) || cfg.config.global.weather || "clear";
    return cfg.normalizeWeatherKind ? cfg.normalizeWeatherKind(raw, "clear") : raw;
  }

  function isDaytime() {
    if (cfg.config.global.autoTime) {
      return getAutoDaytime();
    }
    const fixedTime = document.body.dataset.time;
    if (fixedTime) return fixedTime === "day";
    const allowDom = !document.body.classList.contains("no-ui");
    return ((allowDom ? dom.timeSelect?.value : null) || cfg.config.global.time || "day") === "day";
  }

  function getSizes() {
    return [width, height];
  }

  function getState() {
    return { width, height, rotation2D, rotation3D };
  }

  function parseTimeToMinutes(value, fallback) {
    if (typeof value !== "string") return fallback;
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return fallback;
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
    return hour * 60 + minute;
  }

  function getAutoDaytime() {
    const now = new Date();
    const minuteKey = now.getHours() * 60 + now.getMinutes();
    if (minuteKey === cachedAutoMinute) {
      return cachedAutoIsDay;
    }

    const global = cfg.getGlobalConfig();
    const sunrise = parseTimeToMinutes(global?.sunriseTime, 6 * 60);
    const sunset = parseTimeToMinutes(global?.sunsetTime, 18 * 60);
    let isDay = false;
    if (sunrise === sunset) {
      isDay = now.getHours() >= 6 && now.getHours() < 18;
    } else if (sunrise < sunset) {
      isDay = minuteKey >= sunrise && minuteKey < sunset;
    } else {
      // 跨日配置：例如日出 20:00，日落 06:00。
      isDay = minuteKey >= sunrise || minuteKey < sunset;
    }

    cachedAutoMinute = minuteKey;
    cachedAutoIsDay = isDay;
    cfg.config.global.time = isDay ? "day" : "night";
    return isDay;
  }

  function registerWeather(kind, factory) {
    registry.set(kind, factory);
    if (getActiveWeather() === kind) {
      resetScene();
    }
  }

  class ThunderFlash {
    constructor() {
      this.r = 81;
      this.g = 67;
      this.b = 168;
      this.alpha = 0;
      this.progress = 0;
      this.duration = 300;
      this.delay = rand(2000, 7000);
    }

    reset() {
      this.progress = 0;
      this.duration = 300;
      this.delay = rand(2000, 7000);
    }

    shine(interval) {
      this.progress += interval;
      if (this.progress > this.duration + this.delay) {
        this.reset();
      }
      const p = this.progress;
      const d = this.duration;
      if (p < d) {
        if (p < 0.25 * d) {
          this.alpha = p / (0.25 * d);
        } else if (p < 0.5 * d) {
          this.alpha = 1 - (p - 0.25 * d) / (0.25 * d);
        } else if (p < 0.75 * d) {
          this.alpha = (p - 0.5 * d) / (0.25 * d);
        } else {
          this.alpha = 1 - (p - 0.75 * d) / (0.25 * d);
        }
      } else {
        this.alpha = 0;
      }
    }
  }

  function setCanvasSize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const global = cfg.getGlobalConfig();
    const deviceDpr = window.devicePixelRatio || 1;
    const dprLevel = global?.dprLevel ?? "auto";
    // auto 追求最高质量；固定 DPR 档位作为降档或上限使用，不会超过设备 DPR。
    if (dprLevel === "auto") {
      deviceScale = deviceDpr;
    } else {
      const parsed = parseFloat(String(dprLevel));
      deviceScale = Number.isFinite(parsed) ? Math.min(deviceDpr, parsed) : deviceDpr;
    }
    canvas.width = width * deviceScale;
    canvas.height = height * deviceScale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    backgroundGradientCache.clear();
  }

  function drawBackground(kind, isDay, alpha = 1) {
    const mode = isDay ? "day" : "night";
    const colors = BACKGROUNDS[mode][kind] || ["#0a0f18", "#0a0f18", "#0a0f18"];
    const cacheKey = `${mode}:${kind}:${height}`;
    let gradient = backgroundGradientCache.get(cacheKey);
    if (!gradient) {
      gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.5, colors[1]);
      gradient.addColorStop(1, colors[2]);
      backgroundGradientCache.set(cacheKey, gradient);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function createImplementor(kind, isDay) {
    const factory = registry.get(kind) || registry.get("clear") || null;
    if (!factory) return null;
    return factory({
      ctx,
      sizes: getSizes(),
      isDay,
      getState,
      utils: { TWO_PI, degToRad, rand, clamp },
      ThunderFlash,
    });
  }

  // 鼠标模拟倾斜目标，在渲染循环中做平滑。
  function updateRotationTargets(x, y) {
    const nx = (x / width) * 2 - 1;
    const ny = (y / height) * 2 - 1;
    const tiltXScale = clamp(parseFloat(String(cfg.config.global.tiltX ?? 1)), 0, 2);
    const tiltYScale = clamp(parseFloat(String(cfg.config.global.tiltY ?? 1)), 0, 2);
    targetRotation2D = clamp(-nx * 18 * tiltXScale, -20 * tiltXScale, 20 * tiltXScale);
    targetRotation3D = clamp(ny * 10 * tiltYScale, -12 * tiltYScale, 12 * tiltYScale);
  }

  function applyMouseTilt(timestamp) {
    if (!pendingMouse) return;
    const global = cfg.getGlobalConfig();
    const fpsLimit = global?.fpsLimit ?? 0;
    const minInterval = fpsLimit > 0 ? (1000 / fpsLimit) : 16;
    if (timestamp - lastMouseUpdate < minInterval) return;
    lastMouseUpdate = timestamp;
    updateRotationTargets(pendingMouseX, pendingMouseY);
  }

  function loop(timestamp) {
    if (!running) return;
    const global = cfg.getGlobalConfig();
    const fpsLimit = global?.fpsLimit ?? 0;
    const effectiveFps = fpsLimit;
    const now = timestamp / 1000;
    if (!lastTick) {
      lastTick = now;
      requestAnimationFrame(loop);
      return;
    }
    let dt = now - lastTick;
    lastTick = now;
    if (effectiveFps > 0) {
      // 手动限帧：累积时间步长，保证 120Hz 下 60fps 仍能稳定更新。
      const frameTime = 1 / effectiveFps;
      fpsThreshold += dt;
      if (fpsThreshold < frameTime) {
        requestAnimationFrame(loop);
        return;
      }
      const steps = Math.floor(fpsThreshold / frameTime);
      dt = steps * frameTime;
      fpsThreshold -= dt;
    }
    dt = Math.min(dt, 1);
    const interval = dt * 1000;
    updateFpsMeter(timestamp, interval);

    applyMouseTilt(timestamp);
    // 低通滤波按时间步长缩放，避免帧率变化导致倾斜响应差异。
    const baseSmoothing = 0.08;
    const frameBase = 1 / 60;
    const smoothing = 1 - Math.pow(1 - baseSmoothing, dt / frameBase);
    rotation2D += (targetRotation2D - rotation2D) * smoothing;
    rotation3D += (targetRotation3D - rotation3D) * smoothing;

    const currentKind = activeKind;
    const currentIsDay = activeIsDay;
    const transitionMs = typeof transitionDuration === "number" ? transitionDuration : 0;
    const hasTransition = previous && transitionMs > 0;
    const t = hasTransition
      ? clamp((timestamp - transitionStart) / transitionMs, 0, 1)
      : 1;
    const smoothStep = (value) => value * value * (3 - 2 * value);
    const progress = hasTransition ? smoothStep(t) : 1;
    let currentAlpha = 1;
    let previousAlpha = 0;
    let fadeOutMs = transitionMs;
    if (hasTransition) {
      // 云雾类场景淡出更慢，避免硬切。
      const slowFade = previous && SLOW_FADE_KINDS.has(previous.kind);
      const fadeInMs = Math.max(1, transitionMs * (slowFade ? 0.7 : 0.6));
      fadeOutMs = Math.max(1, transitionMs * (slowFade ? 1.6 : 1));
      currentAlpha = smoothStep(clamp((timestamp - transitionStart) / fadeInMs, 0, 1));
      previousAlpha = 1 - smoothStep(clamp((timestamp - transitionStart) / fadeOutMs, 0, 1));
    }

    if (hasTransition) {
      drawBackground(previous.kind, previous.isDay, 1 - progress);
      drawBackground(currentKind, currentIsDay, progress);
    } else {
      drawBackground(currentKind, currentIsDay, 1);
    }

    const weatherCfg = cfg.getWeatherConfig(currentKind);
    const speed = parseFloat(String(weatherCfg.speed ?? 1));
    const allowDom = !document.body.classList.contains("no-ui");
    const animateEnabled = (allowDom && dom.animateToggle)
      ? dom.animateToggle.checked
      : weatherCfg.animate !== false;
    // 统一缩放时间步长，避免分散到粒子内。
    const intervalScaled = animateEnabled ? interval * speed : 0;

    if (current) {
      current.update(intervalScaled);
      if (hasTransition) {
        ctx.save();
        fadeAlpha = currentAlpha;
        current.draw();
        ctx.restore();
      } else {
        fadeAlpha = 1;
        current.draw();
      }
    }
    if (previous && hasTransition) {
      const previousCfg = cfg.getWeatherConfig(previous.kind);
      const previousSpeed = parseFloat(String(previousCfg.speed ?? 1));
      // 动画关闭时停止旧场景更新，避免半停半动的观感。
      const previousInterval = (animateEnabled && previousCfg.animate !== false)
        ? interval * previousSpeed * Math.max(previousAlpha, 0.25)
        : 0;
      previous.scene.update(previousInterval);
      ctx.save();
      fadeAlpha = previousAlpha;
      previous.scene.draw();
      ctx.restore();
      fadeAlpha = 1;
      if (progress >= 1 && (!fadeOutMs || timestamp - transitionStart >= fadeOutMs)) {
        previous = null;
      }
    }

    if (running) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function resetScene(transitionMs) {
    const kind = getActiveWeather();
    const isDay = isDaytime();
    const nextScene = createImplementor(kind, isDay);
    if (!nextScene) return;
    if (current) {
      previous = {
        scene: current,
        kind: activeKind,
        isDay: activeIsDay,
      };
    } else {
      previous = null;
    }
    activeKind = kind;
    activeIsDay = isDay;
    current = nextScene;
    transitionStart = performance.now();
    transitionDuration = typeof transitionMs === "number"
      ? transitionMs
      : cfg.getGlobalConfig()?.transitionMs ?? 800;
    if (!transitionDuration) {
      previous = null;
    }
  }

  function updateFpsMeter(timestamp, intervalMs) {
    const showFps = cfg.getGlobalConfig()?.showFps === true;
    if (!showFps) return;
    if (!fpsSampleTime) fpsSampleTime = timestamp;
    fpsFrameCount += 1;
    if (typeof intervalMs === "number") {
      dtSampleSum += intervalMs;
      dtSampleCount += 1;
    }
    const elapsed = timestamp - fpsSampleTime;
    if (elapsed >= 500) {
      const fps = Math.round((fpsFrameCount * 1000) / elapsed);
      const el = document.getElementById("fpsValue");
      if (el) el.textContent = String(fps);
      const avgDt = dtSampleCount ? (dtSampleSum / dtSampleCount) : 0;
      const dtEl = document.getElementById("dtValue");
      if (dtEl) dtEl.textContent = avgDt ? avgDt.toFixed(1) : "--";
      fpsSampleTime = timestamp;
      fpsFrameCount = 0;
      dtSampleSum = 0;
      dtSampleCount = 0;
    }
  }

  window.WeatherCommon = {
    ctx,
    utils: { TWO_PI, degToRad, rand, clamp, normalizeRotationDelta },
    registerWeather,
    getState,
    getSizes,
    isDay: isDaytime,
    getActiveWeather,
    getWeatherConfig: cfg.getWeatherConfig,
    getGlobalConfig: () => cfg.config.global,
    ThunderFlash,
    refresh: (transitionMs) => resetScene(transitionMs),
    resize: () => setCanvasSize(),
    getFadeAlpha: () => fadeAlpha,
    destroy: () => {
      // 清理 RAF 与全局事件，避免重复初始化时堆积。
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.WeatherUI?.destroy?.();
    },
  };

  ui.applyPageOverrides();
  activeKind = getActiveWeather();
  activeIsDay = isDaytime();
  setCanvasSize();
  resetScene(0);
  ui.scheduleAutoWeather();

  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseleave", onMouseLeave);

  rafId = requestAnimationFrame(loop);
})();
