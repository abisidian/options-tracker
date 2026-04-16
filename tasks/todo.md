# TODO

## 本次任务 - 价差盈亏曲线 hover 不再跳动

- [x] 确认弹层 hover 跳动的直接布局原因
- [x] 调整价差曲线底部统计区，消除 hover 时的高度变化
- [x] 验证构建结果，并记录本次变更

## Review - 价差盈亏曲线 hover 不再跳动

- 直接原因位于 `src/components/SpreadChart.tsx` 的 `SpreadChart`：底部统计区原先只在 `hoverPoint` 存在时才渲染“鼠标处”这一项，导致统计格子数量从 8 个变 9 个，弹层高度变化后又因外层容器使用 `items-center` 重新居中，所以鼠标移入曲线区域时会出现整块上跳
- 已在 `src/components/SpreadChart.tsx` 的 `SpreadChart` 中新增固定占位的 `hoverStat`，未 hover 时也始终渲染“鼠标处”统计项并显示 `--`，从而锁定价差曲线弹层的底部布局高度；同时在 `src/components/IronCondorChart.tsx` 的 `IronCondorChart` 同步相同处理，保持两种曲线交互一致
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 默认 DTE 优先选择 3 天后

- [x] 定位当前默认到期日的选择逻辑与 DTE 口径
- [x] 调整默认选择规则为优先 3 天后，其次 2 天后
- [x] 验证构建结果，并记录本次变更

## Review - 默认 DTE 优先选择 3 天后

- 当前默认到期日选择逻辑位于 `src/app/page.tsx` 的 `HomePage`：原先 `useEffect` 在 `expiriesState.data.expiries` 到达后直接取 `expiries[0]` 作为默认值，因此总是选择最早到期
- 当前 DTE 展示口径位于 `src/lib/format.ts` 的 `formatDays`：当 `days >= 1` 时使用 `Math.round(days)` 显示为 `Nd`，因此默认选择规则也按同一显示口径匹配 `3d` / `2d`
- 已在 `src/app/page.tsx` 新增 `pickDefaultExpiry`，按顺序优先选择显示为 `3d` 的到期日；若不存在，则回退到显示为 `2d` 的到期日；若仍不存在，再回退到列表首项
- `src/app/page.tsx` 的 `HomePage` 中默认选择到期日的 `useEffect` 已改为调用 `pickDefaultExpiry`，不再直接使用 `expiries[0]`
- 验证命令 1：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功
- 验证命令 2：使用 Node 从 `src/app/page.tsx` 抽取 `pickDefaultExpiry` 并执行 3 组样例，验证 `3d -> 2d -> 首项` 选择顺序，输出 `pickDefaultExpiry cases passed`

## 本次任务 - 表格再加宽以容纳单行中文列名

- [x] 确认当前限制列名单行展示的宽度来源
- [x] 调整页面与表头宽度策略，让中文列名优先单行展示
- [x] 验证构建与页面展示结果，并记录本次变更

## Review - 表格再加宽以容纳单行中文列名

- 限制列名单行展示的主要宽度来源位于 `src/app/page.tsx` 的 `HomePage`：页面主容器原先固定为 `max-w-7xl`，在桌面宽度下会提前封顶，导致表格可用横向空间不足
- 另一个触发点位于 `src/components/SpreadTable.tsx` 的 `SpreadTable` 和 `src/components/IronCondorTable.tsx` 的 `IronCondorTable`：表头主标题在按钮内部允许换行，所以列宽稍紧时中文标题会优先折成两行
- 已将 `src/app/page.tsx` 的主容器宽度放大为 `max-w-[1500px]`，让桌面端表格获得更多横向空间
- 已将 `src/components/SpreadTable.tsx` 与 `src/components/IronCondorTable.tsx` 的表头主标题改为 `whitespace-nowrap`，并让排序图标固定不收缩，确保中文列名优先保持单行显示
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功
- 浏览器验证：启动 `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run dev -- -p 4102` 后，使用 Chrome 无头模式分别在 `1366x1400` 与 `1280x1400` 视口截图 `http://127.0.0.1:4102`，当前价差表中文列名保持单行显示，且未出现横向滚动条

## 本次任务 - 表格宽度不足不再横向滚动

