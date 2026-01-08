# 材质风格天气动态壁纸（Wallpaper Engine 适配版）

几年前使用过一款天气app：[几何天气](https://github.com/WangDaYeeeeee/GeometricWeather)，很喜欢这款天气app的动态天气效果，一直把它的动态天气当我我的手机动态壁纸使用。后面换了iPhone，就没关注过这个app了，再后来又换回了Android，发现这个app的作者很少维护了，有些惋惜，不过有了新的开发者接手了Fork了一份接手了原项目：[微风天气](https://github.com/breezy-weather/breezy-weather)，不过之前有一段时间动态壁纸有些问题，好像把这个功能删掉了，后面也没咋关注过项目，只是在手机里下载了当作精致app留念。
看到最近的Vibe Coding比较流行，于是就用Codex辅助，把[微风天气](https://github.com/breezy-weather/breezy-weather)这个项目的动态壁纸部分的效果放到了web上，正好Wallpaper Engine也支持web壁纸，索性就用codex做了起来，于是就有了这个项目。

## 运行方式
- 直接打开 `Wallpaper Engine/index.html`（纯静态，无需构建）
- 或在项目根目录启动本地静态服务器：
  - `python3 -m http.server 8080`
  - 浏览器访问 `http://localhost:8080/Wallpaper%20Engine/`

## Wallpaper Engine 使用
- 在 WE 中选择 `Wallpaper Engine/index.html`
- 关闭网络访问（本项目默认无网络依赖）
- 如需调试面板，加上 `?debug=1` 打开 UI

## Wallpaper Engine 属性清单与映射
在 WE 的“壁纸设置 > 属性”中添加以下用户属性（字段名需与表格一致，统一小写）。
表格同时给出 Config 映射，便于维护。

| WE 字段名 | 类型 | 建议范围/枚举 | 默认值 | 说明 | Config 字段 |
| --- | --- | --- | --- | --- | --- |
| mode | 选项 | clear / cloud / cloudy / fog / haze / rain / sleet / snow / hail / thunder / thunderstorm / wind | clear | 天气模式 | weather |
| timeofday | 选项 | day / night | day | 昼夜模式 | time |
| autotime | 开关 | true / false | false | 自动昼夜切换（使用日出/日落时间） | autoTime |
| randomtime | 开关 | true / false | false | 随机切换昼夜（仅自动切换天气时生效） | randomTime |
| sunrisetime | 文本 | HH:MM | 06:00 | 日出时间（用于自动昼夜） | sunriseTime |
| sunsettime | 文本 | HH:MM | 18:00 | 日落时间（用于自动昼夜） | sunsetTime |
| autoweather | 开关 | true / false | false | 自动切换天气 | autoWeather |
| autoweatherinterval | 选项 | 0.5 / 1 / 5 / 10 / 15 / 30 / 60 | 5 | 自动切换间隔（分钟） | autoWeatherInterval |
| autoweatherrange | 文本 | 逗号分隔的天气列表 | clear,cloud,cloudy,fog,haze,rain,sleet,snow,hail,thunder,thunderstorm,wind | 自动切换天气范围（文本输入） | autoWeatherRange |
| autoweatherclear | 开关 | true / false | true | 自动切换范围-晴 | autoWeatherRange |
| autoweathercloud | 开关 | true / false | true | 自动切换范围-多云 | autoWeatherRange |
| autoweathercloudy | 开关 | true / false | true | 自动切换范围-阴 | autoWeatherRange |
| autoweatherfog | 开关 | true / false | true | 自动切换范围-雾 | autoWeatherRange |
| autoweatherhaze | 开关 | true / false | true | 自动切换范围-霾 | autoWeatherRange |
| autoweatherrain | 开关 | true / false | true | 自动切换范围-雨 | autoWeatherRange |
| autoweathersleet | 开关 | true / false | true | 自动切换范围-雨夹雪 | autoWeatherRange |
| autoweathersnow | 开关 | true / false | true | 自动切换范围-雪 | autoWeatherRange |
| autoweatherhail | 开关 | true / false | true | 自动切换范围-冰雹 | autoWeatherRange |
| autoweatherthunder | 开关 | true / false | true | 自动切换范围-雷 | autoWeatherRange |
| autoweatherthunderstorm | 开关 | true / false | true | 自动切换范围-雷暴 | autoWeatherRange |
| autoweatherwind | 开关 | true / false | true | 自动切换范围-风 | autoWeatherRange |
| animate | 开关 | true / false | true | 动画开关（当前天气） | perWeather.<weather>.animate |
| particledensity | 滑块 | 0 ~ 2 | 1 | 粒子密度（当前天气） | perWeather.<weather>.density |
| speed | 滑块 | 0.25 ~ 5 | 1 | 速度缩放（当前天气） | perWeather.<weather>.speed |
| clouddrift | 开关 | true / false | true | 云层移动（当前天气） | perWeather.<weather>.cloudDrift |
| clouddriftdirection | 选项 | left / right / random | random | 云层移动方向（当前天气） | perWeather.<weather>.cloudDriftDirection |
| clouddriftspeed | 滑块 | 0 ~ 10 | 1 | 云层移动速度（当前天气） | perWeather.<weather>.cloudDriftSpeed |
| flash | 开关 | true / false | true | 闪屏（当前天气） | perWeather.<weather>.flash |
| sunpos | 选项 | left / center / right | right | 太阳位置 | sunPos |
| tilt | 开关 | true / false | false | 鼠标倾斜 | tilt |
| tiltx | 滑块 | 0 ~ 2 | 1 | 左右倾斜强度 | tiltX |
| tilty | 滑块 | 0 ~ 2 | 1 | 上下倾斜强度 | tiltY |
| resetstorage | 开关 | true / false | false | 清除本地 localStorage（一次性触发） | - |
| fpslimit | 选项 | 0 / 30 / 45 / 60 / 90 / 120 / 144 | 0 | 帧率上限（0 自动跟随 WE 全局帧率） | fpsLimit |
| dprlevel | 选项 | auto / 2 / 1.5 / 1.25 / 1 / 0.75 / 0.5 | auto | DPR 档位（自动跟随设备） | dprLevel |
| transitionms | 滑块 | 0 ~ 4000 | 800 | 场景切换过渡时间（毫秒） | transitionMs |
| showfps | 开关 | true / false | false | 是否显示 FPS | showFps |

WE `applyGeneralProperties`：

| WE 字段 | Config 字段 | 说明 |
| --- | --- | --- |
| fps | fpsLimit | 帧率上限 |

当 `fpslimit=0` 时会自动采用 WE 的全局 `fps`。

## 全局设置 vs 每个天气设置
以下为配置归属，便于理解哪些参数影响全局，哪些只影响当前天气：

全局设置（对所有天气生效）：
- `mode`（天气）
- `timeofday`（昼夜模式）
- `autotime`（自动昼夜切换）
- `randomtime`（随机切换昼夜）
- `sunrisetime`（日出时间）
- `sunsettime`（日落时间）
- `sunpos`（太阳位置）
- `autoweather`（自动切换天气）
- `autoweatherinterval`（切换间隔）
- `autoweather*`（自动范围-各天气）
- `tilt`（鼠标倾斜）
- `tiltx`（鼠标左右倾斜强度）
- `tilty`（鼠标上下倾斜强度）
- `fpslimit`（帧率上限）
- `showfps`（显示 FPS）
- `dprlevel`（DPR 档位）
- `transitionms`（切换过渡时间）
- `resetstorage`（清除本地缓存）

每个天气设置（只影响当前天气）：
- `animate`（动画）
- `particledensity`（粒子密度）
- `speed`（速度缩放）
- `clouddrift`（云层移动，仅云/阴/雾/霾/雷）
- `clouddriftdirection`（云层方向，仅云/阴/雾/霾/雷）
- `clouddriftspeed`（云层速度，仅云/阴/雾/霾/雷）
- `flash`（闪屏，仅雷/雷暴）

## URL 参数（浏览器预览用）
- `mode`：天气模式（clear / cloud / cloudy / fog / haze / rain / sleet / snow / hail / thunder / thunderstorm / wind）
- `time`：`day` 或 `night`
- `autoTime`：`1` 或 `true` 开启自动切换昼夜
- `dpr`：DPR 档位（auto / 2 / 1.5 / 1.25 / 1 / 0.75 / 0.5）
- `particleDensity`：粒子密度（0 ~ 2，作用于当前天气）
- `transition`：切换过渡时间（毫秒）
- `autoWeatherRange`：自动切换天气范围（逗号分隔）
- `debug`：`1` 显示调试 UI
- `fps`：帧率上限（数字，0 表示自动）
- `showFps`：`1` 显示 FPS 叠层

示例：
`Wallpaper%20Engine/index.html?mode=rain&time=night&debug=1`


## 调试与性能说明
- 帧率限制仅减少更新/渲染次数，动画速度由时间步长决定，不会随帧率变化而变慢。
- `showfps=true` 会显示 FPS 与 DT（平均帧间隔，ms），用于判断限帧是否生效。
- `dprlevel` 会限制渲染像素密度，降低显存与填充压力。
- `resetstorage` 为一次性触发：清空本地配置后会恢复默认值，等待 WE 下发新配置再覆盖。
- WE 的“性能”面板可设置 FPS 上限，对应 `applyGeneralProperties.fps`，无需手动添加属性。
- 自动昼夜不读取系统位置，请配置 `sunrisetime`/`sunsettime`。

## 结构说明
- `ui-weather-view`[微风天气](https://github.com/breezy-weather/breezy-weather)的动态天气效果代码的备份。
- `Wallpaper Engine/index.html`：WE 默认入口
- `Wallpaper Engine/src/`：核心实现（保留原有天气效果）
- `Wallpaper Engine/src/we-adapter.js`：WE 适配层与对外 API

## 特别鸣谢
- [几何天气](https://github.com/WangDaYeeeeee/GeometricWeather)
- [微风天气](https://github.com/breezy-weather/breezy-weather)