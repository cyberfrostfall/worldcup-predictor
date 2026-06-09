/**
 * 本地手动同步脚本：拉取赛程赛果写入数据库。
 * 用法：npm run seed
 * 需先在 .env.local 配好 FOOTBALL_DATA_API_KEY。
 */
import { loadEnv } from "./env";
loadEnv();

import { fetchMatches } from "../src/lib/football-api";
import { upsertMatches } from "../src/lib/db";

async function main() {
  console.log("正在从 football-data.org 拉取赛程…");
  const matches = await fetchMatches();
  const count = upsertMatches(matches);
  console.log(`✓ 已同步 ${count} 场比赛`);
}

main().catch((e) => {
  console.error("✗ 同步失败：", e instanceof Error ? e.message : e);
  process.exit(1);
});