- [x] 定位价差表与铁鹰表横向滚动的直接原因
- [x] 调整表格列宽与换行策略，优先在当前容器宽度内展示
- [x] 验证页面不再依赖横向滚动，并记录本次结果

## Review - 表格宽度不足不再横向滚动

- 横向滚动的直接原因位于 `src/components/SpreadTable.tsx` 的 `SpreadTable` 和 `src/components/IronCondorTable.tsx` 的 `IronCondorTable`：表格容器原先使用 `overflow-auto`，表体单元格统一使用 `whitespace-nowrap`，表头按钮也保持单行，导致列一多时只能通过横向滚动容纳内容
- 已在 `src/components/SpreadTable.tsx` 的 `SpreadTable` 中新增 `getCellClassName` / `getHeaderButtonClassName`，并把表格改为 `w-full table-fixed`、容器改为 `overflow-y-auto overflow-x-hidden`，同时允许表头与非数值内容换行，在小宽度下允许数值按字符断开，优先在现有宽度内排布
- 已在 `src/components/IronCondorTable.tsx` 的 `IronCondorTable` 中同步上述策略，并为 `Column` 增加 `numeric` 元数据，确保数值列和文本列可以分别应用不同的收缩规则
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功
- 浏览器验证：启动 `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run dev -- -p 4100` 后，使用 Chrome 无头模式分别在 `1440x1600` 和 `1100x1400` 视口截图 `http://127.0.0.1:4100`，当前价差表截图未出现横向滚动条，表格已在容器内收缩展示

## 本次任务 - 修复 Next.js `Origin not allowed`

- [x] 定位 `Origin not allowed` 的触发来源与受影响访问入口
- [x] 调整 Next.js 配置，放行本地开发常见访问域名与可配置来源
- [x] 验证构建通过，并记录本次修复结果

## Review - 修复 Next.js `Origin not allowed`

- 当前项目业务代码未使用 Server Action：`src/app/page.tsx` 的 `fetchExpiries` / `fetchSpreads` 与 `src/components/BtcPriceHeader.tsx` 的轮询逻辑均通过 `fetch('/api/...')` 请求 Route Handler
- Next.js 的来源校验入口位于 `node_modules/next/dist/server/app-render/action-handler.js` 的 `handleAction`，当 `origin` 与 `host/x-forwarded-host` 不一致时会抛出 `Invalid Server Actions request`
- 项目原本缺少允许来源配置：`next.config.js` 仅包含 `reactStrictMode` 和 `webpack` 轮询监听配置，未设置 `experimental.serverActions.allowedOrigins`
- 已在 `next.config.js` 新增 `normalizeAllowedOrigin`、`getLocalIpv4Origins`、`getAllowedOrigins`，默认放行 `localhost:4000`、`127.0.0.1:4000`、机器 hostname、`hostname.local` 以及本机局域网 IPv4 地址，并支持通过 `NEXT_ALLOWED_ORIGINS` 追加自定义来源
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - ETH 价格/行权价显示禁用 k 缩写

- [x] 查找全局 `k` 缩写的价格格式化入口
- [x] 修改显示逻辑，ETH 相关价格与行权价改为完整数字展示
- [x] 验证构建通过，并记录本次变更结果

## Review - ETH 价格/行权价显示禁用 k 缩写

- 全局格式化入口位于 `src/lib/format.ts` 的 `formatStrike` 函数，价差表、铁鹰表、曲线 tooltip、筛选器和标的现价均复用该函数
- 已移除 `formatStrike` 中 `>=1000` 时转为 `k` 缩写的逻辑，现统一按完整数字展示，例如 `2350`、`2300`、`100,000`
- 按代码规范为 `src/lib/format.ts` 中的格式化函数补充了中文注释
- 验证命令：`PATH=/opt/homebrew/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 价差表指标与曲线交互

- [x] 移除价差表中的“平均盈亏比”和“平均盈利”两列及相关排序逻辑
- [x] 为价差组合补充点击行查看盈亏曲线能力
- [x] 验证构建通过，并记录本次变更结果

## Review - 价差表指标与曲线交互

- 更新 `src/components/SpreadTable.tsx`，移除“平均盈亏比 / 平均盈利”列与对应排序键，并给价差表增加点击行打开曲线弹层的交互
- 新增 `src/components/SpreadChart.tsx`，复用现有图表风格渲染两腿信用价差的到期盈亏曲线、关键价位和 hover 读数
- 更新 `src/lib/payoff.ts`，补充 `spreadPayoffAt` / `spreadPayoffCurve`，为价差曲线提供采样数据
- 更新 `src/app/page.tsx`，向价差表传入 `coin` 以支持不同标的的合约乘数计算
- 验证命令：`PATH=/opt/homebrew/bin:$PATH npm run build` 通过，Next.js 编译、lint、类型检查和静态页面生成均成功
- 本地预览：`PATH=/opt/homebrew/bin:$PATH npm run dev -- -p 4001` 已启动，`curl -I http://127.0.0.1:4001` 返回 `HTTP/1.1 200 OK`

