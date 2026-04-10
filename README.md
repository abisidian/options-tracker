# Options Tracker

Bybit BTC 期权 10-delta 信用价差扫描器。选择到期日，自动枚举 `|delta| ≤ 0.1` 的 **Bear Call Spread** 与 **Bull Put Spread** 组合，按盈亏比排序。数据来源于 Bybit 公开行情接口（无需 API Key）。

> 仅供研究学习，不构成投资建议。

## 功能

- **BTC 现价**：顶部实时显示 BTC/USDT 现货价，5 秒轮询刷新。
- **到期日选择**：下拉列出 Bybit 当前所有未过期的 BTC 期权到期日。
- **价差枚举**：
  - **Bear Call Spread**（熊市看涨信用价差）：卖低 Call + 买高 Call，K_sell < K_buy
  - **Bull Put Spread**（牛市看跌信用价差）：卖高 Put + 买低 Put，K_sell > K_buy
  - 仅纳入 `|delta| ≤ 0.1` 的合约，生成全部两两组合
- **指标**：净权利金 / 最大盈利 / 最大亏损 / 盈亏比 / 盈亏平衡点
- **可排序表格**：点击任意表头切换排序（默认按盈亏比降序）
- **策略筛选**：BCS / BPS 可任意启用

## 技术栈

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Node 服务端 fetch + 3 秒内存缓存（合并并发请求，避免打爆 Bybit）
- 字体：Inter（UI）+ JetBrains Mono（数字列，tabular-nums）
- 配色：Financial Dashboard 深色方案（`#020617` 背景 + `#22C55E` 盈利 / `#EF4444` 亏损）

## 运行

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

## 环境变量

| 变量 | 作用 | 示例 |
|---|---|---|
| `BYBIT_API_BASE` | 覆盖 Bybit API 基础地址（用于自建代理） | `https://my-proxy.example.com` |
| `HTTPS_PROXY` / `HTTP_PROXY` | 出站代理，服务端 fetch 会通过 undici ProxyAgent 走代理 | `http://127.0.0.1:7897` |

### 国内访问说明

Bybit 公开 API 部署在 CloudFront 上，对部分地区（含中国大陆）返回 HTTP 403。如果你看到 `Bybit ... failed: HTTP 403`，说明服务端的出口 IP 被地域封锁。解决方法：

1. **配置代理**（推荐）：启动 dev 服务器前导出 `HTTPS_PROXY`：
   ```bash
   HTTPS_PROXY=http://127.0.0.1:7897 npm run dev
   ```
   代理的出口节点需要位于 Bybit 允许的地区（日本 / 新加坡 / 欧盟等）。

2. **自建转发**：在海外服务器部署一个简单反向代理，把 `https://api.bybit.com` 转发出去，然后用 `BYBIT_API_BASE` 指向你的代理。

## 价差计算

- **合约规模**：1 contract = `0.01 BTC`（Bybit BTC 期权标准）
- **markPrice 单位**：USD per BTC（Bybit 期权 markPrice 报价单位）
- 每合约权利金（USD）= `markPrice × 0.01`

### Bear Call Spread（K_sell < K_buy）

```
netCredit  = (mark_sell − mark_buy) × 0.01          # USD 每合约
maxProfit  = netCredit
maxLoss    = (K_buy − K_sell) × 0.01 − netCredit    # USD 每合约
breakEven  = K_sell + (mark_sell − mark_buy)        # underlying 价位
riskReward = maxProfit / maxLoss
```

### Bull Put Spread（K_sell > K_buy）

```
netCredit  = (mark_sell − mark_buy) × 0.01
maxProfit  = netCredit
maxLoss    = (K_sell − K_buy) × 0.01 − netCredit
breakEven  = K_sell − (mark_sell − mark_buy)
riskReward = maxProfit / maxLoss
```

## 冒烟测试

验证价差计算引擎（不访问 Bybit）：

```bash
node --experimental-strip-types --no-warnings scripts/smoke-test.mjs
```

预期输出：`12 passed, 0 failed`。

## 目录结构

```
options-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 全局布局（加载字体、元信息）
│   │   ├── page.tsx               # 主监控页：轮询 + 组装所有组件
│   │   ├── globals.css            # 字体 + 滚动条 + reduced-motion
│   │   └── api/
│   │       ├── btc-price/route.ts # BTC 现货价
│   │       ├── expiries/route.ts  # 到期日列表
│   │       └── spreads/route.ts   # 某到期日的价差组合
│   ├── components/
│   │   ├── BtcPriceHeader.tsx     # 顶部价格条（自带轮询）
│   │   ├── ExpiryPicker.tsx       # 到期日下拉
│   │   ├── StrategyFilter.tsx     # BCS / BPS 切换
│   │   └── SpreadTable.tsx        # 可排序价差表 + 骨架屏 + 空态
│   ├── hooks/
│   │   └── usePolling.ts          # 可见性感知的轮询 hook
│   └── lib/
│       ├── bybit.ts               # Bybit API 封装 + 缓存 + 代理支持
│       ├── spreads.ts             # 价差组合计算引擎
│       ├── format.ts              # USD / delta / 相对时间格式化
│       └── types.ts               # 共享类型定义
├── scripts/
│   └── smoke-test.mjs             # 算法冒烟测试
├── tailwind.config.ts             # 金融终端深色 token
├── next.config.js
├── tsconfig.json
└── package.json
```

## 设计参考

UI 基于 ui-ux-pro-max skill 的 **Data-Dense Dashboard** 模式与 **Financial Dashboard** 配色：
- 36px 行高、sticky 表头、hover 高亮、骨架屏加载态、`cursor-pointer` 标记所有可点击元素
- 对比度满足 WCAG AA，`prefers-reduced-motion` 被尊重
- 数字列统一用 `font-mono tabular-nums` 防止抖动
# options-tracker
