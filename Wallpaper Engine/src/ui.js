(() => {
  const cfg = window.WeatherConfig;
  if (!cfg) return;

  const dom = {
    weatherSelect: document.getElementById("weather"),
    timeSelect: document.getElementById("time"),
    autoTimeToggle: document.getElementById("autoTime"),
    randomTimeToggle: document.getElementById("randomTime"),
    sunriseTimeInput: document.getElementById("sunriseTime"),
    sunsetTimeInput: document.getElementById("sunsetTime"),
    autoWeatherToggle: document.getElementById("autoWeather"),
    autoWeatherIntervalSelect: document.getElementById("autoWeatherInterval"),
    autoWeatherRangeSelect: document.getElementById("autoWeatherRange"),
    autoWeatherRangeInputs: Array.from(document.querySelectorAll("[data-auto-weather-range]")),
    animateToggle: document.getElementById("animate"),
    particleDensityInput: document.getElementById("particleDensity"),
    particleDensityValue: document.getElementById("particleDensityValue"),
    speedInput: document.getElementById("speed"),
    speedValue: document.getElementById("speedValue"),
    tiltToggle: document.getElementById("tilt"),
    cloudDriftToggle: document.getElementById("cloudDrift"),
    cloudDriftSpeedInput: document.getElementById("cloudDriftSpeed"),
    cloudDriftSpeedValue: document.getElementById("cloudDriftSpeedValue"),
    cloudDriftDirectionSelect: document.getElementById("cloudDriftDirection"),
    flashToggle: document.getElementById("flash"),
    tiltXInput: document.getElementById("tiltX"),
    tiltXValue: document.getElementById("tiltXValue"),
    tiltYInput: document.getElementById("tiltY"),
    tiltYValue: document.getElementById("tiltYValue"),
    sunPosSelect: document.getElementById("sunPos"),
    fpsLimitSelect: document.getElementById("fpsLimit"),
    showFpsToggle: document.getElementById("showFps"),
    dprLevelSelect: document.getElementById("dprLevel"),
    fpsValue: document.getElementById("fpsValue"),
    fpsOverlay: document.getElementById("fpsOverlay"),
    uiToggle: document.getElementById("uiToggle"),
  };

  const uiListeners = [];
  let autoWeatherTimer = null;
  // UI 默认隐藏，可通过 ?debug=1 或保存的配置开启。
  const debugEnabled = (() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") return true;
    return false;
  })();

  document.body.classList.toggle("no-ui", !debugEnabled);
  document.body.classList.remove("ui-open");
  if (dom.uiToggle) {
    dom.uiToggle.setAttribute("aria-expanded", "false");
    dom.uiToggle.textContent = "控制面板";
  }

  function normalizeWeatherKind(value, fallback = "clear") {
    return cfg.normalizeWeatherKind
      ? cfg.normalizeWeatherKind(value, fallback)
      : fallback;
  }

  function getActiveWeather() {
    if (document.body.classList.contains("no-ui")) {
      const raw = document.body.dataset.weather || cfg.config.global.weather || "clear";
      return normalizeWeatherKind(raw, "clear");
    }
    const raw = dom.weatherSelect?.value || document.body.dataset.weather || cfg.config.global.weather || "clear";
    return normalizeWeatherKind(raw, "clear");
  }

  function getAutoWeatherIntervalMs() {
    const min = cfg.constants.AUTO_WEATHER_DEFAULT_MIN;
    const minutes = Math.max(0.5, Math.min(60, parseFloat(String(cfg.config.global.autoWeatherInterval ?? min))));
    return minutes * 60 * 1000;
  }

  function getAllWeatherOptions() {
    return cfg.constants.WEATHER_KINDS.slice();
  }

  function resolveAutoWeatherRange() {
    const all = getAllWeatherOptions();
    if (!all.length) return [];
    const stored = cfg.config.global.autoWeatherRange;
    if (!Array.isArray(stored)) return all;
    const filtered = stored.filter((kind) => all.includes(kind));
    return filtered.length ? filtered : all;
  }

  function applyRandomTimeOnWeatherChange() {
    if (!cfg.config.global.randomTime || !cfg.config.global.autoWeather) return;
    cfg.config.global.time = Math.random() < 0.5 ? "day" : "night";
    if (cfg.config.global.autoTime) {
      cfg.config.global.autoTime = false;
      syncAutoTimeControls();
    }
    if (dom.timeSelect) {
      dom.timeSelect.value = cfg.config.global.time;
    }
  }

  function stopAutoWeather() {
    if (autoWeatherTimer) {
      clearTimeout(autoWeatherTimer);
      autoWeatherTimer = null;
    }
  }

  // 自动切换天气使用单一计时器，避免漂移。
  function scheduleAutoWeather() {
    stopAutoWeather();
    if (!cfg.config.global.autoWeather) return;
    autoWeatherTimer = setTimeout(stepAutoWeather, getAutoWeatherIntervalMs());
  }

  function stepAutoWeather() {
    if (!cfg.config.global.autoWeather) return;
    const options = resolveAutoWeatherRange();
    if (!options.length) return;
    const current = getActiveWeather();
    const index = options.indexOf(current);
    const next = index < 0
      ? options[0]
      : options[(index + 1) % options.length];
    if (debugEnabled && dom.weatherSelect) {
      dom.weatherSelect.value = next;
    }
    cfg.config.global.weather = next;
    applyRandomTimeOnWeatherChange();
    cfg.saveConfig();
    if (debugEnabled) {
      syncWeatherControls();
    }
    window.WeatherCommon?.refresh();
    scheduleAutoWeather();
  }

  function syncWeatherControls() {
    if (!debugEnabled) return;
    const kind = getActiveWeather();
    const weatherCfg = cfg.getWeatherConfig(kind);
    const displaySpeed = (kind === "wind" || kind === "hail")
      ? (weatherCfg.speed ?? 1) * 2
      : (weatherCfg.speed ?? 1);
    if (dom.speedInput) {
      dom.speedInput.value = String(displaySpeed);
    }
    if (dom.speedValue) {
      dom.speedValue.textContent = `${parseFloat(String(displaySpeed)).toFixed(2)}x`;
    }
    if (dom.animateToggle) {
      dom.animateToggle.checked = weatherCfg.animate !== false;
      const label = dom.animateToggle.nextElementSibling;
      if (label) label.textContent = dom.animateToggle.checked ? "开启" : "关闭";
    }
    if (dom.cloudDriftToggle) {
      const label = dom.cloudDriftToggle.nextElementSibling;
      const wrapper = dom.cloudDriftToggle.closest("label");
      if (kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder") {
        if (wrapper) wrapper.style.display = "";
        dom.cloudDriftToggle.checked = weatherCfg.cloudDrift !== false;
        if (label) label.textContent = dom.cloudDriftToggle.checked ? "开启" : "关闭";
      } else if (wrapper) {
        wrapper.style.display = "none";
      }
    }
    if (dom.cloudDriftDirectionSelect) {
      const wrapper = dom.cloudDriftDirectionSelect.closest("label");
      if (kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder") {
        if (wrapper) wrapper.style.display = "";
        dom.cloudDriftDirectionSelect.value = weatherCfg.cloudDriftDirection || "random";
      } else if (wrapper) {
        wrapper.style.display = "none";
      }
    }
    if (dom.cloudDriftSpeedInput && dom.cloudDriftSpeedValue) {
      const wrapper = dom.cloudDriftSpeedInput.closest("label");
      if (kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder") {
        if (wrapper) wrapper.style.display = "";
        dom.cloudDriftSpeedInput.value = String(weatherCfg.cloudDriftSpeed ?? 1);
        dom.cloudDriftSpeedValue.textContent = `${parseFloat(String(dom.cloudDriftSpeedInput.value)).toFixed(2)}x`;
      } else if (wrapper) {
        wrapper.style.display = "none";
      }
    }
    if (dom.flashToggle) {
      const label = dom.flashToggle.nextElementSibling;
      const wrapper = dom.flashToggle.closest("label");
      if (kind === "thunder" || kind === "thunderstorm") {
        if (wrapper) wrapper.style.display = "";
        dom.flashToggle.checked = weatherCfg.flash !== false;
        if (label) label.textContent = dom.flashToggle.checked ? "开启" : "关闭";
      } else if (wrapper) {
        wrapper.style.display = "none";
      }
    }
    syncSunPositionControl();
    syncParticleDensityControls();
  }

  function syncParticleDensityControls() {
    if (!debugEnabled) return;
    if (dom.particleDensityInput) {
      const kind = getActiveWeather();
      const weatherCfg = cfg.getWeatherConfig(kind);
      dom.particleDensityInput.value = String(weatherCfg.density ?? 1);
    }
    if (dom.particleDensityValue) {
      const value = parseFloat(String(dom.particleDensityInput?.value ?? 1));
      dom.particleDensityValue.textContent = `${value.toFixed(1)}x`;
    }
  }

  function syncTiltControls() {
    if (!debugEnabled) return;
    if (dom.tiltXInput) {
      dom.tiltXInput.value = String(cfg.config.global.tiltX ?? 1);
    }
    if (dom.tiltXValue) {
      dom.tiltXValue.textContent = `${parseFloat(String(dom.tiltXInput?.value ?? 1)).toFixed(2)}x`;
    }
    if (dom.tiltYInput) {
      dom.tiltYInput.value = String(cfg.config.global.tiltY ?? 1);
    }
    if (dom.tiltYValue) {
      dom.tiltYValue.textContent = `${parseFloat(String(dom.tiltYInput?.value ?? 1)).toFixed(2)}x`;
    }
  }

  function syncSunPositionControl() {
    if (!debugEnabled) return;
    if (!dom.sunPosSelect) return;
    const kind = getActiveWeather();
    const wrapper = dom.sunPosSelect.closest("label");
    if (kind !== "clear") {
      if (wrapper) wrapper.style.display = "none";
      return;
    }
    if (wrapper) wrapper.style.display = "";
    dom.sunPosSelect.value = cfg.config.global.sunPos || "right";
  }

  function syncAutoWeatherControls() {
    if (!debugEnabled) return;
    if (!dom.autoWeatherToggle || !dom.autoWeatherIntervalSelect) return;
    dom.autoWeatherToggle.checked = cfg.config.global.autoWeather === true;
    const label = dom.autoWeatherToggle.nextElementSibling;
    if (label) label.textContent = dom.autoWeatherToggle.checked ? "开启" : "关闭";
    dom.autoWeatherIntervalSelect.value = String(cfg.config.global.autoWeatherInterval ?? cfg.constants.AUTO_WEATHER_DEFAULT_MIN);
  }

  function syncAutoWeatherRangeControls() {
    if (!debugEnabled) return;
    if (!dom.autoWeatherRangeInputs?.length) return;
    const selected = resolveAutoWeatherRange();
    dom.autoWeatherRangeInputs.forEach((input) => {
      input.checked = selected.includes(input.value);
    });
  }

  // 自动昼夜时禁用手动时间选择。
  function syncAutoTimeControls() {
    if (!debugEnabled) return;
    if (!dom.autoTimeToggle) return;
    dom.autoTimeToggle.checked = cfg.config.global.autoTime === true;
    const label = dom.autoTimeToggle.nextElementSibling;
    if (label) label.textContent = dom.autoTimeToggle.checked ? "开启" : "关闭";
    if (dom.timeSelect) {
      dom.timeSelect.disabled = dom.autoTimeToggle.checked;
      if (dom.autoTimeToggle.checked && window.WeatherCommon?.isDay) {
        dom.timeSelect.value = window.WeatherCommon.isDay() ? "day" : "night";
      }
    }
  }

  function syncRandomTimeControls() {
    if (!debugEnabled) return;
    if (!dom.randomTimeToggle) return;
    dom.randomTimeToggle.checked = cfg.config.global.randomTime === true;
    const label = dom.randomTimeToggle.nextElementSibling;
    if (label) label.textContent = dom.randomTimeToggle.checked ? "开启" : "关闭";
  }

  function syncSunTimeControls() {
    if (!debugEnabled) return;
    if (dom.sunriseTimeInput) {
      dom.sunriseTimeInput.value = cfg.config.global.sunriseTime || "06:00";
    }
    if (dom.sunsetTimeInput) {
      dom.sunsetTimeInput.value = cfg.config.global.sunsetTime || "18:00";
    }
  }

  function getFpsSelectValue() {
    const override = cfg.config.global.fpsOverride === true;
    if (!override) return "0";
    const value = cfg.config.global.fpsLimit ?? 0;
    return String(value);
  }

  function syncFpsControls() {
    if (!debugEnabled) return;
    if (!dom.fpsLimitSelect) return;
    dom.fpsLimitSelect.value = getFpsSelectValue();
  }

  function syncDprLevelControls() {
    if (!debugEnabled) return;
    if (!dom.dprLevelSelect) return;
    dom.dprLevelSelect.value = String(cfg.config.global.dprLevel ?? "auto");
  }

  function syncFpsMeterControls() {
    if (debugEnabled && dom.showFpsToggle) {
      dom.showFpsToggle.checked = cfg.config.global.showFps === true;
      const label = dom.showFpsToggle.nextElementSibling;
      if (label) label.textContent = dom.showFpsToggle.checked ? "开启" : "关闭";
    }
    if (dom.fpsOverlay) {
      dom.fpsOverlay.style.display = cfg.config.global.showFps === true ? "flex" : "none";
    }
  }

  // URL/data 属性可锁定天气/时间用于预览。
  function applyPageOverrides() {
    if (!debugEnabled) {
      // UI 关闭时仅同步必要值，避免额外 DOM 操作。
      if (dom.weatherSelect && cfg.config.global.weather) {
        dom.weatherSelect.value = cfg.config.global.weather;
      }
      if (dom.timeSelect && cfg.config.global.time) {
        dom.timeSelect.value = cfg.config.global.time;
      }
      return;
    }
    const fixedWeather = normalizeWeatherKind(document.body.dataset.weather, "");
    const fixedTime = document.body.dataset.time;
    if (fixedWeather && dom.weatherSelect) {
      dom.weatherSelect.value = fixedWeather;
      const label = dom.weatherSelect.closest("label");
      if (label) label.style.display = "none";
    } else if (dom.weatherSelect && cfg.config.global.weather) {
      dom.weatherSelect.value = cfg.config.global.weather;
    }
    if (fixedTime && dom.timeSelect) {
      dom.timeSelect.value = fixedTime;
    } else if (dom.timeSelect && cfg.config.global.time) {
      dom.timeSelect.value = cfg.config.global.time;
    }
    if (dom.tiltToggle) {
      dom.tiltToggle.checked = cfg.config.global.tilt !== false;
      const label = dom.tiltToggle.nextElementSibling;
      if (label) label.textContent = dom.tiltToggle.checked ? "开启" : "关闭";
    }
    if (dom.autoWeatherToggle && dom.autoWeatherIntervalSelect) {
      const toggleWrapper = dom.autoWeatherToggle.closest("label");
      const intervalWrapper = dom.autoWeatherIntervalSelect.closest("label");
      const disabled = Boolean(fixedWeather);
      if (toggleWrapper) toggleWrapper.style.display = disabled ? "none" : "";
      if (intervalWrapper) intervalWrapper.style.display = disabled ? "none" : "";
    }
    if (dom.autoWeatherRangeSelect) {
      const rangeWrapper = dom.autoWeatherRangeSelect.closest("label");
      const disabled = Boolean(fixedWeather);
      if (rangeWrapper) rangeWrapper.style.display = disabled ? "none" : "";
    }
    if (dom.autoTimeToggle) {
      const wrapper = dom.autoTimeToggle.closest("label");
      if (wrapper) wrapper.style.display = fixedTime ? "none" : "";
    }
    syncWeatherControls();
    syncTiltControls();
    syncSunPositionControl();
    syncAutoWeatherControls();
    syncAutoWeatherRangeControls();
    syncAutoTimeControls();
    syncRandomTimeControls();
    syncSunTimeControls();
    syncFpsControls();
    syncDprLevelControls();
    syncFpsMeterControls();
  }

  // 仅在调试模式绑定事件，避免运行时开销。
  function bindEvents() {
    if (!debugEnabled) return;
    const addListener = (target, type, handler, options) => {
      if (!target) return;
      target.addEventListener(type, handler, options);
      uiListeners.push({ target, type, handler, options });
    };
    if (dom.weatherSelect) {
      addListener(dom.weatherSelect, "change", () => {
        cfg.config.global.weather = dom.weatherSelect.value;
        applyRandomTimeOnWeatherChange();
        cfg.saveConfig();
        syncWeatherControls();
        window.WeatherCommon?.refresh();
        scheduleAutoWeather();
      });
    }
    if (dom.timeSelect) {
      addListener(dom.timeSelect, "change", () => {
        cfg.config.global.time = dom.timeSelect.value;
        if (cfg.config.global.autoTime) {
          cfg.config.global.autoTime = false;
          syncAutoTimeControls();
        }
        cfg.saveConfig();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.autoTimeToggle) {
      addListener(dom.autoTimeToggle, "change", () => {
        const label = dom.autoTimeToggle.nextElementSibling;
        if (label) label.textContent = dom.autoTimeToggle.checked ? "开启" : "关闭";
        cfg.config.global.autoTime = dom.autoTimeToggle.checked;
        cfg.saveConfig();
        syncAutoTimeControls();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.randomTimeToggle) {
      addListener(dom.randomTimeToggle, "change", () => {
        const label = dom.randomTimeToggle.nextElementSibling;
        if (label) label.textContent = dom.randomTimeToggle.checked ? "开启" : "关闭";
        cfg.config.global.randomTime = dom.randomTimeToggle.checked;
        cfg.saveConfig();
      });
    }
    if (dom.sunriseTimeInput) {
      addListener(dom.sunriseTimeInput, "change", () => {
        cfg.config.global.sunriseTime = dom.sunriseTimeInput.value || "06:00";
        cfg.saveConfig();
        if (cfg.config.global.autoTime) {
          window.WeatherCommon?.refresh();
        }
      });
    }
    if (dom.sunsetTimeInput) {
      addListener(dom.sunsetTimeInput, "change", () => {
        cfg.config.global.sunsetTime = dom.sunsetTimeInput.value || "18:00";
        cfg.saveConfig();
        if (cfg.config.global.autoTime) {
          window.WeatherCommon?.refresh();
        }
      });
    }
    if (dom.animateToggle) {
      addListener(dom.animateToggle, "change", () => {
        const label = dom.animateToggle.nextElementSibling;
        if (label) label.textContent = dom.animateToggle.checked ? "开启" : "关闭";
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.animate = dom.animateToggle.checked;
        cfg.saveConfig();
      });
    }
    if (dom.particleDensityInput && dom.particleDensityValue) {
      addListener(dom.particleDensityInput, "input", () => {
        const value = parseFloat(dom.particleDensityInput.value);
        dom.particleDensityValue.textContent = `${value.toFixed(1)}x`;
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.density = value;
        cfg.saveConfig();
        window.WeatherCommon?.refresh(0);
      });
      dom.particleDensityValue.textContent = `${parseFloat(dom.particleDensityInput.value).toFixed(1)}x`;
    }
    if (dom.speedInput && dom.speedValue) {
      addListener(dom.speedInput, "input", () => {
        const displaySpeed = parseFloat(dom.speedInput.value);
        dom.speedValue.textContent = `${displaySpeed.toFixed(2)}x`;
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.speed = (kind === "wind" || kind === "hail")
          ? displaySpeed * 0.5
          : displaySpeed;
        cfg.saveConfig();
      });
      dom.speedValue.textContent = `${parseFloat(dom.speedInput.value).toFixed(2)}x`;
    }
    if (dom.flashToggle) {
      addListener(dom.flashToggle, "change", () => {
        const label = dom.flashToggle.nextElementSibling;
        if (label) label.textContent = dom.flashToggle.checked ? "开启" : "关闭";
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.flash = dom.flashToggle.checked;
        cfg.saveConfig();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.tiltToggle) {
      addListener(dom.tiltToggle, "change", () => {
        const label = dom.tiltToggle.nextElementSibling;
        if (label) label.textContent = dom.tiltToggle.checked ? "开启" : "关闭";
        cfg.config.global.tilt = dom.tiltToggle.checked;
        cfg.saveConfig();
      });
    }
    if (dom.cloudDriftToggle) {
      addListener(dom.cloudDriftToggle, "change", () => {
        const label = dom.cloudDriftToggle.nextElementSibling;
        if (label) label.textContent = dom.cloudDriftToggle.checked ? "开启" : "关闭";
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.cloudDrift = dom.cloudDriftToggle.checked;
        cfg.saveConfig();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.cloudDriftSpeedInput && dom.cloudDriftSpeedValue) {
      addListener(dom.cloudDriftSpeedInput, "input", () => {
        const value = parseFloat(dom.cloudDriftSpeedInput.value);
        dom.cloudDriftSpeedValue.textContent = `${value.toFixed(2)}x`;
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.cloudDriftSpeed = value;
        cfg.saveConfig();
      });
      dom.cloudDriftSpeedValue.textContent = `${parseFloat(dom.cloudDriftSpeedInput.value).toFixed(2)}x`;
    }
    if (dom.cloudDriftDirectionSelect) {
      addListener(dom.cloudDriftDirectionSelect, "change", () => {
        const kind = getActiveWeather();
        const weatherCfg = cfg.getWeatherConfig(kind);
        weatherCfg.cloudDriftDirection = dom.cloudDriftDirectionSelect.value;
        cfg.saveConfig();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.sunPosSelect) {
      addListener(dom.sunPosSelect, "change", () => {
        cfg.config.global.sunPos = dom.sunPosSelect.value;
        cfg.saveConfig();
        window.WeatherCommon?.refresh();
      });
    }
    if (dom.tiltXInput && dom.tiltXValue) {
      addListener(dom.tiltXInput, "input", () => {
        const value = parseFloat(dom.tiltXInput.value);
        dom.tiltXValue.textContent = `${value.toFixed(2)}x`;
        cfg.config.global.tiltX = value;
        cfg.saveConfig();
      });
      dom.tiltXValue.textContent = `${parseFloat(dom.tiltXInput.value).toFixed(2)}x`;
    }
    if (dom.tiltYInput && dom.tiltYValue) {
      addListener(dom.tiltYInput, "input", () => {
        const value = parseFloat(dom.tiltYInput.value);
        dom.tiltYValue.textContent = `${value.toFixed(2)}x`;
        cfg.config.global.tiltY = value;
        cfg.saveConfig();
      });
      dom.tiltYValue.textContent = `${parseFloat(dom.tiltYInput.value).toFixed(2)}x`;
    }
    if (dom.autoWeatherToggle) {
      addListener(dom.autoWeatherToggle, "change", () => {
        const label = dom.autoWeatherToggle.nextElementSibling;
        if (label) label.textContent = dom.autoWeatherToggle.checked ? "开启" : "关闭";
        cfg.config.global.autoWeather = dom.autoWeatherToggle.checked;
        cfg.saveConfig();
        scheduleAutoWeather();
      });
    }
    if (dom.autoWeatherIntervalSelect) {
      addListener(dom.autoWeatherIntervalSelect, "change", () => {
        const value = parseFloat(dom.autoWeatherIntervalSelect.value);
        cfg.config.global.autoWeatherInterval = value;
        cfg.saveConfig();
        scheduleAutoWeather();
      });
    }
    if (dom.autoWeatherRangeInputs?.length) {
      dom.autoWeatherRangeInputs.forEach((input) => {
        addListener(input, "change", () => {
          const selected = dom.autoWeatherRangeInputs
            .filter((item) => item.checked)
            .map((item) => item.value);
          const all = getAllWeatherOptions();
          cfg.config.global.autoWeatherRange = selected.length ? selected : all;
          if (!selected.length) {
            syncAutoWeatherRangeControls();
          }
          cfg.saveConfig();
          scheduleAutoWeather();
        });
      });
    }
    if (dom.fpsLimitSelect) {
      addListener(dom.fpsLimitSelect, "change", () => {
        if (cfg.config.global.fpsLocked) {
          dom.fpsLimitSelect.value = getFpsSelectValue();
          return;
        }
        const value = parseFloat(dom.fpsLimitSelect.value);
        const valid = Number.isFinite(value) ? value : 0;
        cfg.config.global.fpsLimit = valid;
        cfg.config.global.fpsOverride = valid > 0;
        cfg.saveConfig();
      });
    }
    if (dom.dprLevelSelect) {
      addListener(dom.dprLevelSelect, "change", () => {
        cfg.config.global.dprLevel = dom.dprLevelSelect.value;
        cfg.saveConfig();
        window.WeatherCommon?.resize();
      });
    }
    if (dom.showFpsToggle) {
      addListener(dom.showFpsToggle, "change", () => {
        const label = dom.showFpsToggle.nextElementSibling;
        if (label) label.textContent = dom.showFpsToggle.checked ? "开启" : "关闭";
        cfg.config.global.showFps = dom.showFpsToggle.checked;
        cfg.saveConfig();
        if (dom.fpsOverlay) {
          dom.fpsOverlay.style.display = dom.showFpsToggle.checked ? "flex" : "none";
        }
      });
    }
    if (dom.uiToggle) {
      addListener(dom.uiToggle, "click", () => {
        const isOpen = document.body.classList.toggle("ui-open");
        dom.uiToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        dom.uiToggle.textContent = isOpen ? "收起面板" : "控制面板";
      });
    }
  }

  applyPageOverrides();
  bindEvents();

  window.WeatherUI = {
    dom,
    getActiveWeather,
    applyPageOverrides,
    syncWeatherControls,
    syncTiltControls,
    syncSunPositionControl,
    syncParticleDensityControls,
    syncAutoWeatherControls,
    syncAutoWeatherRangeControls,
    syncAutoTimeControls,
    syncRandomTimeControls,
    syncSunTimeControls,
    syncFpsControls,
    syncDprLevelControls,
    syncFpsMeterControls,
    scheduleAutoWeather,
    stopAutoWeather,
    destroy: () => {
      // 解绑 UI 事件与定时器，避免反复加载时残留引用。
      uiListeners.forEach(({ target, type, handler, options }) => {
        target.removeEventListener(type, handler, options);
      });
      uiListeners.length = 0;
      stopAutoWeather();
    },
  };
})();