- [x] 表单控件样式优化：统一 select 和 input 的边框、焦点、hover、暗色模式表现
- [x] 验证构建结果

## Review - 表单控件样式优化

- 新增 `src/components/FormControls.tsx`，统一 select/input 的边框、背景、hover、focus ring 和自定义下拉箭头样式
- 更新 `src/components/ExpiryPicker.tsx`、`src/components/SpreadFilterPanel.tsx`、`src/components/IronCondorFilterPanel.tsx` 复用统一表单控件样式
- 验证命令：`PATH=/opt/homebrew/bin:$PATH npm run build` 通过，Next.js 编译、lint、类型检查和静态页面生成均成功
- 本地 4000 预览服务由用户自行启动；当前通过 `curl` 可连通，但返回 `HTTP 500`

---

- [ ] 接入远端仓库并先同步远端历史
- [ ] 提交本地修改并推送到 `git@github.com:abisidian/options-tracker.git`

## Review

- 当前本地工作区干净，`git status --short --branch` 显示仅有 `main`
- 远端 `origin` 已指向 `git@github.com:abisidian/options-tracker.git`
- 直接使用 `~/.ssh/id_rsa` 连接 GitHub 时返回 `Permission denied (publickey)`，且该私钥需要口令，暂时无法在当前无交互流程中完成认证

---

## Spec - GitHub Push 后自动部署到服务器（PM2）- 现状分析

- [ ] 确认现有运行方式与部署入口
- [ ] 确认自动部署需要新增的仓库文件范围

## 现状分析

- 项目当前是标准 Next.js Node 服务启动方式，启动入口来自 `package.json` 的脚本定义：`package.json` 无函数定义，`scripts.build` 为 `next build`、`scripts.start` 为 `next start -p 4000`
- 项目当前没有 PM2 进程配置文件：仓库根目录未找到 `ecosystem.config.js` / `ecosystem.config.cjs` / `pm2.config.js`
- 项目当前没有 GitHub Actions 工作流：仓库中未找到 `.github/workflows/*`
- 因为生产启动端口固定为 `4000`，所以 PM2 配置应直接围绕 `npm run start` 或 `next start -p 4000` 生成，这个结论的依据是 `package.json` 的 `scripts.start`
- 本次工作需要尽量避开现有业务改动：当前工作区存在多处未提交修改，依据是 `git status --short --branch` 输出，部署相关改动应限制在 `.github/workflows/`、PM2 配置文件，以及必要时对 `package.json` 做最小调整

## Spec - GitHub Push 后自动部署到服务器（PM2）- 功能点

- [ ] 新增 PM2 生产进程配置文件
- [ ] 新增 GitHub Actions 自动部署工作流
- [ ] 保持现有业务启动脚本不变，部署逻辑复用现有 `npm` 脚本

## 功能点

- 新增 `ecosystem.config.cjs`，定义一个 PM2 应用，启动命令直接复用 `package.json` 的 `scripts.start`
- 新增 `.github/workflows/deploy.yml`，在推送 `main` 分支后自动通过 SSH 登录服务器并执行部署
- 工作流中的远端部署步骤固定为：进入项目目录、`git pull --ff-only`、`npm ci`、`npm run build`、`pm2 startOrReload ecosystem.config.cjs --update-env`
- 工作流不把服务器地址、账号、私钥、项目目录写死在仓库里，统一从 GitHub Actions Secrets 读取
- 不新增 README 或部署文档文件；交付说明直接在本次答复里告诉用户怎么配置服务器和 GitHub

