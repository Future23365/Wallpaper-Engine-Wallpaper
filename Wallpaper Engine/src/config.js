(() => {
  // 本地存储键，用于持久化调试配置。
  const STORAGE_KEY = "breezy_weather_html_config";
  const AUTO_WEATHER_DEFAULT_MIN = 5;
  const WEATHER_KINDS = [
    "clear",
    "cloud",
    "cloudy",
    "fog",
    "haze",
    "rain",
    "sleet",
    "snow",
    "hail",
    "thunder",
    "thunderstorm",
    "wind",
  ];
  const DPR_LEVELS = ["auto", "2", "1.5", "1.25", "1", "0.75", "0.5"];
  const DEFAULT_GLOBAL = {
    time: "day",
    weather: "clear",
    autoTime: false,
    tilt: false,
    tiltX: 1,
    tiltY: 1,
    sunPos: "right",
    sunriseTime: "06:00",
    sunsetTime: "18:00",
    autoWeather: false,
    autoWeatherInterval: AUTO_WEATHER_DEFAULT_MIN,
    autoWeatherRange: WEATHER_KINDS.slice(),
    dprLevel: "auto",
    fpsLimit: 0,
    debug: false,
    transitionMs: 800,
    showFps: false,
    randomTime: false,
    fpsOverride: false,
    fpsLocked: false,
  };

  function normalizeNumber(value, fallback, min, max) {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(parsed)) return fallback;
    if (typeof min === "number" && parsed < min) return min;
    if (typeof max === "number" && parsed > max) return max;
    return parsed;
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === "boolean") return value;
    return fallback;
  }

  function normalizeString(value, fallback) {
    return typeof value === "string" && value.length ? value : fallback;
  }

  function normalizeTimeString(value, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return fallback;
    return trimmed;
  }

  function normalizeWeatherRange(value, fallback) {
    const allowed = WEATHER_KINDS;
    let list = [];
    if (Array.isArray(value)) {
      list = value;
    } else if (typeof value === "string") {
      list = value.split(/[\s,|]+/);
    } else {
      return Array.isArray(fallback) ? fallback.slice() : allowed.slice();
    }
    const filtered = list
      .map((item) => String(item).trim())
      .filter((item) => allowed.includes(item));
    const unique = Array.from(new Set(filtered));
    if (!unique.length) {
      return Array.isArray(fallback) ? fallback.slice() : allowed.slice();
    }
    return unique;
  }

  function normalizeDprLevel(value, fallback) {
    if (value === "auto") return "auto";
    const parsed = typeof value === "number" ? String(value) : String(value || "");
    if (DPR_LEVELS.includes(parsed)) return parsed;
    return fallback;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          global: { ...DEFAULT_GLOBAL },
          perWeather: {}
        };
      }
      const parsed = JSON.parse(raw);
      return {
        global: {
          time: normalizeString(parsed.global?.time, DEFAULT_GLOBAL.time),
          weather: normalizeString(parsed.global?.weather, DEFAULT_GLOBAL.weather),
          autoTime: normalizeBoolean(parsed.global?.autoTime, DEFAULT_GLOBAL.autoTime),
          tilt: normalizeBoolean(parsed.global?.tilt, DEFAULT_GLOBAL.tilt),
          tiltX: normalizeNumber(parsed.global?.tiltX, DEFAULT_GLOBAL.tiltX, 0, 2),
          tiltY: normalizeNumber(parsed.global?.tiltY, DEFAULT_GLOBAL.tiltY, 0, 2),
          sunPos: normalizeString(parsed.global?.sunPos, DEFAULT_GLOBAL.sunPos),
          sunriseTime: normalizeTimeString(parsed.global?.sunriseTime, DEFAULT_GLOBAL.sunriseTime),
          sunsetTime: normalizeTimeString(parsed.global?.sunsetTime, DEFAULT_GLOBAL.sunsetTime),
          autoWeather: normalizeBoolean(parsed.global?.autoWeather, DEFAULT_GLOBAL.autoWeather),
          autoWeatherInterval: normalizeNumber(
            parsed.global?.autoWeatherInterval,
            DEFAULT_GLOBAL.autoWeatherInterval,
            0.5,
            60
          ),
          autoWeatherRange: normalizeWeatherRange(
            parsed.global?.autoWeatherRange,
            DEFAULT_GLOBAL.autoWeatherRange
          ),
          dprLevel: normalizeDprLevel(parsed.global?.dprLevel, DEFAULT_GLOBAL.dprLevel),
          fpsLimit: normalizeNumber(parsed.global?.fpsLimit, DEFAULT_GLOBAL.fpsLimit, 0, 240),
          debug: normalizeBoolean(parsed.global?.debug, DEFAULT_GLOBAL.debug),
          transitionMs: normalizeNumber(parsed.global?.transitionMs, DEFAULT_GLOBAL.transitionMs, 0, 4000),
          showFps: normalizeBoolean(parsed.global?.showFps, DEFAULT_GLOBAL.showFps),
          randomTime: normalizeBoolean(parsed.global?.randomTime, DEFAULT_GLOBAL.randomTime),
          fpsOverride: normalizeBoolean(parsed.global?.fpsOverride, DEFAULT_GLOBAL.fpsOverride),
          fpsLocked: normalizeBoolean(parsed.global?.fpsLocked, DEFAULT_GLOBAL.fpsLocked),
        },
        perWeather: parsed.perWeather || {},
      };
    } catch (e) {
      return {
        global: { ...DEFAULT_GLOBAL },
        perWeather: {}
      };
    }
  }

  const config = loadConfig();

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function getWeatherConfig(kind) {
    // 懒初始化各天气默认配置，保持配置体积小。
    if (!config.perWeather[kind]) {
      const baseSpeed = (kind === "wind" || kind === "hail") ? 0.5 : 1;
      const isThunder = kind === "thunder" || kind === "thunderstorm";
      const isCloud = kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder";
      if (isThunder) {
        config.perWeather[kind] = {
          speed: baseSpeed,
          animate: true,
          flash: true,
          density: 1,
          cloudDrift: true,
          cloudDriftSpeed: 1,
          cloudDriftDirection: "random",
        };
      } else if (isCloud) {
        config.perWeather[kind] = {
          speed: baseSpeed,
          animate: true,
          density: 1,
          cloudDrift: true,
          cloudDriftSpeed: 1,
          cloudDriftDirection: "random",
        };
      } else {
        config.perWeather[kind] = { speed: baseSpeed, animate: true, density: 1 };
      }
    }
    if (typeof config.perWeather[kind].density !== "number") {
      config.perWeather[kind].density = 1;
    }
    if ((kind === "thunder" || kind === "thunderstorm")
      && typeof config.perWeather[kind].flash !== "boolean") {
      config.perWeather[kind].flash = true;
    }
    if ((kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder")
      && typeof config.perWeather[kind].cloudDrift !== "boolean") {
      config.perWeather[kind].cloudDrift = true;
    }
    if ((kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder")
      && typeof config.perWeather[kind].cloudDriftSpeed !== "number") {
      config.perWeather[kind].cloudDriftSpeed = 1;
    }
    if ((kind === "cloud" || kind === "cloudy" || kind === "fog" || kind === "haze" || kind === "thunder")
      && typeof config.perWeather[kind].cloudDriftDirection !== "string") {
      config.perWeather[kind].cloudDriftDirection = "random";
    }
    return config.perWeather[kind];
  }

  function applyGlobalPatch(patch) {
    if (!patch) return;
    const global = config.global;
    if ("time" in patch) global.time = normalizeString(patch.time, global.time);
    if ("weather" in patch) global.weather = normalizeString(patch.weather, global.weather);
    if ("autoTime" in patch) global.autoTime = normalizeBoolean(patch.autoTime, global.autoTime);
    if ("tilt" in patch) global.tilt = normalizeBoolean(patch.tilt, global.tilt);
    if ("tiltX" in patch) global.tiltX = normalizeNumber(patch.tiltX, global.tiltX, 0, 2);
    if ("tiltY" in patch) global.tiltY = normalizeNumber(patch.tiltY, global.tiltY, 0, 2);
    if ("sunPos" in patch) global.sunPos = normalizeString(patch.sunPos, global.sunPos);
    if ("sunriseTime" in patch) {
      global.sunriseTime = normalizeTimeString(patch.sunriseTime, global.sunriseTime);
    }
    if ("sunsetTime" in patch) {
      global.sunsetTime = normalizeTimeString(patch.sunsetTime, global.sunsetTime);
    }
    if ("autoWeather" in patch) global.autoWeather = normalizeBoolean(patch.autoWeather, global.autoWeather);
    if ("autoWeatherInterval" in patch) {
      global.autoWeatherInterval = normalizeNumber(patch.autoWeatherInterval, global.autoWeatherInterval, 0.5, 60);
    }
    if ("autoWeatherRange" in patch) {
      global.autoWeatherRange = normalizeWeatherRange(patch.autoWeatherRange, global.autoWeatherRange);
    }
    if ("dprLevel" in patch) global.dprLevel = normalizeDprLevel(patch.dprLevel, global.dprLevel);
    if ("fpsLimit" in patch) global.fpsLimit = normalizeNumber(patch.fpsLimit, global.fpsLimit, 0, 240);
    if ("debug" in patch) global.debug = normalizeBoolean(patch.debug, global.debug);
    if ("transitionMs" in patch) global.transitionMs = normalizeNumber(
      patch.transitionMs,
      global.transitionMs,
      0,
      4000
    );
    if ("showFps" in patch) global.showFps = normalizeBoolean(patch.showFps, global.showFps);
    if ("randomTime" in patch) global.randomTime = normalizeBoolean(patch.randomTime, global.randomTime);
    if ("fpsOverride" in patch) global.fpsOverride = normalizeBoolean(patch.fpsOverride, global.fpsOverride);
    if ("fpsLocked" in patch) global.fpsLocked = normalizeBoolean(patch.fpsLocked, global.fpsLocked);
  }

  window.WeatherConfig = {
    config,
    constants: {
      AUTO_WEATHER_DEFAULT_MIN,
      WEATHER_KINDS,
      DPR_LEVELS,
      DEFAULT_GLOBAL,
    },
    saveConfig,
    getWeatherConfig,
    applyGlobalPatch,
    getGlobalConfig: () => config.global,
  };
})();
