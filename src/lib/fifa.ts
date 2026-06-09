import rankingsJson from "../data/fifa-rankings.json";
import { logWarn } from "./logger";
import type { FifaRank } from "./types";

/**
 * 内置静态 FIFA 排名查询（含容错匹配）。
 * 排名数据为近似值，可在 src/data/fifa-rankings.json 校正。
 */

// 去重音、小写、去非字母数字，用于宽松匹配
function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // 去重音符号
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// football-data.org 特有写法 → 排名表里的标准键的别名（已归一化后比较）
const ALIASES: Record<string, string> = {
  usa: "unitedstates",
  korearepublic: "korearepublic",
  southkorea: "korearepublic",
  iriran: "iran",
  ivorycoast: "cotedivoire",
  bosniaandherzegovina: "bosniaherzegovina",
  chinapr: "china",
};

// 模块加载时构建「归一化键 → FifaRank」Map（只算一次）
const normalizedMap = new Map<string, FifaRank>();
for (const [key, value] of Object.entries(rankingsJson)) {
  if (key.startsWith("_")) continue; // 跳过 _comment 等元字段
  normalizedMap.set(normalizeTeamName(key), value as FifaRank);
}

const exactMap = rankingsJson as Record<string, FifaRank | string>;

/** 查询某队 FIFA 排名，找不到返回 null（不抛错） */
export function getFifaRank(teamName: string): FifaRank | null {
  // 1. 精确命中
  const exact = exactMap[teamName];
  if (exact && typeof exact !== "string") return exact;

  // 2. 归一化命中
  const norm = normalizeTeamName(teamName);
  const byNorm = normalizedMap.get(norm);
  if (byNorm) return byNorm;

  // 3. 别名命中
  const aliased = ALIASES[norm];
  if (aliased) {
    const byAlias = normalizedMap.get(aliased);
    if (byAlias) return byAlias;
  }

  // 4. 失败：记一条警告便于补表
  logWarn("predict", `FIFA 排名缺失：${teamName}（可在 fifa-rankings.json 补充）`);
  return null;
}