## Spec - GitHub Push 后自动部署到服务器（PM2）- 风险与决策

- [ ] 固定工作流触发分支与服务器侧假设
- [ ] 固定最小 Secret 集合与服务器预装依赖
- [ ] 记录验证方式

## 风险与决策

- 决策：工作流默认监听 `main`。依据是当前仓库 `git status --short --branch` 显示本地分支为 `main`
- 决策：服务器侧默认假设为 Linux 主机，已安装 `git`、`node`、`npm`、`pm2`，并且该服务当前已经由 PM2 托管运行
- 决策：PM2 不作为项目依赖写入 `package.json`，而是作为服务器的全局运维依赖安装，避免把部署工具塞进应用运行时依赖
- 风险：如果服务器 `git pull` 使用的是私有仓库但未配置 deploy key，工作流能连上服务器也会在拉代码阶段失败
- 风险：如果服务器当前 PM2 进程名和新配置中的应用名不一致，首次自动部署可能会尝试拉起新进程并造成端口冲突，因此本次配置统一固定应用名为 `options-tracker`
- 风险：如果服务器出口访问 Bybit 受限，应用部署成功后仍可能因运行时请求 `403` 无法正常取数；这一点的依据是 `README.md` 无函数定义，环境变量章节已说明 `HTTPS_PROXY` / `BYBIT_API_BASE` 的生产需求
- 验证：本地验证以配置文件语法和 PM2 配置可加载为主；远端联调验证以 GitHub Actions 日志和服务器 `pm2 status` / `pm2 logs` 为准

## 本次任务 - GitHub Push 后自动部署到服务器（PM2）

- [x] 补全本次部署 Spec
- [x] 新增 `ecosystem.config.cjs`
- [x] 新增 `.github/workflows/deploy.yml`
- [x] 验证新增配置文件可加载
- [x] 记录本次变更结果

## Review - GitHub Push 后自动部署到服务器（PM2）

- 新增 [ecosystem.config.cjs](/Volumes/macos/Users/wangqichao/project/options-tracker/ecosystem.config.cjs:1)，统一 PM2 应用名为 `options-tracker`，通过 `npm run start` 复用 `package.json` 的生产启动脚本，并固定 `PORT=4000`
- 新增 [.github/workflows/deploy.yml](/Volumes/macos/Users/wangqichao/project/options-tracker/.github/workflows/deploy.yml:1)，在 `push main` 或手动触发时，通过 SSH 登录服务器执行 `git pull --ff-only`、`npm ci`、`npm run build`、`pm2 startOrReload ecosystem.config.cjs --only options-tracker --update-env`
- 配置验证 1：执行 `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH node -e "const config=require('./ecosystem.config.cjs')..."` 成功，输出应用名 `options-tracker`、启动命令 `npm run start`、端口 `4000`
- 配置验证 2：执行 `ruby -e "require 'yaml'; YAML.load_file('/Volumes/macos/Users/wangqichao/project/options-tracker/.github/workflows/deploy.yml')..."` 成功，读取到工作流名 `deploy-production`，步骤数为 `2`
- 当前与本次任务直接相关的工作区改动为：`tasks/todo.md`、`.github/workflows/deploy.yml`、`ecosystem.config.cjs`

## 本次任务 - 消除 BPS 策略标签歧义

- [x] 确认当前 BPS 的实际策略定义与用户看到的缩写来源
- [x] 调整价差表策略标签文案，明确这是卖价差信用策略
- [x] 验证构建结果，并记录本次变更

## Review - 消除 BPS 策略标签歧义

- `src/lib/spreads.ts` 的 `buildSpreadsForExpiry` 当前把 `BullPut` 明确定义为 `K_sell > K_buy` 的牛市看跌信用价差，具体枚举逻辑是升序遍历 Put 后取 `buy = puts[i]`、`sell = puts[j]`
- 用户会产生歧义的直接来源位于 `src/components/SpreadTable.tsx` 的 `STRATEGY_META`：表格徽标原先仅显示 `BCS` / `BPS`，容易把 `Bull Put` 误读成 `Bear Put`
- 已将 `src/components/SpreadTable.tsx` 的策略徽标改为 `熊涨卖` / `牛跌卖`，并为 tooltip 补充完整说明：`熊市看涨卖价差（卖低 K Call，买高 K Call）`、`牛市看跌卖价差（卖高 K Put，买低 K Put）`
- 本次没有改动 `src/lib/spreads.ts` 的组合生成逻辑，只修正用户可见文案，避免把现有信用价差策略看成买价差
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 策略标签改为英文 Sell Spread 文案

