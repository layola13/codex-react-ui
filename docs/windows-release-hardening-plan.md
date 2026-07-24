# Windows 预览版可用性加固计划

> 状态：规划中  
> 目标仓库：`/root/projects/codex-react-ui`  
> 当前发布物：GitHub Actions 生成的 `codex-react-ui-windows-x64.exe` 预览包  
> 相关流程：`.github/workflows/release.yml`

## 1. 背景与问题摘要

当前 Windows 发布流程会在 GitHub Actions 上执行：

1. `bun install`
2. `bun run build`
3. `bun build --compile --target=bun-windows-x64 ./apps/server/src/index.ts`

产物本质是一个 **Bun 编译后的本地服务端可执行文件**，不是传统安装器，也不是 Electron/Tauri 桌面壳。用户双击后，程序在本机启动 HTTP/WebSocket 服务，再由系统已有浏览器访问 `http://127.0.0.1:43110/`。

当前预览版已经能把 Web UI 启起来，但首次运行暴露出两个关键缺口：

- `[auth] CODEX_UI_JWT_SECRET is not set; sessions will be invalidated on restart.`
- `Codex app-server did not start during boot warn: ENOENT: no such file or directory, uv_spawn 'codex'`

这两个警告说明：

- Windows 预览包没有像 Linux `install.sh` 一样生成稳定的本地配置。
- Windows 预览包没有处理 `codex` CLI 依赖发现、缺失提示或引导安装。

结果是：

- 页面能打开；
- membership 登录可能可以工作，但重启后 session 会失效；
- 若系统里没有 `codex`/`CODEX_BIN`，聊天与引擎能力不可用；
- 目前更像“开发预览二进制”，而不是“普通用户可安装产品”。

## 2. 目标

把 Windows 预览版从“能启动本地网页”提升到“首次运行即可明确完成初始化，并能向用户解释当前是否具备可用运行条件”。

### 2.1 P0 目标

- 首次运行自动生成稳定本地配置。
- 不再出现 `CODEX_UI_JWT_SECRET is not set` 警告。
- 明确检测 `codex` 依赖是否可用。
- `codex` 不可用时，UI 能给出清晰状态与修复指引，而不是只在控制台打印 `ENOENT`。
- README 和 release 说明与真实行为一致。

### 2.2 P1 目标

- 提供 Windows 友好的引导启动体验。
- 自动打开默认浏览器或明确提示入口地址。
- 提供首启诊断页或 setup wizard。
- 为后续真正安装器（MSIX / Inno Setup / NSIS）预留配置目录与引导逻辑。

## 3. 非目标

本计划不在 P0 内解决以下事项：

- 把浏览器打包进发布物。
- 把项目改造成 Electron/Tauri 桌面应用。
- 把 `codex` CLI 完整静态打包进本仓库发布物。
- 彻底替代现有本地服务 + 浏览器访问架构。

## 4. 当前实现现状

### 4.1 发布流

`.github/workflows/release.yml` 当前只负责：

- 构建前端资源
- 编译 `apps/server/src/index.ts`
- 生成 `.exe` 与 `.zip`
- 发布 GitHub prerelease

它没有：

- 生成 Windows 首次运行配置文件
- 引导写入 `CODEX_UI_JWT_SECRET`
- 检查 `codex` 是否存在
- 生成安装器
- 创建快捷方式
- 处理浏览器自动打开

### 4.2 认证初始化

服务端默认 `CODEX_UI_AUTH` 为开启状态；若未显式关闭就会启用 membership 登录。

Linux 侧已有 `install.sh`，会自动生成：

- `CODEX_UI_JWT_SECRET`
- `CODEX_UI_ADMIN_EMAIL`
- `CODEX_UI_ADMIN_PASSWORD`
- `CODEX_BIN`

Windows 预览版没有对应逻辑，因此服务端只能在进程内临时运行，重启后 session 签名不稳定。

### 4.3 Codex 依赖发现

桥接层当前查找 `codex` 的顺序是：

1. `process.env.CODEX_BIN`
2. Linux 本地开发路径 `/root/projects/codex/codex-rs/target/debug/codex`
3. 回退到 `codex`

在 Windows 环境下，第 2 条无意义；若用户系统里没有 `codex.exe` 且 PATH 未配置，则会在启动 app-server 时收到 `ENOENT`。

## 5. 核心设计方向

P0 不引入重量级安装器，先补齐“首次运行初始化”和“依赖状态可视化”。核心思路：

1. **服务端自举配置**：首次运行时在用户目录生成私有配置文件。
2. **显式 runtime health**：把 `JWT`、`codex`、浏览器入口、当前 bridge 状态通过 API 暴露给前端。
3. **首启 setup UX**：前端在 engine unavailable 时提供 setup/diagnostics 面板。
4. **发布文案校准**：release body 与 README 明确说明“需要浏览器”和“需要本机可用 codex”。

