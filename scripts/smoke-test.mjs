// 用合成数据做一个轻量回归校验。
// Run: node --experimental-strip-types scripts/smoke-test.mjs
//   or: npx tsx scripts/smoke-test.mjs
//
// 这个脚本不访问 Bybit，只验证解析与价差计算逻辑。

import { parseOptionSymbol } from "../src/lib/bybit.ts";
import { buildSpreadsForExpiry } from "../src/lib/spreads.ts";

const NOW = Date.now();
const EXPIRY_MS = NOW + 15 * 24 * 60 * 60 * 1000;
const EXPIRY_LABEL = "TEST15";
const UNDERLYING = 68000;

function make(type, strike, markPrice, delta) {
  return {
    symbol: `BTC-${EXPIRY_LABEL}-${strike}-${type}`,
    baseCoin: "BTC",
    expiryMs: EXPIRY_MS,
    expiryLabel: EXPIRY_LABEL,
    strike,
    type,
    bid1Price: markPrice - 5,
    ask1Price: markPrice + 5,
    markPrice,
    markIv: 0.5,
    delta,
    gamma: 0,
    theta: 0,
    vega: 0,
    openInterest: 100,
    underlyingPrice: UNDERLYING,
  };
}

const tickers = [
  // Call 只保留 delta > 0.1，且行权价高于现价的合约。
  make("C", 67000, 780, 0.42), // filtered out（虽然 delta 符合，但 strike 在现价以下）
  make("C", 72000, 600, 0.18), // keep
  make("C", 74000, 350, 0.14), // keep
  make("C", 76000, 200, 0.09), // filtered out
  make("C", 78000, 100, 0.03), // filtered out

  // Put 只保留 delta < -0.1，且行权价低于现价的合约。
  make("P", 70000, 430, -0.22), // filtered out（虽然 delta 符合，但 strike 在现价以上）
  make("P", 64000, 320, -0.12), // keep
  make("P", 62000, 180, -0.05), // filtered out
  make("P", 60000, 90, -0.03), // filtered out
  make("P", 58000, 50, -0.015), // filtered out
  make("P", 66000, 700, -0.18), // keep
];

const { combos, counts } = buildSpreadsForExpiry({
  tickers,
  expiryLabel: EXPIRY_LABEL,
});

console.log("counts:", counts);
console.log("combos:", combos.length);
for (const c of combos.slice(0, 3)) {
  console.log(
    `  ${c.strategy}  sell=${c.sellLeg.strike}(Δ${c.sellLeg.delta})  buy=${c.buyLeg.strike}(Δ${c.buyLeg.delta})` +
      `  credit=$${c.netCreditUsd.toFixed(2)}  maxP=$${c.maxProfitUsd.toFixed(2)}  maxL=$${c.maxLossUsd.toFixed(2)}  R:R=${c.riskReward.toFixed(2)}  BE=${c.breakEven.toFixed(0)}`,
  );
}

// Sanity checks
const assertions = [];
function assert(label, ok, extra = "") {
  assertions.push({ label, ok, extra });
}

// 回归校验：Bybit 当前真实返回的 symbol 会多一个结算币种尾段。
const parsedNewFormat = parseOptionSymbol("BTC-29MAY26-93000-C-USDT");
assert("支持解析 5 段 Bybit symbol", !!parsedNewFormat);
if (parsedNewFormat) {
  assert("5 段 symbol 的 expiryLabel 正确", parsedNewFormat.expiryLabel === "29MAY26");
  assert("5 段 symbol 的 strike 正确", parsedNewFormat.strike === 93000);
  assert("5 段 symbol 的类型正确", parsedNewFormat.type === "C");
}

// Bear Call with sell=72000 buy=74000: netCredit = (600-350)*0.01 = $2.50
// width=2000, maxLoss = 2000*0.01 - 2.50 = $17.50
const bcs_72_74 = combos.find(
  (c) =>
    c.strategy === "BearCall" &&
    c.sellLeg.strike === 72000 &&
    c.buyLeg.strike === 74000,
);
assert("BCS 72/74 exists", !!bcs_72_74);
if (bcs_72_74) {
  assert(
    "BCS 72/74 credit ≈ 2.50",
    Math.abs(bcs_72_74.netCreditUsd - 2.5) < 1e-9,
    `got ${bcs_72_74.netCreditUsd}`,
  );
  assert(
    "BCS 72/74 maxLoss ≈ 17.50",
    Math.abs(bcs_72_74.maxLossUsd - 17.5) < 1e-9,
    `got ${bcs_72_74.maxLossUsd}`,
  );
  assert(
    "BCS 72/74 breakEven ≈ 72250",
    Math.abs(bcs_72_74.breakEven - 72250) < 1e-6,
    `got ${bcs_72_74.breakEven}`,
  );
}

// Bull Put with sell=66000 buy=64000: netCredit = (700-320)*0.01 = $3.80
// width=2000, maxLoss = 2000*0.01 - 3.80 = $16.20
const bps_66_64 = combos.find(
  (c) =>
    c.strategy === "BullPut" &&
    c.sellLeg.strike === 66000 &&
    c.buyLeg.strike === 64000,
);
assert("BPS 66/64 exists", !!bps_66_64);
if (bps_66_64) {
  assert(
    "BPS 66/64 credit ≈ 3.80",
    Math.abs(bps_66_64.netCreditUsd - 3.8) < 1e-9,
    `got ${bps_66_64.netCreditUsd}`,
  );
  assert(
    "BPS 66/64 maxLoss ≈ 16.20",
    Math.abs(bps_66_64.maxLossUsd - 16.2) < 1e-9,
    `got ${bps_66_64.maxLossUsd}`,
  );
  assert(
    "BPS 66/64 breakEven ≈ 65620",
    Math.abs(bps_66_64.breakEven - 65620) < 1e-6,
    `got ${bps_66_64.breakEven}`,
  );
}

// 筛选后的数量应该只保留满足方向阈值的腿。
assert("filteredCalls = 2", counts.filteredCalls === 2);
assert("filteredPuts = 2", counts.filteredPuts === 2);
assert("bearCall combos = 1", counts.bearCall === 1);
assert("bullPut combos = 1", counts.bullPut === 1);

let passed = 0;
let failed = 0;
for (const a of assertions) {
  if (a.ok) {
    passed++;
    console.log(`  ✓ ${a.label}`);
  } else {
    failed++;
    console.log(`  ✗ ${a.label} ${a.extra}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