- [x] 按用户要求将策略标签从中文改为英文术语
- [x] 同步更新 tooltip 文案，保持卖价差含义明确
- [x] 验证构建结果，并记录本次变更

## Review - 策略标签改为英文 Sell Spread 文案

- 已将 `src/components/SpreadTable.tsx` 的 `STRATEGY_META` 从中文标签改为 `Sell Call Spread` 和 `Sell Put Spread`
- 同一位置的 tooltip 已同步更新为英文完整说明，分别明确 `sell lower-strike call, buy higher-strike call` 与 `sell higher-strike put, buy lower-strike put`
- 本次仅修改用户可见文案，没有改动 `src/lib/spreads.ts` 的价差枚举与盈亏计算逻辑
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 同步更新策略切换 Tab 文案

- [x] 调整策略切换 tab 的标签与提示文案
- [x] 统一其它仍残留的可见策略名称
- [x] 验证构建结果，并记录本次变更

## Review - 同步更新策略切换 Tab 文案

- 已更新 `src/components/StrategyFilter.tsx` 的 `STRATEGY_MODES`：tab 标签从 `Bear Call` / `Bull Put` 改为 `Sell Call Spread` / `Sell Put Spread`，`All` 的提示文案也同步改为英文策略名
- 已更新 `src/components/SpreadChart.tsx` 的 `strategyLabel`，保证图表标题与表格、tab 使用同一套英文策略术语
- 通过 `rg -n "Bear Call|Bull Put" src/components src/app --glob '!node_modules'` 复查，当前 `src/components` 与 `src/app` 中已无残留的旧用户可见策略名称
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 默认到期日回退规则补全为 3/2/1

- [x] 确认服务器未生效的真实原因与当前远端代码状态
- [x] 调整默认到期日选择规则为优先 3d，再回退到 2d、1d
- [x] 验证构建结果，并记录本次变更

## Review - 默认到期日回退规则补全为 3/2/1

- 服务器未生效的直接原因不是时序，而是远端 `HEAD` 的 [src/app/page.tsx](/Volumes/macos/Users/wangqichao/project/options-tracker/src/app/page.tsx:107) 仍然使用 `setExpiry(expiriesState.data.expiries[0].label)`，也就是“永远取最早到期”；这一点通过 `git show HEAD:src/app/page.tsx` 已确认
- 本地工作区中的 [src/app/page.tsx](/Volumes/macos/Users/wangqichao/project/options-tracker/src/app/page.tsx:42) 已补上 `pickDefaultExpiry`，并将优先级明确为 `Math.round(daysToExpiry) === 3`，再回退到 `2`、`1`，最后才取列表首项
- 同文件的默认选择 `useEffect` 也已改为调用 `pickDefaultExpiry`，不再直接绑定 `expiries[0]`
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功

## 本次任务 - 修复相对时间未按秒更新

- [x] 确认 `xx s前` 未跟随时间变化的直接原因
- [x] 调整相对时间 hook 的刷新策略，让秒级文案按秒更新
- [x] 验证构建结果，并记录本次变更

## Review - 修复相对时间未按秒更新

- 直接原因位于 [src/hooks/useRelativeTime.ts](/Volumes/macos/Users/wangqichao/project/options-tracker/src/hooks/useRelativeTime.ts:10) 的 `useRelativeTime`：默认刷新间隔原先固定为 `10_000` 毫秒，所以页面上的 `xx s前` 最多每 10 秒才会跳一次，看起来像“没有跟着时间变动”
- 已将同一函数的默认刷新间隔调整为 `1_000` 毫秒，并补充中文注释说明秒级文案需要按秒触发重渲染
- 验证命令：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm run build`，结果通过，Next.js 编译、lint、类型检查和静态页面生成均成功
