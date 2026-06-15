(() => {
  const cfg = window.WeatherConfig;
  if (!cfg) return;

  // WeatherCommon 未就绪时先排队（WE 可能提前调用）。
  const pending = [];
  let queuedFlush = false;
  let lastResetStorage = false;
  let weFpsLimit = 0;
  const AUTO_WEATHER_RANGE_KEYS = {
    autoweatherclear: "clear",
    autoweathercloud: "cloud",
    autoweathercloudy: "cloudy",
    autoweatherfog: "fog",
    autoweatherhaze: "haze",
    autoweatherrain: "rain",
    autoweathersleet: "sleet",
    autoweathersnow: "snow",
    autoweatherhail: "hail",
    autoweatherthunder: "thunder",
    autoweatherthunderstorm: "thunderstorm",
    autoweatherwind: "wind",
  };

  function normalizeNumber(value, fallback, min, max) {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(parsed)) return fallback;
    if (typeof min === "number" && parsed < min) return min;
    if (typeof max === "number" && parsed > max) return max;
    return parsed;
  }

  function normalizeWeatherKind(value, fallback = "clear") {
    return cfg.normalizeWeatherKind
      ? cfg.normalizeWeatherKind(value, fallback)
      : fallback;
  }

  function enqueue(action) {
    if (window.WeatherCommon) {
      action();
      return;
    }
    pending.push(action);
    if (!queuedFlush) {
      queuedFlush = true;
      window.addEventListener("load", flushPending, { once: true });
    }
  }

  function flushPending() {
    if (!window.WeatherCommon) return;
    queuedFlush = false;
    while (pending.length) {
      const task = pending.shift();
      task();
    }
  }

  function parseBool(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function getFirstDefinedProperty(properties, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const property = properties[keys[i]];
      if (property?.value !== undefined) return property;
    }
    return null;
  }

  function parseWeatherRange(value) {
    const allowed = cfg.constants?.WEATHER_KINDS || [];
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeWeatherKind(String(item).trim(), ""))
        .filter((item) => item && allowed.includes(item));
    }
    if (typeof value === "string") {
      return value
        .split(/[\s,|]+/)
        .map((item) => normalizeWeatherKind(item.trim(), ""))
        .filter((item) => item && allowed.includes(item));
    }
    return [];
  }

  function normalizeAutoWeatherRange() {
    const allowed = cfg.constants?.WEATHER_KINDS || [];
    const range = cfg.getGlobalConfig()?.autoWeatherRange;
    if (Array.isArray(range)) {
      const filtered = range.filter((kind) => allowed.includes(kind));
      return filtered.length ? filtered : allowed.slice();
    }
    return allowed.slice();
  }

  function resetLocalStorage() {
    localStorage.removeItem("breezy_weather_html_config");
    if (cfg?.config) {
      cfg.config.perWeather = {};
    }
    if (cfg?.constants?.DEFAULT_GLOBAL) {
      cfg.applyGlobalPatch(cfg.constants.DEFAULT_GLOBAL);
    }
    cfg.saveConfig();
    enqueue(() => window.WeatherCommon?.resize());
    enqueue(() => window.WeatherCommon?.refresh(0));
  }

  // 应用配置并触发刷新/重置尺寸。
  function applyPatch(patch, refresh, resize, transitionMs) {
    if (!patch) return;
    cfg.applyGlobalPatch(patch);
    cfg.saveConfig();
    window.WeatherUI?.syncFpsControls?.();
    if ("weather" in patch) {
      window.WeatherUI?.syncWeatherControls?.();
      window.WeatherUI?.syncSunPositionControl?.();
    }
    if ("autoWeather" in patch || "autoWeatherInterval" in patch) {
      window.WeatherUI?.syncAutoWeatherControls?.();
      window.WeatherUI?.scheduleAutoWeather?.();
    }
    if ("autoWeatherRange" in patch) {
      window.WeatherUI?.syncAutoWeatherRangeControls?.();
      window.WeatherUI?.scheduleAutoWeather?.();
    }
    if ("autoTime" in patch || "time" in patch) {
      window.WeatherUI?.syncAutoTimeControls?.();
      const timeSelect = window.WeatherUI?.dom?.timeSelect;
      if (timeSelect && "time" in patch) {
        timeSelect.value = patch.time;
      }
    }
    if ("randomTime" in patch) {
      window.WeatherUI?.syncRandomTimeControls?.();
    }
    if ("sunriseTime" in patch || "sunsetTime" in patch) {
      window.WeatherUI?.syncSunTimeControls?.();
    }
    if ("tilt" in patch || "tiltX" in patch || "tiltY" in patch) {
      window.WeatherUI?.syncTiltControls?.();
    }
    if ("sunPos" in patch) {
      window.WeatherUI?.syncSunPositionControl?.();
    }
    if ("fpsLimit" in patch || "fpsOverride" in patch) {
      window.WeatherUI?.syncFpsControls?.();
    }
    if ("showFps" in patch) {
      window.WeatherUI?.syncFpsMeterControls?.();
    }
    if ("dprLevel" in patch) {
      window.WeatherUI?.syncDprLevelControls?.();
    }
    if (resize) {
      enqueue(() => window.WeatherCommon?.resize());
    }
    if (refresh) {
      enqueue(() => window.WeatherCommon?.refresh(transitionMs));
    }
  }

  function applyWeatherPatch(targetWeather, weatherPatch, refresh, transitionMs = 0) {
    const kind = normalizeWeatherKind(targetWeather, cfg.config.global.weather || "clear");
    const weatherCfg = cfg.getWeatherConfig(kind);
    Object.assign(weatherCfg, weatherPatch);
    cfg.saveConfig();
    window.WeatherUI?.syncWeatherControls?.();
    if (refresh) {
      enqueue(() => window.WeatherCommon?.refresh(transitionMs));
    }
    return weatherCfg;
  }

  function setMode(mode, transitionMs = 800) {
    applyPatch({ weather: mode }, true, false, transitionMs);
  }

  function setTimeOfDay(timeOfDay) {
    applyPatch({ time: timeOfDay }, true, false);
  }

  function setAutoTime(enabled) {
    applyPatch({ autoTime: Boolean(enabled) }, true, false);
  }

  function setDprLevel(level) {
    applyPatch({ dprLevel: level }, false, true);
  }

  function setIntensity(value) {
    const kind = cfg.config.global.weather || "clear";
    const weatherCfg = cfg.getWeatherConfig(kind);
    const density = normalizeNumber(value, weatherCfg.density ?? 1, 0, 2);
    applyWeatherPatch(kind, { density }, true, 0);
  }

  function setWind(value) {
    const windCfg = cfg.getWeatherConfig("wind");
    const displaySpeed = normalizeNumber(value, (windCfg.speed ?? 0.5) * 2, 0.25, 5);
    const isWindActive = normalizeWeatherKind(cfg.config.global.weather || "clear", "clear") === "wind";
    applyWeatherPatch("wind", { speed: displaySpeed / 2 }, isWindActive, 0);
  }

  function setQuality(level) {
    setDprLevel(level);
  }

  function getState() {
    const state = window.WeatherCommon?.getState?.();
    return {
      ...cfg.getGlobalConfig(),
      weather: cfg.config.global.weather,
      time: cfg.config.global.time,
      dprLevel: cfg.config.global.dprLevel,
      canvas: state || null,
    };
  }

  function destroy() {
    enqueue(() => window.WeatherCommon?.destroy());
  }

  // URL 参数仅用于本地预览。
  const params = new URLSearchParams(window.location.search);
  const patch = {};
  if (params.has("mode")) patch.weather = params.get("mode");
  if (params.has("time")) patch.time = params.get("time");
  if (params.has("autoTime")) {
    const value = params.get("autoTime");
    patch.autoTime = value === "1" || value === "true";
  }
  if (params.has("dpr")) {
    patch.dprLevel = params.get("dpr");
  }
  if (params.has("transition")) patch.transitionMs = parseFloat(params.get("transition"));
  if (params.has("fps")) {
    const value = parseFloat(params.get("fps"));
    patch.fpsLimit = value;
    patch.fpsOverride = Number.isFinite(value) && value > 0;
  }
  if (params.has("autoWeatherRange")) {
    patch.autoWeatherRange = parseWeatherRange(params.get("autoWeatherRange"));
  }
  if (params.has("particleDensity")) {
    const value = parseFloat(params.get("particleDensity"));
    const target = patch.weather || cfg.config.global.weather || "clear";
    const weatherCfg = cfg.getWeatherConfig(target);
    weatherCfg.density = normalizeNumber(value, weatherCfg.density ?? 1, 0, 2);
    cfg.saveConfig();
  }
  if (params.has("showFps")) patch.showFps = params.get("showFps") === "1";
  if (params.has("debug")) patch.debug = params.get("debug") === "1";
  if (Object.keys(patch).length) {
    cfg.applyGlobalPatch(patch);
    cfg.saveConfig();
  }

  window.WeatherBG = {
    setMode,
    setTimeOfDay,
    setAutoTime,
    setDprLevel,
    setIntensity,
    setWind,
    setQuality,
    getState,
    destroy,
  };

  // Wallpaper Engine 监听器必须挂全局且支持增量字段。
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      if (!properties) return;
      const userPatch = {};
      const weatherPatch = {};
      let refresh = false;
      let resize = false;
      let transitionMs = cfg.getGlobalConfig()?.transitionMs ?? 800;
      let autoTimeChanged = false;
      let weatherDirty = false;

      if (properties.mode?.value !== undefined) {
        userPatch.weather = normalizeWeatherKind(properties.mode.value, cfg.config.global.weather || "clear");
        refresh = true;
      }
      if (properties.autotime?.value !== undefined) {
        userPatch.autoTime = parseBool(properties.autotime.value);
        refresh = true;
        autoTimeChanged = true;
      }
      const timeOfDayProperty = getFirstDefinedProperty(properties, ["timeofday", "timeOfDay"]);
      if (timeOfDayProperty?.value !== undefined) {
        userPatch.time = timeOfDayProperty.value;
        if (!autoTimeChanged) {
          userPatch.autoTime = false;
        }
        refresh = true;
      }
      if (properties.randomtime?.value !== undefined) {
        userPatch.randomTime = parseBool(properties.randomtime.value);
      }
      if (properties.sunrisetime?.value !== undefined) {
        userPatch.sunriseTime = String(properties.sunrisetime.value);
        if (cfg.config.global.autoTime || userPatch.autoTime === true) {
          refresh = true;
        }
      }
      if (properties.sunsettime?.value !== undefined) {
        userPatch.sunsetTime = String(properties.sunsettime.value);
        if (cfg.config.global.autoTime || userPatch.autoTime === true) {
          refresh = true;
        }
      }
      if (properties.autoweather?.value !== undefined) {
        userPatch.autoWeather = parseBool(properties.autoweather.value);
      }
      if (properties.autoweatherinterval?.value !== undefined) {
        userPatch.autoWeatherInterval = normalizeNumber(
          properties.autoweatherinterval.value,
          cfg.config.global.autoWeatherInterval ?? 5,
          0.5,
          60
        );
      }
      if (properties.autoweatherrange?.value !== undefined) {
        const range = parseWeatherRange(properties.autoweatherrange.value);
        userPatch.autoWeatherRange = range.length ? range : normalizeAutoWeatherRange();
      }
      const targetWeather = normalizeWeatherKind(userPatch.weather || cfg.config.global.weather || "clear", "clear");
      const weatherCfg = cfg.getWeatherConfig(targetWeather);

      const densityProperty = getFirstDefinedProperty(properties, ["particledensity", "intensity"]);
      if (densityProperty?.value !== undefined) {
        weatherPatch.density = normalizeNumber(
          densityProperty.value,
          weatherCfg.density ?? 1,
          0,
          2
        );
        weatherDirty = true;
        refresh = true;
      }
      let rangeTouched = false;
      const rangeSet = new Set(normalizeAutoWeatherRange());
      Object.entries(AUTO_WEATHER_RANGE_KEYS).forEach(([key, kind]) => {
        const item = properties[key];
        if (item?.value === undefined) return;
        rangeTouched = true;
        if (parseBool(item.value)) {
          rangeSet.add(kind);
        } else {
          rangeSet.delete(kind);
        }
      });
      if (rangeTouched) {
        const allowed = cfg.constants?.WEATHER_KINDS || [];
        const normalized = Array.from(rangeSet).filter((kind) => allowed.includes(kind));
        userPatch.autoWeatherRange = normalized.length ? normalized : allowed.slice();
        const autoWeatherEnabled = ("autoWeather" in userPatch)
          ? userPatch.autoWeather === true
          : cfg.config.global.autoWeather === true;
        if (autoWeatherEnabled) {
          const currentWeather = userPatch.weather || cfg.config.global.weather || "clear";
          if (userPatch.autoWeatherRange.length && !userPatch.autoWeatherRange.includes(currentWeather)) {
            userPatch.weather = userPatch.autoWeatherRange[0];
            refresh = true;
          }
        }
      }
      if (properties.sunpos?.value !== undefined) {
        userPatch.sunPos = properties.sunpos.value;
        refresh = true;
      }
      if (properties.tilt?.value !== undefined) {
        userPatch.tilt = parseBool(properties.tilt.value);
      }
      if (properties.tiltx?.value !== undefined) {
        userPatch.tiltX = normalizeNumber(properties.tiltx.value, cfg.config.global.tiltX ?? 1, 0, 2);
      }
      if (properties.tilty?.value !== undefined) {
        userPatch.tiltY = normalizeNumber(properties.tilty.value, cfg.config.global.tiltY ?? 1, 0, 2);
      }
      if (properties.resetstorage?.value !== undefined) {
        const shouldReset = parseBool(properties.resetstorage.value);
        if (shouldReset && !lastResetStorage) {
          lastResetStorage = true;
          resetLocalStorage();
          return;
        }
        lastResetStorage = shouldReset;
      }
      const dprProperty = getFirstDefinedProperty(properties, ["dprlevel", "quality"]);
      if (dprProperty?.value !== undefined) {
        userPatch.dprLevel = String(dprProperty.value);
        resize = true;
      }
      if (properties.fpslimit?.value !== undefined) {
        const value = parseFloat(String(properties.fpslimit.value));
        const fps = Number.isFinite(value) ? value : 0;
        userPatch.fpsOverride = fps > 0;
        userPatch.fpsLocked = true;
        if (fps > 0) {
          userPatch.fpsLimit = fps;
        } else {
          userPatch.fpsLimit = weFpsLimit > 0 ? weFpsLimit : 0;
        }
      }
      if (properties.showfps?.value !== undefined) {
        userPatch.showFps = parseBool(properties.showfps.value);
      }
      if (properties.transitionms?.value !== undefined) {
        userPatch.transitionMs = normalizeNumber(
          properties.transitionms.value,
          cfg.config.global.transitionMs ?? 800,
          0,
          4000
        );
        transitionMs = userPatch.transitionMs;
      }

      if ("weather" in userPatch) {
        const randomTimeEnabled = ("randomTime" in userPatch)
          ? userPatch.randomTime === true
          : cfg.config.global.randomTime === true;
        const autoWeatherEnabled = ("autoWeather" in userPatch)
          ? userPatch.autoWeather === true
          : cfg.config.global.autoWeather === true;
        if (randomTimeEnabled && autoWeatherEnabled) {
          userPatch.time = Math.random() < 0.5 ? "day" : "night";
          userPatch.autoTime = false;
          refresh = true;
        }
      }

      if (properties.animate?.value !== undefined) {
        weatherPatch.animate = parseBool(properties.animate.value);
        weatherDirty = true;
        refresh = true;
      }
      if (properties.speed?.value !== undefined) {
        const displaySpeed = normalizeNumber(properties.speed.value, weatherCfg.speed ?? 1, 0.25, 5);
        const isWind = targetWeather === "wind" || targetWeather === "hail";
        weatherPatch.speed = isWind ? displaySpeed / 2 : displaySpeed;
        weatherDirty = true;
        refresh = true;
      }
      if (properties.wind?.value !== undefined) {
        const windCfg = cfg.getWeatherConfig("wind");
        const displaySpeed = normalizeNumber(properties.wind.value, (windCfg.speed ?? 0.5) * 2, 0.25, 5);
        windCfg.speed = displaySpeed / 2;
        cfg.saveConfig();
        window.WeatherUI?.syncWeatherControls?.();
        if (targetWeather === "wind") {
          refresh = true;
        }
      }
      if (properties.flash?.value !== undefined) {
        weatherPatch.flash = parseBool(properties.flash.value);
        weatherDirty = true;
        refresh = true;
      }
      if (properties.clouddrift?.value !== undefined) {
        weatherPatch.cloudDrift = parseBool(properties.clouddrift.value);
        weatherDirty = true;
        refresh = true;
      }
      if (properties.clouddriftspeed?.value !== undefined) {
        weatherPatch.cloudDriftSpeed = normalizeNumber(
          properties.clouddriftspeed.value,
          weatherCfg.cloudDriftSpeed ?? 1,
          0,
          10
        );
        weatherDirty = true;
        refresh = true;
      }
      if (properties.clouddriftdirection?.value !== undefined) {
        weatherPatch.cloudDriftDirection = properties.clouddriftdirection.value;
        weatherDirty = true;
        refresh = true;
      }

      if (weatherDirty) {
        Object.assign(weatherCfg, weatherPatch);
        cfg.saveConfig();
        window.WeatherUI?.syncWeatherControls?.();
      }

      applyPatch(userPatch, refresh, resize, transitionMs);
    },
    applyGeneralProperties(properties) {
      if (!properties) return;
      if (properties.fps !== undefined) {
        weFpsLimit = properties.fps;
        const override = cfg.getGlobalConfig()?.fpsOverride === true;
        if (override) return;
        cfg.applyGlobalPatch({ fpsLimit: properties.fps, fpsLocked: true });
        cfg.saveConfig();
        window.WeatherUI?.syncFpsControls?.();
      }
    },
  };
})();
