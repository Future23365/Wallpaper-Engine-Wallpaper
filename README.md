# 几何风格动态天气壁纸

基于 Canvas 2D 的几何风格动态天气 Web 壁纸，可离线运行，并适配 Wallpaper Engine。

[Steam 创意工坊](https://steamcommunity.com/sharedfiles/filedetails/?id=3642026954)

![动态天气效果预览](Wallpaper%20Engine/preview.gif)

## 功能概览

- 支持晴、多云、阴、雾、霾、雨、雨夹雪、雪、冰雹、雷、雷暴、风等天气场景。
- 支持白天/夜晚、自动昼夜、随机昼夜与自动天气切换。
- 支持粒子密度、动画速度、云层漂移、闪电、鼠标倾斜、FPS、DPR 等参数配置。
- 纯静态资源运行，无需构建，适合导入 Wallpaper Engine。
- 默认隐藏调试 UI，可通过 URL 参数开启本地预览控制面板。

## 项目缘起

我以前很喜欢 [几何天气](https://github.com/WangDaYeeeeee/GeometricWeather) 的动态天气效果，也长期把它作为手机动态壁纸使用。后来这个项目维护变少，新的开发者 Fork 版本 [微风天气](https://github.com/breezy-weather/breezy-weather) 仍在持续维护。

因为 Wallpaper Engine 支持 Web 壁纸，我用 AI 辅助把微风天气中的动态天气效果迁移到了 Web 版，于是有了这个项目。

## 使用方式

### Wallpaper Engine

在 Wallpaper Engine 中创建或导入 Web 壁纸，入口文件选择：

```text
Wallpaper Engine/index.html
```

项目资源均为本地相对路径，导入后无需网络请求。

### 浏览器本地预览

可以直接打开：

```text
Wallpaper Engine/index.html
```

也可以在项目根目录启动静态服务器：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080/Wallpaper%20Engine/
```

常用预览示例：

```text
http://localhost:8080/Wallpaper%20Engine/?mode=rain&time=night&debug=1
```

## 常用配置

| 配置 | 说明 | 常用值 |
| --- | --- | --- |
| `mode` | 天气模式 | `clear` / `cloud` / `cloudy` / `rain` / `snow` / `thunderstorm` 等 |
| `timeofday` | 昼夜模式 | `day` / `night` |
| `particledensity` | 当前天气粒子密度 | `0 ~ 2` |
| `speed` | 当前天气动画速度 | `0.25 ~ 5` |
| `fpslimit` | 帧率上限 | `0` 跟随 Wallpaper Engine 全局 FPS，也可固定为 `30` / `60` 等 |
| `dprlevel` | 渲染像素密度 | `auto` 最高质量；固定档位可降显存和填充压力 |
| `transitionms` | 场景切换过渡时间 | `0 ~ 4000` 毫秒 |
| `showfps` | 显示 FPS 叠层 | `true` / `false` |

天气模式兼容两套命名：

| 外部推荐名 | 当前实现兼容名 | 说明 |
| --- | --- | --- |
| `partly_cloudy` | `cloud` | 多云 |
| `overcast` | `cloudy` | 阴 |

## Wallpaper Engine 属性清单与映射

在 Wallpaper Engine 的“壁纸设置 > 属性”中添加以下用户属性。字段名需与表格一致，建议统一小写。

| WE 字段名 | 类型 | 建议范围/枚举 | 默认值 | 说明 | Config 字段 |
| --- | --- | --- | --- | --- | --- |
| `mode` | 选项 | `clear` / `cloud(partly_cloudy)` / `cloudy(overcast)` / `fog` / `haze` / `rain` / `sleet` / `snow` / `hail` / `thunder` / `thunderstorm` / `wind` | `clear` | 天气模式；括号内为外部 API 兼容别名 | `weather` |
| `timeofday` | 选项 | `day` / `night` | `day` | 昼夜模式 | `time` |
| `autotime` | 开关 | `true` / `false` | `false` | 自动昼夜切换，使用日出/日落时间 | `autoTime` |
| `randomtime` | 开关 | `true` / `false` | `false` | 自动切换天气时随机切换昼夜 | `randomTime` |
| `sunrisetime` | 文本 | `HH:MM` | `06:00` | 日出时间 | `sunriseTime` |
| `sunsettime` | 文本 | `HH:MM` | `18:00` | 日落时间 | `sunsetTime` |
| `autoweather` | 开关 | `true` / `false` | `false` | 自动切换天气 | `autoWeather` |
| `autoweatherinterval` | 选项 | `0.5` / `1` / `5` / `10` / `15` / `30` / `60` | `5` | 自动切换间隔，单位分钟 | `autoWeatherInterval` |
| `autoweatherrange` | 文本 | 逗号分隔的天气列表 | 全部天气 | 自动切换天气范围 | `autoWeatherRange` |
| `autoweatherclear` | 开关 | `true` / `false` | `true` | 自动切换范围：晴 | `autoWeatherRange` |
| `autoweathercloud` | 开关 | `true` / `false` | `true` | 自动切换范围：多云 | `autoWeatherRange` |
| `autoweathercloudy` | 开关 | `true` / `false` | `true` | 自动切换范围：阴 | `autoWeatherRange` |
| `autoweatherfog` | 开关 | `true` / `false` | `true` | 自动切换范围：雾 | `autoWeatherRange` |
| `autoweatherhaze` | 开关 | `true` / `false` | `true` | 自动切换范围：霾 | `autoWeatherRange` |
| `autoweatherrain` | 开关 | `true` / `false` | `true` | 自动切换范围：雨 | `autoWeatherRange` |
| `autoweathersleet` | 开关 | `true` / `false` | `true` | 自动切换范围：雨夹雪 | `autoWeatherRange` |
| `autoweathersnow` | 开关 | `true` / `false` | `true` | 自动切换范围：雪 | `autoWeatherRange` |
| `autoweatherhail` | 开关 | `true` / `false` | `true` | 自动切换范围：冰雹 | `autoWeatherRange` |
| `autoweatherthunder` | 开关 | `true` / `false` | `true` | 自动切换范围：雷 | `autoWeatherRange` |
| `autoweatherthunderstorm` | 开关 | `true` / `false` | `true` | 自动切换范围：雷暴 | `autoWeatherRange` |
| `autoweatherwind` | 开关 | `true` / `false` | `true` | 自动切换范围：风 | `autoWeatherRange` |
| `animate` | 开关 | `true` / `false` | `true` | 当前天气动画开关 | `perWeather.<weather>.animate` |
| `particledensity` | 滑块 | `0 ~ 2` | `1` | 当前天气粒子密度 | `perWeather.<weather>.density` |
| `speed` | 滑块 | `0.25 ~ 5` | `1` | 当前天气速度缩放 | `perWeather.<weather>.speed` |
| `clouddrift` | 开关 | `true` / `false` | `true` | 当前天气云层移动 | `perWeather.<weather>.cloudDrift` |
| `clouddriftdirection` | 选项 | `left` / `right` / `random` | `random` | 当前天气云层移动方向 | `perWeather.<weather>.cloudDriftDirection` |
| `clouddriftspeed` | 滑块 | `0 ~ 10` | `1` | 当前天气云层移动速度 | `perWeather.<weather>.cloudDriftSpeed` |
| `flash` | 开关 | `true` / `false` | `true` | 当前天气闪电闪屏，仅雷/雷暴有效 | `perWeather.<weather>.flash` |
| `sunpos` | 选项 | `left` / `center` / `right` | `right` | 太阳位置 | `sunPos` |
| `tilt` | 开关 | `true` / `false` | `false` | 鼠标倾斜 | `tilt` |
| `tiltx` | 滑块 | `0 ~ 2` | `1` | 左右倾斜强度 | `tiltX` |
| `tilty` | 滑块 | `0 ~ 2` | `1` | 上下倾斜强度 | `tiltY` |
| `resetstorage` | 开关 | `true` / `false` | `false` | 清除本地 `localStorage`，一次性触发 | - |
| `fpslimit` | 选项 | `0` / `30` / `45` / `60` / `90` / `120` / `144` | `0` | 帧率上限；`0` 跟随 WE 全局 FPS | `fpsLimit` |
| `dprlevel` | 选项 | `auto` / `2` / `1.5` / `1.25` / `1` / `0.75` / `0.5` | `auto` | DPR 档位；`auto` 跟随设备 DPR 追求最高质量，固定档位作为上限/降档 | `dprLevel` |
| `transitionms` | 滑块 | `0 ~ 4000` | `800` | 场景切换过渡时间，单位毫秒 | `transitionMs` |
| `showfps` | 开关 | `true` / `false` | `false` | 是否显示 FPS | `showFps` |

Wallpaper Engine 还会通过 `applyGeneralProperties` 下发全局 FPS：

| WE 字段 | Config 字段 | 说明 |
| --- | --- | --- |
| `fps` | `fpsLimit` | Wallpaper Engine 全局帧率上限；当 `fpslimit=0` 时自动采用该值 |

## 全局设置与天气设置

全局设置会影响所有天气：

- `mode`
- `timeofday`
- `autotime`
- `randomtime`
- `sunrisetime`
- `sunsettime`
- `sunpos`
- `autoweather`
- `autoweatherinterval`
- `autoweather*`
- `tilt`
- `tiltx`
- `tilty`
- `fpslimit`
- `showfps`
- `dprlevel`
- `transitionms`
- `resetstorage`

天气设置只影响当前天气：

- `animate`
- `particledensity`
- `speed`
- `clouddrift`：仅云/阴/雾/霾/雷有效
- `clouddriftdirection`：仅云/阴/雾/霾/雷有效
- `clouddriftspeed`：仅云/阴/雾/霾/雷有效
- `flash`：仅雷/雷暴有效

## URL 参数

URL 参数主要用于浏览器预览和调试：

| 参数 | 说明 |
| --- | --- |
| `mode` | 天气模式，支持 `clear` / `cloud` / `cloudy` / `fog` / `haze` / `rain` / `sleet` / `snow` / `hail` / `thunder` / `thunderstorm` / `wind`，也兼容 `partly_cloudy` / `overcast` |
| `time` | `day` 或 `night` |
| `autoTime` | `1` 或 `true` 开启自动昼夜 |
| `dpr` | DPR 档位，支持 `auto` / `2` / `1.5` / `1.25` / `1` / `0.75` / `0.5` |
| `particleDensity` | 当前天气粒子密度，范围 `0 ~ 2` |
| `transition` | 切换过渡时间，单位毫秒 |
| `autoWeatherRange` | 自动切换天气范围，逗号分隔 |
| `debug` | `1` 显示调试 UI |
| `fps` | 帧率上限，`0` 表示自动 |
| `showFps` | `1` 显示 FPS 叠层 |

## Web 内部 API

项目会在全局暴露 `window.WeatherBG`：

```js
window.WeatherBG.setMode("rain", 800);
window.WeatherBG.setTimeOfDay("night");
window.WeatherBG.setIntensity(1.2);
window.WeatherBG.setWind(2);
window.WeatherBG.setQuality("1");
```

| API | 说明 |
| --- | --- |
| `setMode(mode, transitionMs = 800)` | 切换天气；`partly_cloudy` 会兼容为 `cloud`，`overcast` 会兼容为 `cloudy` |
| `setTimeOfDay('day'|'night')` | 切换昼夜 |
| `setAutoTime(enabled)` | 开启或关闭自动昼夜 |
| `setIntensity(x)` | 设置当前天气粒子密度，范围 `0 ~ 2` |
| `setWind(x)` | 设置风天气的速度强度，范围 `0.25 ~ 5` |
| `setDprLevel(level)` | 设置 DPR 档位 |
| `setQuality(level)` | 设置 DPR 档位，等同于 `setDprLevel(level)` |
| `getState()` | 读取当前配置与画布状态 |
| `destroy()` | 停止动画并解绑事件 |

## 调试与性能说明

- `debug=1` 会显示调试 UI；默认运行时不显示控制面板。
- `showfps=true` 会显示 FPS 与 DT，便于判断限帧是否生效。
- 帧率限制只减少更新/渲染次数，动画速度由时间步长决定，不会随帧率变化而变慢。
- `dprlevel=auto` 会跟随设备 DPR，画质最高；固定 DPR 档位会限制渲染像素密度，降低显存与填充压力。
- `resetstorage` 为一次性触发：清空本地配置后恢复默认值，等待 Wallpaper Engine 下发新配置再覆盖。
- 自动昼夜不读取系统位置，请手动配置 `sunrisetime` / `sunsettime`。

## 目录结构

```text
.
├── README.md
├── Wallpaper Engine/
│   ├── index.html
│   ├── preview.gif
│   ├── project.json
│   └── src/
└── ui-weather-view/
```

关键目录说明：

- `Wallpaper Engine/index.html`：Wallpaper Engine Web 壁纸入口。
- `Wallpaper Engine/src/`：天气效果、配置、UI 与 WE 适配代码。
- `Wallpaper Engine/src/we-adapter.js`：Wallpaper Engine 属性监听与 `window.WeatherBG` API。
- `ui-weather-view/`：微风天气动态天气效果代码备份。

## 特别鸣谢

- [几何天气](https://github.com/WangDaYeeeeee/GeometricWeather)
- [微风天气](https://github.com/breezy-weather/breezy-weather)