## 6. 实施阶段

## 6.1 P0 — 首次运行可自举

### 6.1.1 服务端配置目录统一

新增 Windows 侧统一配置目录策略，优先级建议：

1. `CODEX_UI_DATA_DIR`
2. 平台用户配置目录（Windows 下建议 `%APPDATA%/codex-react-ui` 或等价目录）
3. 与现有 `LocalDatabase` / `AuthStore` 路径保持一致

要求：

- JWT、管理员初始化信息、用户侧配置放在同一根目录下；
- 文件权限按 Windows 能力做到“当前用户私有”；
- 日后 Linux / macOS / Windows 使用同一套“ensure runtime config”入口。

### 6.1.2 自动生成运行配置

新增服务端启动前或 `AuthStore.fromEnv()` 之前的初始化逻辑：

- 若未设置 `CODEX_UI_JWT_SECRET`：自动生成随机 secret，并持久化到本地配置文件。
- 若未设置 `CODEX_UI_ADMIN_EMAIL` / `CODEX_UI_ADMIN_PASSWORD`：写入安全默认值或首次启动随机密码，并给出 UI/控制台提示。
- 若配置文件已存在：复用，不重复覆盖。

建议新增模块：

- `apps/server/src/runtimeConfig.ts`
- 暴露 `ensureRuntimeConfig()`
- 返回归一化后的 runtime env / persisted config state

### 6.1.3 Codex 依赖健康检查

把当前“启动时 try start，失败就 warn”升级为结构化健康状态：

- `codexBinaryStatus`: `configured` | `foundOnPath` | `missing` | `notExecutable`
- `codexAppServerStatus`: `connected` | `starting` | `unavailable`
- `codexVersion`: optional
- `resolvedCodexBin`: string | null
- `lastStartError`: sanitized message

建议：

- 将 `resolveCodexBin()` 与 `readCodexVersion()` 的结果缓存到 engine status；
- `ENOENT` 不只打印 stderr，还进入可被前端读取的状态对象；
- 前端据此显示“未检测到 Codex CLI，请安装或设置 `CODEX_BIN`”。

### 6.1.4 首启诊断 API

新增只读 API，例如：

- `GET /api/runtime/health`
- `GET /api/runtime/setup`

至少返回：

- auth mode
- JWT 是否持久化
- admin 是否已初始化
- resolved `CODEX_BIN`
- codex binary/version health
- bridge transport mode
- 当前监听地址
- 浏览器访问 URL

### 6.1.5 前端 Setup / Diagnostics 面板

在登录前页、空状态页或 Settings 中增加 Windows 友好诊断区：

- `JWT configured` / `session persistence enabled`
- `Codex CLI found` / `missing`
- `CODEX_BIN` 当前值
- 若缺失，展示：
  - 需要安装 Codex CLI
  - 或设置 `CODEX_BIN`
  - 之后重启应用

P0 不强求完整向导，但至少要做到：

- 用户不用看控制台也能理解为何无法聊天；
- 用户知道下一步该做什么。

### 6.1.6 首页配置 `codex.exe` / `CODEX_BIN` 路径

为了避免要求普通用户手工设置系统环境变量，首页诊断区应直接支持配置 Codex CLI 路径。

建议交互：

- 当 `codexBinaryStatus=missing` 或 `notExecutable` 时，在首页显示 setup 卡片。
- 卡片中提供一个 `Codex CLI path` 输入框。
- Windows 示例占位符可显示 `C:\\path\\to\\codex.exe`。
- 用户点击 `Save and retry` 后，前端调用后端 API 保存路径并立即触发 bridge 重试。
- 若检测成功，首页 setup 卡片消失，进入正常聊天状态。

建议新增接口：

- `POST /api/runtime/config`
- `POST /api/runtime/retry-codex`

其中 `POST /api/runtime/config` 至少支持：

- 保存 `CODEX_BIN`
- 后续可扩展保存其他 runtime 配置

后端行为要求：

1. 校验路径是否存在。
2. 校验是否可执行。
3. 尝试读取 `codex --version`。
4. 持久化到 runtime config，而不是仅保存在前端状态。
5. 触发 bridge 重连或重启 app-server。
6. 返回更新后的 runtime health，供前端立即刷新。

注意事项：

- 该能力不应只服务于 Windows；Linux/macOS 也可复用同一套交互。
- 文案可以偏向 Windows，但接口和状态模型保持跨平台通用。
- 若用户尚未安装 Codex CLI，首页卡片除了路径输入外，还应给出“先安装，再回来配置路径”的说明。
- Electron 版若后续落地，应复用这套首页配置能力，而不是实现单独的 desktop-only 配置流程。

