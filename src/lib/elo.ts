import type { Match, EloBaseline } from "./types";

/**
 * 纯本地 Elo 评分系统，作为预测的统计基线。
 * 基于数据库里所有已结束比赛迭代计算每队评分，再由评分差推出胜平负基础概率。
 */

const INITIAL = 1500;
const K = 30;
const HOME_ADVANTAGE = 0; // 世界杯多为中立场，主场优势设 0

/** 由两队 Elo 算期望胜率（home 视角，含主场优势） */
function expectedHome(homeElo: number, awayElo: number): number {
  return 1 / (1 + 10 ** ((awayElo - homeElo - HOME_ADVANTAGE) / 400));
}

/**
 * 基于全部已结束比赛迭代计算 Elo 评分。
 * 仅取双方已确定、比分非空的 FINISHED 比赛，按时间升序更新。
 */
export function computeEloRatings(matches: Match[]): Map<string, number> {
  const ratings = new Map<string, number>();
  const get = (team: string) => ratings.get(team) ?? INITIAL;

  const finished = matches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.homeTeam !== "待定" &&
        m.awayTeam !== "待定" &&
        m.homeScore !== null &&
        m.awayScore !== null
    )
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  for (const m of finished) {
    const ra = get(m.homeTeam);
    const rb = get(m.awayTeam);
    const eHome = expectedHome(ra, rb);

    // 实际得分：胜 1 / 平 0.5 / 负 0
    const gd = (m.homeScore as number) - (m.awayScore as number);
    const sHome = gd > 0 ? 1 : gd === 0 ? 0.5 : 0;

    // 进球差加权：大比分变动更大
    const kEff = K * (1 + Math.log(Math.abs(gd) + 1));
    const delta = kEff * (sHome - eHome);

    ratings.set(m.homeTeam, ra + delta);
    ratings.set(m.awayTeam, rb - delta);
  }

  return ratings;
}

/** 由两队 Elo 算胜平负概率（含平局简单处理，三者和恒为 1） */
export function eloWinProbabilities(
  homeElo: number,
  awayElo: number
): { home: number; draw: number; away: number } {
  const e = expectedHome(homeElo, awayElo);
  const diff = Math.abs(homeElo - awayElo + HOME_ADVANTAGE);
  // 实力越接近，平局概率越高（最高约 0.30）
  const pDraw = 0.3 * Math.exp(-diff / 200);
  return {
    home: e * (1 - pDraw),
    draw: pDraw,
    away: (1 - e) * (1 - pDraw),
  };
}

/**
 * 为某场比赛算 Elo 统计基线。
 * finishedMatches 应为该场赛前已知的已结束比赛（避免泄漏未来赛果）。
 * 无历史的球队默认 1500，保证总能给出基线。
 */
export function getEloBaselineForMatch(
  match: Match,
  finishedMatches: Match[]
): EloBaseline {
  const ratings = computeEloRatings(finishedMatches);
  const homeElo = ratings.get(match.homeTeam) ?? INITIAL;
  const awayElo = ratings.get(match.awayTeam) ?? INITIAL;
  const probs = eloWinProbabilities(homeElo, awayElo);
  return {
    home: probs.home,
    draw: probs.draw,
    away: probs.away,
    homeElo: Math.round(homeElo),
    awayElo: Math.round(awayElo),
  };
}
