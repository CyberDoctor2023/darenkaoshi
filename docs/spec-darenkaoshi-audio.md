# 《大人考试》音效体验

## Goal

为父母卷加入轻松、手绘游戏感的声音层：首屏开始答卷时播放一次短开场提示音，进入 10 个真实场景时分别播放对应场景的提示音，并提供可见的静音/开启控制。

## Non-goals

- 不加入持续背景音乐、语音旁白或强刺激的战斗音效。
- 不改变答题顺序、计分、结果卡和已有视觉结构。
- 不在首屏加载时绕过浏览器自动播放限制；声音应在用户首次点击后启动。

## Open-source choice

- 运行时音效生成使用 `jsfxr@1.4.1`，来源：<https://github.com/chr15m/jsfxr>，仓库标注 Unlicense。
- Kenney Digital Audio（<https://www.kenney.nl/assets/digital-audio>）作为备选素材库，页面标注 CC0；本阶段不打包外部 wav，避免增加静态资源体积。
- jsfxr 通过现有 import map 从 jsDelivr 加载，和项目当前 Three.js CDN 方案一致。

## Completion conditions

- 首屏“答卷”点击后能播放一次短开场音效。
- 10 个场景均有数据驱动的音效配置；进入场景时每个场景最多播放一次，重复进入可再次播放。
- 场景音效使用轻量游戏提示音，不使用爆炸/受伤等强烈负向素材作为默认主音色。
- 静音按钮在首页和答题页均可见，状态有 `aria-pressed` 和文本提示。
- 浏览器不支持 Web Audio 或用户关闭声音时，页面仍可完整答题。
- `prefers-reduced-motion` 不影响声音可用性；静音选择保存在本地。

## Validation plan

- JSON 解析校验音效配置覆盖 10 个场景且无重复场景 ID。
- `node --check deploy/darenkaoshi/app.js`。
- 用本地静态服务器打开首页，点击答卷并逐个切换场景，确认音效控制、场景音效和答题流程正常。
- 检查 Git diff，确认只包含音效配置、运行时逻辑、样式和许可证说明。