## 6.2 P1 — Windows 体验增强

### 6.2.1 自动打开浏览器

增加可控行为：

- 默认启动后尝试打开默认浏览器访问本地 URL；
- 通过环境变量关闭，如 `CODEX_UI_OPEN_BROWSER=0`；
- 打开失败不影响服务继续运行。

注意：

- 该行为是体验增强，不改变架构；
- 仍然不表示“程序自带浏览器”。

### 6.2.2 首次运行 setup wizard

首次运行时若缺少关键依赖，则打开 setup 页面而不是直接落到普通聊天页：

- Step 1: 本地配置已生成
- Step 2: 检测 Codex CLI
- Step 3: 设置 `CODEX_BIN` 或查看安装指南
- Step 4: 重新检测

### 6.2.3 发布物附带文档

GitHub Release 附加：

- Windows quickstart
- 常见错误说明
- `codex` 缺失时的处理方式
- 浏览器访问模式说明

## 6.3 P2 — 真正安装器路径

后续若需要面向非技术用户发布，可评估：

- Inno Setup
- NSIS
- WiX / MSIX

安装器可负责：

- 写入配置目录
- 创建快捷方式
- 注册卸载项
- 可选调用默认浏览器
- 可选检测并引导安装外部 `codex`

P2 前提是 P0/P1 已验证运行模型和目录布局稳定。

## 7. 推荐代码变更点

| 路径 | 角色 | 预期改动 |
| --- | --- | --- |
| `apps/server/src/index.ts` | 启动入口 | 启动前调用 runtime config init；暴露 runtime health；可选自动开浏览器 |
| `apps/server/src/authStore.ts` | 登录配置 | 接受持久化后的 JWT / admin config，减少仅依赖 process.env |
| `apps/server/src/codexBridge.ts` | stdio bridge | 结构化 codex binary / version / start error 状态 |
| `apps/server/src/daemonCodexBridge.ts` | daemon bridge | 同上，统一健康状态接口 |
| `apps/server/src/localDatabase.ts` | 本地数据目录 | 与 runtime config 根目录对齐 |
| `apps/web/src/...` | 设置 / 空状态 / 登录页 | 增加 runtime diagnostics / setup UI |
| `.github/workflows/release.yml` | Windows 发布 | 更新说明文本；可附 quickstart；必要时增加 smoke check |
| `README.md` | 文档 | 明确 Windows 包不含浏览器与不内置 Codex CLI |

## 8. 验收标准

### 8.1 P0 验收

- [ ] 全新 Windows 用户目录下首次运行不再出现 `CODEX_UI_JWT_SECRET is not set`
- [ ] 程序重启后登录 session 保持有效（在 JWT 过期时间内）
- [ ] 缺失 `codex` 时，UI 显示可理解的缺失状态与修复建议
- [ ] 已安装 `codex` 且 PATH 正确时，bridge 能自动连上 app-server
- [ ] release 文案不再暗示“纯双击即完整可用”
- [ ] README 的 Windows 说明与真实行为一致

### 8.2 P1 验收

- [ ] 双击 `.exe` 后自动打开默认浏览器（可关闭）
- [ ] 缺失依赖时进入 setup/diagnostics 体验
- [ ] 用户不看控制台也能完成基础配置

## 9. 风险与注意事项

- 若自动生成管理员默认密码，需要避免把敏感信息写进公开日志。
- 若自动打开浏览器，要避免服务尚未 ready 就过早打开空白页。
- 若未来支持 membership + local-token 双模式，runtime config 需要避免相互覆盖。
- Windows 上路径、权限与 PATH 解析和 Linux 不同，不能继续依赖 Linux 开发机默认路径。
- 若后续真的要“无浏览器感”体验，应转向 Electron/Tauri/WebView2，而不是继续用 PWA 概念混淆。

## 10. 建议执行顺序

1. 抽出 `runtimeConfig.ts`，先解决 JWT 与本地配置持久化。
2. 给 `codexBridge` / `daemonCodexBridge` 增加结构化 health 状态。
3. 增加 `/api/runtime/health`。
4. 前端增加 setup/diagnostics 入口。
5. 更新 README 与 `release.yml` 发布文案。
6. 再评估自动开浏览器与安装器路线。

## 11. 成功定义

Windows 预览版的成功标准不是“控制台没有任何日志”，而是：

- 没装额外依赖时，用户也能看懂当前缺什么；
- 装好了依赖后，程序能稳定复用本地配置并正常启动；
- 发布说明不会让用户误以为这是一个已经完整封装了浏览器与 Codex 运行时的桌面安装包。
