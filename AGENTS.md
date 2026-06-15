# AGENTS.md — Web 动态天气特效背景（用于 Wallpaper Engine）

> 目标：用 HTML/Canvas（优先）实现一套可复用、性能稳定、可配置的动态天气背景动画，视觉效果最终一定要与项目内 ui-weather-view 实现的效果相同；最终可打包进 Wallpaper Engine 作为 PC 动态壁纸运行。

---

## 1. 项目背景与约束

### 运行环境
- 浏览器内运行：Chrome / Edge（Wallpaper Engine 基于 Chromium）
- 离线可用：Wallpaper Engine 场景默认应能在无网络条件运行
- 目标体验：4K 尽量流畅（优先稳定、避免掉帧抖动）
- 实际限帧：遵循 Wallpaper Engine 用户设置的 FPS limit（applyGeneralProperties.properties.fps）

## 2. 核心目标

### 2.1 多天气场景（白天/夜晚）
场景 mode 枚举：
- clear：晴
- partly_cloudy：多云（外部推荐名；当前 WE 发布配置兼容 cloud）
- overcast：阴（外部推荐名；当前 WE 发布配置兼容 cloudy）
- fog：雾
- haze：霾
- rain：雨
- sleet：雨夹雪
- snow：雪
- hail：冰雹
- thunder：雷
- thunderstorm：雷暴
- wind：风

### 2.2 场景平滑切换
- 支持 crossfade / blend（避免硬切）
- 切换时粒子系统不“爆炸式重置”，尽量自然过渡（允许渐出/渐入，避免瞬间清空再满屏生成）

### 2.3 统一配置系统
- 降水密度、粒子大小、云层层次等都可配置
- 配置统一收口到 Config（禁止散落在各个 Scene 里）

### 2.4 适配 Wallpaper Engine
- 参考 Wallpaper Engine Web 壁纸文档：https://docs.wallpaperengine.io/en/web/overview.html
- 支持外部驱动切换（Wallpaper Engine用户属性 + 内部 API）
- 默认隐藏调试 UI（或通过 ?debug=1 开启）
- 禁止网络请求（除非用户明确允许）

---

## 3. 非目标（明确不做）
- 不做真实气象模拟（CFD/真实云体积渲染）
- 不做完整天气 App UI（只做背景特效）
- 不强依赖 WebGL（优先 Canvas 2D；如果性能不足再加 WebGL 分支）

---

## 4. 技术栈建议
- 渲染：Canvas 2D（主线）
- 结构：JavaScript，模块化 Scene + System
---

## 5. 目录结构（建议）

推荐结构（纯静态 / 最稳）：

/index.html
/src
  /core

  /scenes

  /systems

  /ui
    debugPanel.js

---

## 6. 场景设计规范（Scene Contract）



---

## 7. 性能预算与硬指标

### 基础要求
- 尽量复用对象：对象池 / TypedArray（避免 GC 抖动）
- 渐变/路径创建尽量缓存或降频（避免每帧创建大量昂贵对象）
- DPR 必须可配置；auto 档允许无上限跟随 devicePixelRatio 以获得最高质量，固定档位用于降档/封顶

### Wallpaper Engine 特别注意
- 避免高频 DOM 更新（UI 只在 debug 模式）
- 所有资源路径使用相对路径
- 禁止网络请求（除非用户明确允许）

---

## 8. 可配置参数（统一 Config）

参数来源优先级：
1) Wallpaper Engine 用户属性（applyUserProperties）
2) URL querystring（?mode=&intensity=&...，仅开发/浏览器预览用）
3) 内置默认值

---

## 9. 对外 API（Wallpaper Engine 调用）

对外暴露两层入口：

### A) Web 内部 API（给调试/外部脚本用）
- window.WeatherBG.setMode(mode, transitionMs=800)
- window.WeatherBG.setTimeOfDay('day'|'night')
- window.WeatherBG.setIntensity(x)
- window.WeatherBG.setWind(x)
- window.WeatherBG.setQuality(level)
- window.WeatherBG.getState()
- window.WeatherBG.destroy()

### B) Wallpaper Engine 官方属性监听（必须实现）
- 使用 window.wallpaperPropertyListener.applyUserProperties 接收用户属性变化（mode/intensity/wind/quality/timeOfDay 等）
- 使用 window.wallpaperPropertyListener.applyGeneralProperties 读取全局 fps limit

实现要点（必须遵守）：
- applyUserProperties 只包含“变化了的字段”，所以每个属性都要独立 if 判断
- applyGeneralProperties 也可能是部分更新：对 properties.fps 等字段必须判空再使用
- wallpaperPropertyListener 必须挂在全局作用域，避免错过首次加载事件
- 首次加载后通常会调用一次 applyUserProperties 来应用初始值，逻辑必须幂等
- 外部 mode 需兼容 partly_cloudy/overcast，并在 Config 内规范化到当前实现使用的 cloud/cloudy，避免破坏已发布的 Wallpaper Engine 配置

---

## 10. 交付物（Done Definition）

### 必须交付
- index.html 可直接打开运行（或 dist/ 可静态部署）
- 默认场景 + 场景切换 + 强度变化全部可用
- README：运行方式、参数说明、Wallpaper Engine 集成说明
- 生成的所有新增文件需保持可读性与注释质量

### 验收清单
- [ ] 4K 下尽量流畅：以 Wallpaper Engine 的 fps limit 为准
- [ ] debug=0 时无 UI 干扰
- [ ] 离线运行无外部依赖
- [ ] API 调用 + Wallpaper Engine 属性变化可驱动实时变化

---

## 11. 开发步骤


---

## 12. 代码风格与质量要求
- 模块职责清晰：Scene 只拼装系统，不把所有逻辑塞一个文件
- 避免魔法数字：关键参数放 config
- 动画必须使用 requestAnimationFrame
- 允许使用一点“伪物理”让效果更顺：阻尼、噪声漂移、视差
- 所有随机应可控：可选 seed（便于复现与回归对比）
- 添加适当的注释：重点标注参数含义/单位/范围、性能敏感点（为什么这么写、哪些地方不能每帧分配对象）、算法/效果原理（例如噪声/视差/混合策略）、以及 Wallpaper Engine 适配点（applyUserProperties/applyGeneralProperties 的字段映射与判空）

---

## 13. 常见坑与禁止事项
- 不要每帧创建大量对象（粒子必须池化）
- 不要频繁创建渐变/路径导致巨大开销（能缓存就缓存，或降低频率）
- 不要用过多全屏混合/滤镜
- 不要在生产模式保留控制面板默认开启
- 要考虑窗口大小变化（Wallpaper Engine 可改变分辨率）
- 要考虑暂停/恢复（页面失焦时可降低更新频率）
- 导入到 Wallpaper Engine 的目录必须干净（不要夹带大文件/无关目录）

---

## 14. README 中必须说明（提醒 Agent 生成）
- 如何本地运行（纯静态 / Vite）
- 如何在 Wallpaper Engine 使用（选择 index.html、关闭网络依赖）
- 参数与 API 示例
- Wallpaper Engine 用户属性如何映射到 Config（列出字段对照表）

---

## 15. Agent 沟通方式（很重要）
- 默认做“可落地实现”，不要只给概念
- 每次提交变更前自查：性能、离线、切换流畅度、Wallpaper Engine 属性是否生效
